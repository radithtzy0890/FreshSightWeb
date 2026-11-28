"""Recalibrate the 6-class head with green and defective orange data (frozen backbone)."""

from __future__ import annotations

import json
import os
import random
import sys
from pathlib import Path

import keras
import numpy as np
import pandas as pd
from PIL import Image
from sklearn.metrics import accuracy_score, classification_report, f1_score

BASE = Path(__file__).resolve().parents[1]
ROOT = Path(
    os.environ.get(
        "FRESHSIGHT_DATASET_ROOT",
        BASE.parent / "dataset",
    )
)
MODEL_PATH = BASE / "models" / "mobilenetv3small_external_recalibrated.keras"
OUTPUT_PATH = BASE / "models" / "mobilenetv3small_external_green_v2.keras"
MANIFEST = ROOT / "reports_v2" / "02b_clean_split_manifest.csv"
ORANGE_ROOT = ROOT / "materials" / "dataset" / "orange_external" / "dataset"
AFQC_TRAIN = ROOT / "materials" / "dataset" / "AFQC_apple" / "Train"
AFQC_TEST = ROOT / "materials" / "dataset" / "AFQC_apple" / "Test"
BANANA_DIR = ROOT / "materials" / "dataset" / "Banana_overripe" / "over ripe"

CLASSES = ["fresh_apple", "rotten_apple", "fresh_banana", "rotten_banana", "fresh_orange", "rotten_orange"]
IMG_SIZE = 224
SEED = 42
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

rng = random.Random(SEED)
np.random.seed(SEED)


def image_paths(folder: Path) -> list[Path]:
    return sorted(p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS)


def fit_image(path: Path, letterbox: bool) -> np.ndarray:
    with Image.open(path) as source:
        image = source.convert("RGB")
        if letterbox:
            image.thumbnail((IMG_SIZE, IMG_SIZE), Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", (IMG_SIZE, IMG_SIZE), (255, 255, 255))
            canvas.paste(image, ((IMG_SIZE - image.width) // 2, (IMG_SIZE - image.height) // 2))
            image = canvas
        else:
            image = image.resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR)
        return np.asarray(image, dtype=np.float32) / 255.0


def extract(feature_model: keras.Model, paths: list[Path], letterbox: bool) -> np.ndarray:
    batches: list[np.ndarray] = []
    for start in range(0, len(paths), 256):
        chunk = paths[start:start + 256]
        images = np.stack([fit_image(path, letterbox) for path in chunk])
        batches.append(feature_model.predict(images, batch_size=32, verbose=0))
    return np.concatenate(batches, axis=0)


def sample_manifest(manifest: pd.DataFrame, split: str, per_class: int | None) -> pd.DataFrame:
    subset = manifest[manifest.split_clean == split]
    if per_class is None:
        return subset.reset_index(drop=True)
    parts = [
        group.sample(min(per_class, len(group)), random_state=SEED)
        for _, group in subset.groupby("label6")
    ]
    return pd.concat(parts).reset_index(drop=True)


def split_folder(folder: Path, label: int, cap: int, train_ratio: float = 0.8):
    paths = image_paths(folder)
    rng.shuffle(paths)
    paths = paths[:cap]
    cut = int(len(paths) * train_ratio)
    return paths[:cut], [label] * cut, paths[cut:], [label] * (len(paths) - cut)


def balanced_weights(labels: np.ndarray, power: float = 1.0) -> dict[int, float]:
    counts = np.bincount(labels, minlength=len(CLASSES))
    total = counts.sum()
    return {
        index: float((total / (len(CLASSES) * count)) ** power) if count else 0.0
        for index, count in enumerate(counts)
    }


def train_head(x_train, y_train, x_val, y_val, init: str, lr: float, power: float, existing_weights):
    head = keras.Sequential([keras.Input(shape=(576,)), keras.layers.Dense(len(CLASSES), activation="softmax")])
    if init == "existing":
        head.layers[0].set_weights(existing_weights)
    head.compile(
        optimizer=keras.optimizers.Adam(learning_rate=lr),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    head.fit(
        x_train,
        y_train,
        validation_data=(x_val, y_val),
        epochs=50,
        batch_size=128,
        class_weight=balanced_weights(y_train, power=power),
        callbacks=[
            keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=8, restore_best_weights=True),
            keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-5),
        ],
        verbose=0,
    )
    return head


def evaluate(head: keras.Model, name: str, folds: dict[str, tuple[np.ndarray, np.ndarray]]) -> dict:
    metrics = {}
    for fold, (x, y) in folds.items():
        predictions = head.predict(x, batch_size=256, verbose=0).argmax(axis=1)
        present_labels = [i for i in range(len(CLASSES)) if np.any(y == i)]
        metrics[fold] = {
            "accuracy": float(accuracy_score(y, predictions)),
            "macro_f1": float(
                f1_score(y, predictions, labels=present_labels, average="macro", zero_division=0)
            ),
            "counts": {CLASSES[i]: int((predictions == i).sum()) for i in range(len(CLASSES)) if (predictions == i).any()},
        }
    summary = " ".join(f"{fold}={value['accuracy']:.3f}" for fold, value in metrics.items())
    print(f"{name}: {summary}", flush=True)
    return {"name": name, "folds": metrics}


def main() -> None:
    manifest = pd.read_csv(MANIFEST)
    train_rows = sample_manifest(manifest, "train", 400)
    val_rows = sample_manifest(manifest, "val", 100)
    test_rows = sample_manifest(manifest, "test", None)

    green_paths = image_paths(ORANGE_ROOT / "green_orange")
    rng.shuffle(green_paths)
    green_train_paths = green_paths[:2400]
    green_test_paths = green_paths[2400:]

    orange_train: list[Path] = []
    orange_train_labels: list[int] = []
    orange_test_folds: dict[str, tuple[list[Path], list[int]]] = {}
    for folder, label, cap in [
        ("green_orange", 4, 2400),
        ("fresh_orange", 4, 1000),
        ("rotten_orange", 5, 1000),
        ("blackspotted_orange", 5, 1000),
        ("cankered_orange", 5, 1000),
    ]:
        if folder == "green_orange":
            train_paths = green_train_paths
            test_paths = green_test_paths
            train_labels = [4] * len(train_paths)
            test_labels = [4] * len(test_paths)
        else:
            train_paths, train_labels, test_paths, test_labels = split_folder(ORANGE_ROOT / folder, label, cap)
        orange_train += train_paths
        orange_train_labels += train_labels
        orange_test_folds[f"orange_{folder}"] = (test_paths, test_labels)

    external_train: list[Path] = []
    external_train_labels: list[int] = []
    external_test_folds: dict[str, tuple[list[Path], list[int]]] = {}
    for folder, label in [
        (AFQC_TRAIN / "apple_fresh", 0),
        (AFQC_TRAIN / "apple_rotten", 1),
        (BANANA_DIR, 3),
    ]:
        train_paths, train_labels, test_paths, test_labels = split_folder(folder, label, cap=1500)
        external_train += train_paths
        external_train_labels += train_labels
        external_test_folds[f"external_{folder.name}"] = (test_paths, test_labels)

    print("Loading feature extractor...", flush=True)
    model = keras.models.load_model(MODEL_PATH)
    feature_model = keras.Model(model.input, model.get_layer("gap").output)
    existing_weights = model.get_layer("prediksi").get_weights()

    print("Extracting original features...", flush=True)
    x_train = extract(feature_model, [ROOT / p for p in train_rows.crop_path], letterbox=False)
    y_train = train_rows.label_id.to_numpy()
    x_val = extract(feature_model, [ROOT / p for p in val_rows.crop_path], letterbox=False)
    y_val = val_rows.label_id.to_numpy()
    x_test = extract(feature_model, [ROOT / p for p in test_rows.crop_path], letterbox=False)
    y_test = test_rows.label_id.to_numpy()

    print("Extracting orange features...", flush=True)
    x_orange_train = extract(feature_model, orange_train, letterbox=True)
    y_orange_train = np.array(orange_train_labels, dtype=np.int64)
    orange_test = {
        fold: (extract(feature_model, paths, letterbox=True), np.array(labels, dtype=np.int64))
        for fold, (paths, labels) in orange_test_folds.items()
    }

    print("Extracting external apple/banana features...", flush=True)
    x_external_train = extract(feature_model, external_train, letterbox=True)
    y_external_train = np.array(external_train_labels, dtype=np.int64)
    external_test = {
        fold: (extract(feature_model, paths, letterbox=True), np.array(labels, dtype=np.int64))
        for fold, (paths, labels) in external_test_folds.items()
    }

    random_state = np.random.RandomState(SEED)
    orange_val_idx = random_state.choice(len(x_orange_train), 1200, replace=False)
    orange_train_mask = np.ones(len(x_orange_train), dtype=bool)
    orange_train_mask[orange_val_idx] = False
    external_val_idx = random_state.choice(len(x_external_train), 600, replace=False)
    external_train_mask = np.ones(len(x_external_train), dtype=bool)
    external_train_mask[external_val_idx] = False

    x_combined = np.concatenate([
        x_train,
        x_orange_train[orange_train_mask],
        x_external_train[external_train_mask],
    ], axis=0)
    y_combined = np.concatenate([
        y_train,
        y_orange_train[orange_train_mask],
        y_external_train[external_train_mask],
    ], axis=0)
    x_valid = np.concatenate([
        x_val,
        x_orange_train[orange_val_idx],
        x_external_train[external_val_idx],
    ], axis=0)
    y_valid = np.concatenate([
        y_val,
        y_orange_train[orange_val_idx],
        y_external_train[external_val_idx],
    ], axis=0)

    folds = {
        "original_test": (x_test, y_test),
        **orange_test,
        **external_test,
    }

    print("Evaluating baseline head...", flush=True)
    baseline = keras.Sequential([keras.Input(shape=(576,)), keras.layers.Dense(len(CLASSES), activation="softmax")])
    baseline.layers[0].set_weights(existing_weights)
    evaluate(baseline, "baseline", folds)

    configs = [
        {"name": "init_lr3e-4_p05", "init": "existing", "lr": 3e-4, "power": 0.5},
        {"name": "init_lr1e-4_p05", "init": "existing", "lr": 1e-4, "power": 0.5},
        {"name": "scratch_lr1e-3_p05", "init": "scratch", "lr": 1e-3, "power": 0.5},
        {"name": "init_lr3e-4_p10", "init": "existing", "lr": 3e-4, "power": 1.0},
    ]

    best = None
    for config in configs:
        head = train_head(
            x_combined,
            y_combined,
            x_valid,
            y_valid,
            init=config["init"],
            lr=config["lr"],
            power=config["power"],
            existing_weights=existing_weights,
        )
        # Select best configuration purely on the validation set (prevent test-set leakage)
        val_predictions = head.predict(x_valid, batch_size=256, verbose=0).argmax(axis=1)
        val_accuracy = float(accuracy_score(y_valid, val_predictions))
        val_macro_f1 = float(f1_score(y_valid, val_predictions, average="macro", zero_division=0))
        score = 0.5 * val_accuracy + 0.5 * val_macro_f1
        print(
            f"Validation {config['name']}: val_acc={val_accuracy:.4f} val_macro_f1={val_macro_f1:.4f} score={score:.4f}",
            flush=True,
        )
        if best is None or score > best[0]:
            best = (score, config, head, val_accuracy, val_macro_f1)

    if best is None:
        print("No configuration could be trained", flush=True)
        return

    _, best_config, head, val_accuracy, val_macro_f1 = best
    metrics = evaluate(head, best_config["name"], folds)
    metrics["config"] = best_config
    metrics["validation"] = {
        "accuracy": val_accuracy,
        "macro_f1": val_macro_f1,
    }
    print(f"Selected: {metrics['name']}", flush=True)
    model.get_layer("prediksi").set_weights(head.layers[0].get_weights())
    model.save(OUTPUT_PATH)
    (BASE / "tools" / "orange_recalibration_metrics.json").write_text(
        json.dumps(metrics, indent=2, default=float), encoding="utf-8"
    )
    print(f"Saved {OUTPUT_PATH}", flush=True)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()
