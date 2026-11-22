"""Comprehensive evaluation of the active FreshSight model and API preprocessing."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import keras
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score

BASE = Path(__file__).resolve().parents[1]
WORKSPACE = BASE.parent
sys.path.insert(0, str(BASE))

import app as backend  # noqa: E402

spec = importlib.util.spec_from_file_location("recal", BASE / "tools" / "recalibrate_orange_head.py")
recal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recal)

CLASSES = backend.CLASSES
CROP_RATIO = 0.25
model = keras.models.load_model(backend.MODEL_PATH, compile=False)


def load_image(item):
    if isinstance(item, Image.Image):
        return item.convert("RGB")
    with Image.open(item) as image:
        return image.convert("RGB")


def prepare(image: Image.Image, mode: str):
    crops = backend.find_fruit_crops(image) if mode == "crop" else []
    if crops and crops[0][1] <= CROP_RATIO:
        analysis = crops[0][0].resize((224, 224), Image.Resampling.BILINEAR)
        return np.asarray(analysis, dtype=np.float32) / 255.0, True
    analysis = image.resize((224, 224), Image.Resampling.BILINEAR)
    return np.asarray(analysis, dtype=np.float32) / 255.0, False


def predict_items(items, mode: str, chunk_size: int = 64):
    labels: list[int] = []
    predictions: list[int] = []
    used_crop = 0
    errors = 0
    for start in range(0, len(items), chunk_size):
        batch: list[np.ndarray] = []
        batch_labels: list[int] = []
        for item, label in items[start:start + chunk_size]:
            try:
                image = load_image(item)
            except Exception:
                errors += 1
                continue
            array, used = prepare(image, mode)
            batch.append(array)
            batch_labels.append(int(label))
            used_crop += int(used)
        if not batch:
            continue
        probabilities = model.predict(np.stack(batch), batch_size=32, verbose=0)
        labels.extend(batch_labels)
        predictions.extend(probabilities.argmax(axis=1).tolist())
    return np.array(labels), np.array(predictions), used_crop, errors


def summarize(name: str, labels, predictions, used_crop: int, errors: int):
    if len(labels) == 0:
        return None
    report = classification_report(
        labels,
        predictions,
        labels=list(range(len(CLASSES))),
        target_names=CLASSES,
        output_dict=True,
        zero_division=0,
    )
    present_labels = [index for index in range(len(CLASSES)) if np.any(labels == index)]
    summary = {
        "n": int(len(labels)),
        "accuracy": float(accuracy_score(labels, predictions)),
        "macro_f1": float(
            f1_score(
                labels,
                predictions,
                labels=present_labels,
                average="macro",
                zero_division=0,
            )
        ),
        "macro_f1_all6": float(
            f1_score(
                labels,
                predictions,
                labels=list(range(len(CLASSES))),
                average="macro",
                zero_division=0,
            )
        ),
        "crop_used": int(used_crop),
        "errors": int(errors),
        "per_class": {
            name: {
                "precision": float(report[name]["precision"]),
                "recall": float(report[name]["recall"]),
                "f1": float(report[name]["f1-score"]),
                "support": int(report[name]["support"]),
            }
            for name in CLASSES
        },
    }
    print(
        f"{name:48s} n={summary['n']:4d} acc={summary['accuracy']:.4f} "
        f"f1={summary['macro_f1']:.4f} crop={used_crop} errors={errors}",
        flush=True,
    )
    return summary


def evaluate(name: str, items, modes=("full", "crop")):
    result = {}
    for mode in modes:
        labels, predictions, used_crop, errors = predict_items(items, mode)
        summary = summarize(f"{name} [{mode}]", labels, predictions, used_crop, errors)
        result[mode] = {
            "summary": summary,
            "confusion_matrix": confusion_matrix(
                labels, predictions, labels=list(range(len(CLASSES)))
            ).tolist() if len(labels) else [],
        }
    return result


def item_results(items):
    rows = []
    for item, expected in items:
        name = getattr(item, "filename", None) or getattr(item, "name", None) or "synthetic"
        row = {"item": Path(str(name)).name, "expected": CLASSES[int(expected)]}
        for mode in ("full", "crop"):
            try:
                image = load_image(item)
                array, used = prepare(image, mode)
                probabilities = model.predict(array[None], verbose=0)[0]
                row[mode] = {
                    "predicted": CLASSES[int(probabilities.argmax())],
                    "confidence": float(probabilities.max()),
                    "crop_used": bool(used),
                }
            except Exception as exc:
                row[mode] = {"error": str(exc)}
        rows.append(row)
        print(
            f"  {row['item'][:38]:38s} expected={row['expected']:14s} "
            f"full={row['full'].get('predicted')} crop={row['crop'].get('predicted')}",
            flush=True,
        )
    return rows


def split_holdouts():
    green_paths = recal.image_paths(recal.ORANGE_ROOT / "green_orange")
    recal.rng.shuffle(green_paths)
    green_test = [(path, 4) for path in green_paths[2400:]]

    orange = {}
    for folder, label, cap in [
        ("fresh_orange", 4, 1000),
        ("rotten_orange", 5, 1000),
        ("blackspotted_orange", 5, 1000),
        ("cankered_orange", 5, 1000),
    ]:
        _, _, test_paths, test_labels = recal.split_folder(recal.ORANGE_ROOT / folder, label, cap)
        orange[folder] = list(zip(test_paths, test_labels))

    external = {}
    for folder, label in [
        (recal.AFQC_TRAIN / "apple_fresh", 0),
        (recal.AFQC_TRAIN / "apple_rotten", 1),
        (recal.BANANA_DIR, 3),
    ]:
        _, _, test_paths, test_labels = recal.split_folder(folder, label, 1500)
        external[folder.name] = list(zip(test_paths, test_labels))

    return green_test, orange, external


def composite(fruit_path: Path, size=(180, 180)):
    canvas = Image.new("RGB", (800, 600), (80, 140, 60))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 360, 800, 600], fill=(160, 160, 150))
    with Image.open(fruit_path) as source:
        fruit = source.convert("RGB").resize(size, Image.Resampling.BILINEAR)
    canvas.paste(fruit, (310, 190))
    return canvas


def main() -> None:
    manifest = pd.read_csv(recal.MANIFEST)
    original_test = [
        (recal.ROOT / row.crop_path, int(row.label_id))
        for row in manifest[manifest.split_clean == "test"].itertuples()
    ]
    train_sample_rows = (
        manifest[manifest.split_clean == "train"]
        .groupby("label6")
        .sample(n=50, random_state=42)
    )
    train_sample = [
        (recal.ROOT / row.crop_path, int(row.label_id))
        for row in train_sample_rows.itertuples()
    ]

    afqc_test = []
    for folder, label in [
        (recal.AFQC_TEST / "apple_fresh", 0),
        (recal.AFQC_TEST / "apple_rotten", 1),
    ]:
        afqc_test += [(path, label) for path in recal.image_paths(folder)]

    external_test = []
    external_dir = recal.ROOT / "data" / "external_test"
    for path in sorted(external_dir.iterdir()):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        label = path.name.split("__")[0]
        if label in CLASSES:
            external_test.append((path, CLASSES.index(label)))

    green_test, orange_holdouts, external_holdouts = split_holdouts()

    downloads = Path(r"C:\Users\anand\Downloads")
    user_items = []
    for name, label in [
        ("apel fresh (1).jpg", 0),
        ("apel fresh (2).jpg", 0),
        ("apel busuk.jpg", 1),
        ("apel busuk (2).jpg", 1),
        ("jeruk fresh.jpeg", 4),
        ("jeruk fresh.webp", 4),
    ]:
        path = downloads / name
        if path.exists():
            user_items.append((path, label))

    demo_dir = WORKSPACE / "apps" / "web" / "public" / "fruit"
    demo_items = [
        (demo_dir / "apple_fresh.jpg", 0),
        (demo_dir / "apple_rotten.jpg", 1),
        (demo_dir / "banana_fresh.jpg", 2),
        (demo_dir / "banana_rotten.jpg", 3),
        (demo_dir / "orange_fresh.jpg", 4),
        (demo_dir / "orange_rotten.jpg", 5),
    ]

    synthetic_items = [
        (composite(demo_dir / "apple_fresh.jpg"), 0, "apple fresh, busy background"),
        (composite(demo_dir / "apple_rotten.jpg"), 1, "apple rotten, busy background"),
        (composite(demo_dir / "banana_fresh.jpg"), 2, "banana fresh, busy background"),
        (composite(demo_dir / "orange_fresh.jpg"), 4, "orange fresh, busy background"),
    ]

    results = {}
    print("=== DATASET EVALUATIONS ===", flush=True)
    results["original_test"] = evaluate("original_test (918)", original_test)
    results["train_sample"] = evaluate("original_train_sample (300)", train_sample, modes=("full",))
    results["afqc_test"] = evaluate("AFQC test (232)", afqc_test)
    results["external_test_16"] = evaluate("data/external_test (16)", external_test)
    results["green_holdout"] = evaluate("green_orange holdout (600)", green_test)
    for folder, items in orange_holdouts.items():
        results[f"orange_{folder}"] = evaluate(f"orange_{folder} holdout ({len(items)})", items)
    for folder, items in external_holdouts.items():
        results[f"external_{folder}"] = evaluate(f"external_{folder} holdout ({len(items)})", items)

    print("\n=== ITEM CASES ===", flush=True)
    results["user_items"] = item_results(user_items)
    results["demo_assets"] = item_results(demo_items)
    results["synthetic_background"] = item_results([(image, label) for image, label, _ in synthetic_items])

    print("\n=== TRAINING HISTORY ===", flush=True)
    history_summary = {}
    for name, filename in [("stage1", "04_history_stage1.csv"), ("stage2", "04_history_stage2.csv"), ("external_finetune", "10_external_finetune_history.csv")]:
        path = recal.ROOT / "reports_v2" / filename
        if not path.exists():
            continue
        history = pd.read_csv(path)
        last = history.iloc[-1].to_dict()
        history_summary[name] = {
            "final_train_accuracy": float(last.get("accuracy", float("nan"))),
            "final_val_accuracy": float(last.get("val_accuracy", float("nan"))),
        }
        print(f"{name}: train={history_summary[name]['final_train_accuracy']:.4f} "
              f"val={history_summary[name]['final_val_accuracy']:.4f}", flush=True)
    results["training_history"] = history_summary

    recal_metrics_path = BASE / "tools" / "orange_recalibration_metrics.json"
    if recal_metrics_path.exists():
        recal_metrics = json.loads(recal_metrics_path.read_text(encoding="utf-8"))
        results["head_recalibration"] = recal_metrics
        print(
            f"head recalibration: original={recal_metrics['folds']['original_test']['accuracy']:.4f} "
            f"green={recal_metrics['folds']['orange_green_orange']['accuracy']:.4f}",
            flush=True,
        )

    output_path = BASE / "tools" / "evaluation_results.json"
    output_path.write_text(json.dumps(results, indent=2, default=float), encoding="utf-8")
    print(f"\nSaved {output_path}", flush=True)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()
