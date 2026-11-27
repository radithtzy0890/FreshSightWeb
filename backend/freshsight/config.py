"""Central configuration, paths, calibration thresholds, and constants."""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = Path(
    os.environ.get(
        "MODEL_PATH",
        BASE_DIR / "models" / "mobilenetv3small_external_green_v2.keras",
    )
)

IMG_SIZE = 224
CLIP_IMG_SIZE = 256
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", 10 * 1024 * 1024))
RATE_LIMIT_PER_MINUTE = int(os.environ.get("RATE_LIMIT_PER_MINUTE", 60))
MAX_IMAGE_PIXELS = 25_000_000

CLASSES = [
    "fresh_apple",
    "rotten_apple",
    "fresh_banana",
    "rotten_banana",
    "fresh_orange",
    "rotten_orange",
]
FRUIT_NAMES = {"apple": "Apel", "banana": "Pisang", "orange": "Jeruk"}

CALIBRATION = {
    "apple": {
        "defek_fresh": 0.12282,
        "thr_defek": 0.14104,
        "tekstur_fresh": 723.02,
        "thr_tekstur": 1719.10,
        "thr_bercak": 7.71,
    },
    "banana": {
        "defek_fresh": 0.13896,
        "thr_defek": 0.21439,
        "tekstur_fresh": 810.38,
        "thr_tekstur": 2643.80,
        "thr_bercak": 7.65,
    },
    "orange": {
        "defek_fresh": 0.14273,
        "thr_defek": 0.15442,
        "tekstur_fresh": 392.86,
        "thr_tekstur": 1938.12,
        "thr_bercak": 6.71,
    },
}

TTA_THRESHOLD = 0.80
CONFIDENCE_RAGU_THRESHOLD = 0.60

OOD_REF_PATH = Path(
    os.environ.get("OOD_REF_PATH", BASE_DIR / "models" / "ood_reference_green_v2.npz")
)
CLIP_VISION_PATH = Path(
    os.environ.get("CLIP_VISION_PATH", BASE_DIR / "models" / "mobileclip2_s0_vision.onnx")
)
CLIP_PROMPTS_PATH = Path(
    os.environ.get("CLIP_PROMPTS_PATH", BASE_DIR / "models" / "mobileclip2_fruit_prompts.npz")
)

# Dual-Gate OOD thresholds (MobileCLIP2-S0 zero-shot margin + 576-d embedding distance)
OOD_CLIP_HARD_MARGIN = -0.020
OOD_CLIP_BORDERLINE_MARGIN = 0.012
OOD_CLIP_FAR_OVERRIDE_MARGIN = 0.030
OOD_MAHAL_BORDERLINE = 18.8
OOD_COS_BORDERLINE = 0.62
OOD_MAHAL_FAR = 34.0
OOD_COS_FAR = 0.45
CLIP_APPLE_OVER_ORANGE_MARGIN = 0.030

CORS_ALLOW_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://freshsightweb.test",
]
CORS_ALLOW_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|freshsightweb\.test)(:\d+)?$"
