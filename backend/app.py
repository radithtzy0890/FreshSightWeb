"""FreshSight inference API entrypoint (FastAPI + MobileNetV3Small + Grad-CAM + MobileCLIP2-S0 OOD)."""

from __future__ import annotations

import io
from contextlib import asynccontextmanager

# Import package first so onnxruntime initializes before TensorFlow/Keras on Windows
import freshsight  # noqa: F401
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError

from freshsight.config import (
    CALIBRATION,
    CLASSES,
    CONFIDENCE_RAGU_THRESHOLD,
    CORS_ALLOW_ORIGINS,
    CORS_ALLOW_ORIGIN_REGEX,
    FRUIT_NAMES,
    IMG_SIZE,
    MAX_IMAGE_PIXELS,
    MAX_UPLOAD_BYTES,
    MODEL_PATH,
    TTA_THRESHOLD,
)
from freshsight.explain import (
    build_explanation,
    calibrate_low_confidence_with_defects,
    defect_overlay,
    format_number,
    human_region,
    overlay_heatmap,
    png_base64,
)
from freshsight.models import (
    build_grad_model,
    inference_lock,
    load_resources,
    make_inference_fns,
    run_gradcam,
    state,
    tta_probabilities,
)
from freshsight.ood import evaluate_dual_ood, preprocess_clip_image
from freshsight.pipeline import run_inference
from freshsight.rate_limit import check_rate_limit
from freshsight.vision import (
    analyze_defects,
    assess_image_quality,
    box_iou,
    defect_mask,
    detect_ood_and_candidates,
    find_fruit_crops,
    fruit_candidate_count,
    fruit_mask,
    region_label,
    suppress_fruit_sticker,
)

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

# Backward-compatible alias for scripts/tests calling app._sync_infer directly
_sync_infer = run_inference

__all__ = [
    "app",
    "state",
    "inference_lock",
    "CLASSES",
    "FRUIT_NAMES",
    "CALIBRATION",
    "IMG_SIZE",
    "MODEL_PATH",
    "TTA_THRESHOLD",
    "CONFIDENCE_RAGU_THRESHOLD",
    "load_resources",
    "run_inference",
    "_sync_infer",
    "run_gradcam",
    "tta_probabilities",
    "build_grad_model",
    "make_inference_fns",
    "preprocess_clip_image",
    "evaluate_dual_ood",
    "detect_ood_and_candidates",
    "fruit_candidate_count",
    "box_iou",
    "find_fruit_crops",
    "fruit_mask",
    "suppress_fruit_sticker",
    "defect_mask",
    "region_label",
    "analyze_defects",
    "assess_image_quality",
    "human_region",
    "format_number",
    "overlay_heatmap",
    "defect_overlay",
    "png_base64",
    "calibrate_low_confidence_with_defects",
    "build_explanation",
    "check_rate_limit",
]


@asynccontextmanager
async def lifespan(_: FastAPI):
    load_resources()
    yield
    state.clear()


app = FastAPI(title="FreshSight API", version="1.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path == "/v1/predict" and request.method.upper() == "POST":
        client_ip = request.client.host if request.client else "local"
        check_rate_limit(client_ip)
    return await call_next(request)


@app.get("/v1/health")
def health() -> dict[str, object]:
    return {
        "status": "ok" if "model" in state else "loading",
        "model": {
            "name": state.get("model_name"),
            "file": state.get("model_file"),
            "input": f"{IMG_SIZE}x{IMG_SIZE}x3",
            "classes": CLASSES,
        },
    }


@app.post("/v1/predict")
async def predict(image: UploadFile = File(...)) -> dict[str, object]:
    if "model" not in state:
        raise HTTPException(status_code=503, detail="Model belum siap")

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Field image harus berupa berkas gambar")

    payload = await image.read(MAX_UPLOAD_BYTES + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="Berkas gambar kosong")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Ukuran berkas gambar melebihi batas maksimum {MAX_UPLOAD_BYTES // (1024 * 1024)} MB",
        )

    try:
        raw_image = Image.open(io.BytesIO(payload))
        pil_image = ImageOps.exif_transpose(raw_image).convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=400, detail="Gambar tidak dapat dibaca atau rusak") from exc

    return await run_in_threadpool(run_inference, pil_image)
