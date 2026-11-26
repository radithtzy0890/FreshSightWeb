"""End-to-end synchronous inference pipeline combining vision, CNN/Grad-CAM, OOD, and explanations."""

from __future__ import annotations

import time

import cv2
import numpy as np
from PIL import Image

from .config import CLASSES, CONFIDENCE_RAGU_THRESHOLD, IMG_SIZE, TTA_THRESHOLD
from .explain import (
    build_explanation,
    calibrate_low_confidence_with_defects,
    defect_overlay,
    human_region,
    overlay_heatmap,
    png_base64,
)
from .models import inference_lock, run_gradcam, state, tta_probabilities
from .ood import evaluate_dual_ood
from .vision import (
    analyze_defects,
    detect_ood_and_candidates,
    find_fruit_crops,
    region_label,
    suppress_fruit_sticker,
)


def run_inference(pil_image: Image.Image) -> dict[str, object]:
    resized = pil_image.resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR)
    full_rgb01 = np.asarray(resized, dtype=np.float32) / 255.0
    full_bgr = cv2.cvtColor(np.asarray(resized), cv2.COLOR_RGB2BGR)

    is_full_ood, full_fruit_count, _ = detect_ood_and_candidates(full_bgr)

    crops = find_fruit_crops(pil_image)
    crop = crops[0][0] if crops and crops[0][1] <= 0.25 else None
    used_crop = crop is not None

    started = time.perf_counter()
    with inference_lock:
        if crop is not None:
            analysis_image = crop.resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR)
            analysis_rgb01 = np.asarray(analysis_image, dtype=np.float32) / 255.0
            analysis_bgr = cv2.cvtColor(np.asarray(analysis_image), cv2.COLOR_RGB2BGR)
        else:
            analysis_rgb01 = full_rgb01
            analysis_bgr = full_bgr

        # Suppress compact non-biological supermarket PLU stickers so they aren't mistaken for rot
        cleaned_bgr, sticker_removed = suppress_fruit_sticker(analysis_bgr)
        if sticker_removed:
            analysis_bgr = cleaned_bgr
            analysis_rgb01 = cv2.cvtColor(cleaned_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

        # Single forward + gradient + GAP embedding pass via grad_model
        heat, class_idx, base_probs, gap_feat = run_gradcam(analysis_rgb01, class_idx=None)
        probabilities = base_probs
        used_tta = False

        if not used_crop and float(base_probs.max()) < TTA_THRESHOLD:
            tta_input = (
                Image.fromarray(cv2.cvtColor(analysis_bgr, cv2.COLOR_BGR2RGB))
                if sticker_removed
                else pil_image
            )
            tta_probs = tta_probabilities(tta_input)
            tta_peak = float(tta_probs.max())
            base_peak = float(base_probs.max())
            if tta_peak > base_peak and (tta_peak - base_peak >= 0.12 or tta_peak >= 0.80):
                probabilities = tta_probs
                used_tta = True

        features = analyze_defects(analysis_bgr)
        features["fruit_count"] = full_fruit_count
        color_ood = bool(is_full_ood and features.get("is_ood", False))
        is_ood, ood_reason, ood_metrics = evaluate_dual_ood(
            pil_image, gap_feat, probabilities, color_ood, state=state
        )
        features["is_ood"] = is_ood
        if is_ood:
            features["fruit_count"] = 0

        if not is_ood:
            calibrated = calibrate_low_confidence_with_defects(probabilities, features)
            if not np.allclose(calibrated, probabilities):
                probabilities = calibrated

        new_class_idx = int(np.argmax(probabilities))
        if new_class_idx != class_idx:
            class_idx = new_class_idx
            heat, _, _, _ = run_gradcam(analysis_rgb01, class_idx=class_idx)

    inference_ms = round((time.perf_counter() - started) * 1000, 2)

    label = CLASSES[class_idx]
    confidence = 0.0 if is_ood else float(probabilities[class_idx])
    fruit = label.split("_")[1]
    is_rotten = not label.startswith("fresh")

    if is_ood:
        verdict = "tidak_terdeteksi"
    elif full_fruit_count > 1 or confidence < CONFIDENCE_RAGU_THRESHOLD:
        verdict = "ragu"
    else:
        verdict = "busuk" if is_rotten else "segar"

    ys, xs = np.indices(heat.shape)
    total_heat = float(heat.sum()) + 1e-8
    focus = region_label(
        float((xs * heat).sum() / total_heat),
        float((ys * heat).sum() / total_heat),
        heat.shape[1],
        heat.shape[0],
    )

    explanation = build_explanation(
        label,
        confidence,
        fruit,
        features,
        human_region(focus),
        is_ood=is_ood,
        ood_reason=ood_reason,
    )
    gradcam = overlay_heatmap(analysis_rgb01, heat)
    preview = defect_overlay(analysis_rgb01, features["defect"])

    return {
        "label": "tidak_terdeteksi" if is_ood else label,
        "fruit": fruit,
        "freshness": "unknown" if is_ood else ("fresh" if label.startswith("fresh") else "rotten"),
        "verdict": verdict,
        "is_ood": is_ood,
        "ood_reason": ood_reason,
        "ood_metrics": ood_metrics,
        "confidence": confidence,
        "probs": {name: (0.0 if is_ood else float(probabilities[index])) for index, name in enumerate(CLASSES)},
        "features": {
            "is_ood": is_ood,
            "fruit_count": int(features["fruit_count"]),
            "rasio_defek": float(features["rasio_defek"]),
            "jumlah_bercak": int(features["jumlah_bercak"]),
            "bercak_terbesar": float(features["bercak_terbesar"]),
            "lokasi_bercak": str(features["lokasi_bercak"]),
            "fokus_gradcam": focus,
            "jarak_warna": round(float(features["jarak_warna"]), 2),
            "tekstur": round(float(features["tekstur"]), 2),
        },
        "images": {
            "gradcam_overlay": png_base64(gradcam),
            "defect_mask": png_base64(preview),
        },
        "explanation": explanation,
        "inference_ms": inference_ms,
        "tta": used_tta,
        "crop_used": used_crop,
        "model": {
            "name": state.get("model_name"),
            "file": state.get("model_file"),
        },
    }
