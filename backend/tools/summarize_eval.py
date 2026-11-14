import json
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
results = json.loads((BASE / "tools" / "evaluation_results.json").read_text(encoding="utf-8"))

print("=== DATASET SUMMARY ===")
for key, value in results.items():
    if isinstance(value, dict) and "full" in value and "crop" in value:
        full = value["full"]["summary"]
        crop = value["crop"]["summary"]
        if full and crop:
            print(
                f"{key:32s} n={full['n']:4d} | full={full['accuracy']:.4f} "
                f"| crop={crop['accuracy']:.4f} | crop_used={crop['crop_used']}"
            )
        elif full:
            print(f"{key:32s} n={full['n']:4d} | full={full['accuracy']:.4f}")
        elif crop:
            print(f"{key:32s} n={crop['n']:4d} | crop={crop['accuracy']:.4f}")

print("\n=== PER-CLASS RECALL (original test) ===")
for mode in ("full", "crop"):
    summary = results["original_test"][mode]["summary"]
    print(mode, {label: round(values["recall"], 4) for label, values in summary["per_class"].items()})

print("\n=== PER-CLASS RECALL (AFQC test) ===")
for mode in ("full", "crop"):
    summary = results["afqc_test"][mode]["summary"]
    print(mode, {label: round(values["recall"], 4) for label, values in summary["per_class"].items()})

for key in ("user_items", "demo_assets", "synthetic_background"):
    print(f"\n=== {key.upper()} ===")
    for row in results.get(key, []):
        print(
            f"{row['item'][:36]:36s} expected={row['expected']:14s} "
            f"full={row.get('full', {}).get('predicted')} "
            f"crop={row.get('crop', {}).get('predicted')}"
        )

print("\n=== TRAINING HISTORY ===")
for name, value in results.get("training_history", {}).items():
    print(name, value)
head = results.get("head_recalibration", {})
if head:
    print(
        "head recalibration:",
        {
            fold: round(data["accuracy"], 4)
            for fold, data in head.get("folds", {}).items()
        },
    )
