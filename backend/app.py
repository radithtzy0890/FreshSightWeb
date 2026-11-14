"""FreshSight inference API: MobileNetV3Small + Grad-CAM + defect analysis."""

from __future__ import annotations

import base64
import io
import os
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import keras
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(
    os.environ.get(
        "MODEL_PATH",
        BASE_DIR / "models" / "mobilenetv3small_external_green_v2.keras",
    )
)

IMG_SIZE = 224
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
        "defek_fresh": 0.12769,
        "thr_defek": 0.14797,
        "tekstur_fresh": 689.67,
        "thr_tekstur": 1680.13,
        "thr_bercak": 7.75,
    },
    "banana": {
        "defek_fresh": 0.12959,
        "thr_defek": 0.20812,
        "tekstur_fresh": 921.54,
        "thr_tekstur": 3206.88,
        "thr_bercak": 8.33,
    },
    "orange": {
        "defek_fresh": 0.15118,
        "thr_defek": 0.15602,
        "tekstur_fresh": 415.75,
        "thr_tekstur": 1893.37,
        "thr_bercak": 6.62,
    },
}

TTA_THRESHOLD = 0.8

state: dict[str, object] = {}
inference_lock = threading.Lock()


def build_grad_model(model: keras.Model) -> keras.Model:
    backbone = next(layer for layer in model.layers if isinstance(layer, keras.Model))
    backbone_input = keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3), name="backbone_input")
    features = backbone(backbone_input, training=False)
    if isinstance(features, (list, tuple)):
        features = features[0]
    backbone_conv = keras.Model(backbone_input, features, name="backbone_feature")

    inputs = keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3), name="gradcam_input")
    x = inputs
    if any(layer.name == "prep" for layer in model.layers):
        x = model.get_layer("prep")(x)
    feat = backbone_conv(x)
    if isinstance(feat, (list, tuple)):
        feat = feat[0]
    y = model.get_layer("gap")(feat)
    if isinstance(y, (list, tuple)):
        y = y[0]
    outputs = model.get_layer("prediksi")(y)
    return keras.Model(inputs, [feat, outputs], name="gradcam_model")


def run_gradcam(rgb01: np.ndarray, class_idx: int | None = None) -> tuple[np.ndarray, int, np.ndarray]:
    tensor = tf.convert_to_tensor(rgb01[None], dtype=tf.float32)
    with tf.GradientTape() as tape:
        conv, preds = state["grad_model"](tensor, training=False)
        if isinstance(conv, (list, tuple)):
            conv = conv[0]
        if isinstance(preds, (list, tuple)):
            preds = preds[0]
        if class_idx is None:
            class_idx = int(tf.argmax(preds[0]))
        score = preds[:, class_idx]
    grads = tape.gradient(score, conv)
    if grads is None:
        heat = np.zeros(conv.shape[1:3], dtype=np.float32)
    else:
        pooled = tf.reduce_mean(grads, axis=(0, 1, 2))
        heat = tf.reduce_sum(conv[0] * pooled, axis=-1)
        heat = tf.maximum(heat, 0.0)
        heat = heat / (tf.reduce_max(heat) + 1e-8)
        heat = heat.numpy()
    return heat, class_idx, np.asarray(preds[0], dtype=np.float32)


def fruit_candidate_count(bgr: np.ndarray) -> int:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue, saturation, value = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    brown = (hue >= 5) & (hue <= 25) & (saturation > 50) & (value < 190)
    raw = ((saturation > 45) & (value > 35) & ~brown).astype(np.uint8) * 255
    raw = cv2.morphologyEx(raw, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(raw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    image_area = float(bgr.shape[0] * bgr.shape[1])
    count = 0
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 0.015 * image_area:
            continue
        x, y, width, height = cv2.boundingRect(contour)
        if x <= 1 or y <= 1 or x + width >= bgr.shape[1] - 1 or y + height >= bgr.shape[0] - 1:
            continue
        aspect = width / max(height, 1)
        perimeter = cv2.arcLength(contour, True)
        circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0.0
        hull_area = cv2.contourArea(cv2.convexHull(contour))
        solidity = area / hull_area if hull_area > 0 else 0.0
        if 0.45 <= aspect <= 2.2 and circularity >= 0.35 and solidity >= 0.85:
            count += 1
    return count


def box_iou(first: tuple[int, int, int, int], second: tuple[int, int, int, int]) -> float:
    ax1, ay1, ax2, ay2 = first
    bx1, by1, bx2, by2 = second
    inter_width = max(0, min(ax2, bx2) - max(ax1, bx1))
    inter_height = max(0, min(ay2, by2) - max(ay1, by1))
    intersection = inter_width * inter_height
    union = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - intersection
    return intersection / union if union > 0 else 0.0


def find_fruit_crops(image: Image.Image, max_crops: int = 3) -> list[tuple[Image.Image, float]]:
    width, height = image.size
    scale = min(1.0, 448.0 / max(width, height))
    detection_width = max(1, int(width * scale))
    detection_height = max(1, int(height * scale))
    detection = image.convert("RGB").resize(
        (detection_width, detection_height), Image.Resampling.BILINEAR
    )
    bgr = cv2.cvtColor(np.asarray(detection), cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue, saturation, value = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    masks = [
        (((hue <= 10) | (hue >= 160)) & (saturation > 70) & (value > 40), 0.012, 0.45, 2.2, 0.40, 0.85),
        ((hue >= 35) & (hue <= 95) & (saturation > 60) & (value > 40), 0.012, 0.45, 2.2, 0.40, 0.85),
    ]

    image_area = float(detection_width * detection_height)
    candidates: list[tuple[float, tuple[int, int, int, int]]] = []
    for mask, min_area_ratio, min_aspect, max_aspect, min_circularity, min_solidity in masks:
        binary = (mask.astype(np.uint8) * 255)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=1)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area_ratio * image_area:
                continue
            x, y, box_width, box_height = cv2.boundingRect(contour)
            if x <= 1 or y <= 1 or x + box_width >= detection_width - 1 or y + box_height >= detection_height - 1:
                continue
            aspect = box_width / max(box_height, 1)
            if not min_aspect <= aspect <= max_aspect:
                continue
            perimeter = cv2.arcLength(contour, True)
            circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0.0
            hull_area = cv2.contourArea(cv2.convexHull(contour))
            solidity = area / hull_area if hull_area > 0 else 0.0
            if min_circularity <= 0.30:
                if circularity < min_circularity or circularity > 0.72:
                    continue
            elif circularity < min_circularity:
                continue
            if solidity < min_solidity:
                continue
            box = (
                int(x / scale),
                int(y / scale),
                int((x + box_width) / scale),
                int((y + box_height) / scale),
            )
            candidates.append((area, box))

    candidates.sort(key=lambda item: item[0], reverse=True)
    boxes: list[tuple[int, int, int, int]] = []
    for _, box in candidates:
        if any(box_iou(box, existing) > 0.35 for existing in boxes):
            continue
        boxes.append(box)
        if len(boxes) >= max_crops:
            break

    crops: list[tuple[Image.Image, float]] = []
    for x1, y1, x2, y2 in boxes:
        box_width = x2 - x1
        box_height = y2 - y1
        padding_x = int(box_width * 0.12)
        padding_y = int(box_height * 0.12)
        left = max(0, x1 - padding_x)
        top = max(0, y1 - padding_y)
        right = min(width, x2 + padding_x)
        bottom = min(height, y2 + padding_y)
        if right - left < 20 or bottom - top < 20:
            continue
        area_ratio = ((right - left) * (bottom - top)) / float(width * height)
        crops.append((image.crop((left, top, right, bottom)), area_ratio))
    return crops


def fruit_mask(bgr: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    saturation, value = hsv[..., 1], hsv[..., 2]
    mask = ((saturation > 45) & (value > 35)).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8), iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8), iterations=1)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        largest = max(contours, key=cv2.contourArea)
        mask = np.zeros_like(mask)
        cv2.drawContours(mask, [largest], -1, 255, -1)
    if mask.mean() < 20:
        mask = np.zeros_like(mask)
        cv2.ellipse(mask, (112, 112), (92, 92), 0, 0, 360, 255, -1)
    return mask > 0


def defect_mask(bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue = hsv[..., 0].astype(float)
    saturation = hsv[..., 1].astype(float)
    value = hsv[..., 2].astype(float)
    median_v = np.median(value[mask]) if mask.any() else 128.0
    green = (hue >= 25) & (hue <= 100) & (saturation > 50) & (value > 40)
    dark = ((value < 0.55 * median_v) & ~green) | (value < 35)
    brown = (
        (hue >= 5) & (hue <= 35) & (saturation > 50) & (value < 0.85 * median_v) & ~green
    )
    defects = ((dark | brown) & mask).astype(np.uint8)
    defects = cv2.morphologyEx(defects, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return defects > 0


def region_label(cx: float, cy: float, width: int, height: int) -> str:
    horizontal = "kiri" if cx < width / 3 else ("kanan" if cx > 2 * width / 3 else "tengah")
    vertical = "atas" if cy < height / 3 else ("bawah" if cy > 2 * height / 3 else "tengah")
    if horizontal == vertical == "tengah":
        return "tengah"
    if horizontal == "tengah":
        return vertical
    if vertical == "tengah":
        return horizontal
    return f"{vertical}-{horizontal}"


def human_region(region: str) -> str:
    if region in ("-", None):
        return "tidak terdeteksi"
    if region == "tengah":
        return "bagian tengah"
    return "bagian " + " ".join(reversed(region.split("-")))


def format_number(value: float, decimals: int = 0) -> str:
    return f"{value:.{decimals}f}".replace(".", ",")


def analyze_defects(bgr: np.ndarray) -> dict[str, object]:
    mask = fruit_mask(bgr)
    eroded = cv2.erode(mask.astype(np.uint8), np.ones((7, 7), np.uint8), iterations=2) > 0
    if eroded.sum() < 0.25 * max(int(mask.sum()), 1):
        eroded = mask

    defects = defect_mask(bgr, eroded)
    n_fruit = max(int(eroded.sum()), 1)
    defect_ratio = float(defects.sum()) / n_fruit

    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(float)
    mean_lab = lab[eroded].mean(axis=0) if eroded.any() else np.zeros(3)

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_32F, ksize=3)
    texture = float(laplacian[eroded].var()) if eroded.any() else 0.0

    count, _, stats, centroids = cv2.connectedComponentsWithStats(defects.astype(np.uint8), 8)
    if count > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        spots = int((areas >= 20).sum())
        largest_idx = 1 + int(np.argmax(areas))
        largest = int(stats[largest_idx, cv2.CC_STAT_AREA])
        cx, cy = centroids[largest_idx]
        height, width = defects.shape
        location = region_label(cx, cy, width, height)
    else:
        spots, largest, location = 0, 0, "-"

    healthy = eroded & ~defects
    if defects.any() and healthy.any():
        color_distance = float(np.linalg.norm(lab[defects].mean(axis=0) - lab[healthy].mean(axis=0)))
    else:
        color_distance = 0.0

    return {
        "mask": mask,
        "defect": defects,
        "fruit_count": fruit_candidate_count(bgr),
        "rasio_defek": defect_ratio,
        "jumlah_bercak": spots,
        "bercak_terbesar": largest / n_fruit if largest else 0.0,
        "lokasi_bercak": location,
        "jarak_warna": color_distance,
        "tekstur": texture,
        "mean_lab": mean_lab,
    }


def overlay_heatmap(rgb01: np.ndarray, heat: np.ndarray, alpha: float = 0.45) -> np.ndarray:
    resized = cv2.resize(heat, (rgb01.shape[1], rgb01.shape[0]))
    colored = cv2.applyColorMap(np.uint8(255 * resized), cv2.COLORMAP_JET)
    colored = cv2.cvtColor(colored, cv2.COLOR_BGR2RGB) / 255.0
    return np.clip((1 - alpha) * rgb01 + alpha * colored, 0, 1)


def defect_overlay(rgb01: np.ndarray, defects: np.ndarray) -> np.ndarray:
    preview = rgb01 * 0.35
    preview[defects] = [1.0, 0.07, 0.05]
    return preview


def png_base64(image_rgb: np.ndarray) -> str:
    buffer = io.BytesIO()
    Image.fromarray(np.uint8(np.clip(image_rgb, 0, 1) * 255)).save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def tta_probabilities(image: Image.Image) -> np.ndarray:
    width, height = image.size
    variants = [image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)]
    for ratio in (0.8, 0.7, 0.6, 0.5):
        side = int(min(width, height) * ratio)
        left = (width - side) // 2
        top = (height - side) // 2
        crop = image.crop((left, top, left + side, top + side))
        variants.append(crop)
        variants.append(crop.transpose(Image.Transpose.FLIP_LEFT_RIGHT))
    batch = np.stack([
        np.asarray(
            variant.convert("RGB").resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR),
            dtype=np.float32,
        ) / 255.0
        for variant in variants
    ])
    return state["model"].predict(batch, batch_size=8, verbose=0).mean(axis=0)


def build_explanation(label: str, confidence: float, fruit: str, features: dict[str, object], focus: str) -> str:
    thresholds = CALIBRATION[fruit]
    reasons: list[str] = []
    defect_ratio = float(features["rasio_defek"])
    texture = float(features["tekstur"])

    if defect_ratio > thresholds["thr_defek"]:
        ratio = defect_ratio / max(thresholds["defek_fresh"], 1e-6)
        reasons.append(
            f"sekitar {format_number(defect_ratio * 100)}% permukaan buah tertutup bercak "
            f"gelap/kecokelatan, sekitar {format_number(ratio, 1)} kali lebih luas daripada buah segar"
        )
    if int(features["jumlah_bercak"]) > thresholds["thr_bercak"]:
        reasons.append(
            f"ada {features['jumlah_bercak']} bercak; yang terbesar menutupi sekitar "
            f"{format_number(float(features['bercak_terbesar']) * 100)}% permukaan dan berada di "
            f"{human_region(str(features['lokasi_bercak']))}"
        )
    if texture > thresholds["thr_tekstur"] and (
        defect_ratio > thresholds["thr_defek"]
        or int(features["jumlah_bercak"]) > thresholds["thr_bercak"]
    ):
        reasons.append(
            f"permukaan kulitnya sekitar "
            f"{format_number(texture / max(thresholds['tekstur_fresh'], 1e-6))} kali lebih kasar "
            f"dan berkeriput dibanding buah segar"
        )
    if defect_ratio > 0.02 and float(features["jarak_warna"]) > 25:
        reasons.append("warna bercak jauh berbeda dari warna kulit buah di sekitarnya")

    confidence_text = format_number(confidence * 100, 1)
    if label.startswith("fresh"):
        if reasons:
            text = (
                f"{FRUIT_NAMES[fruit]} ini dinilai segar (keyakinan {confidence_text}%), "
                f"tetapi ada tanda-tanda awal: " + "; ".join(reasons) + "."
            )
        else:
            text = (
                f"{FRUIT_NAMES[fruit]} ini dinilai segar (keyakinan {confidence_text}%). "
                f"Warna kulitnya masih homogen, permukaannya tidak terlalu kasar, dan hampir "
                f"tidak ada bercak gelap."
            )
    else:
        if not reasons:
            reasons = [f"warna dan permukaannya sudah menyimpang dari {FRUIT_NAMES[fruit].lower()} segar"]
        text = (
            f"{FRUIT_NAMES[fruit]} ini dinilai tidak segar (keyakinan {confidence_text}%). "
            f"Alasan: " + "; ".join(reasons) + "."
        )
    return text + f" Bagian yang paling diperhatikan saat penilaian ada di {focus}."


def load_resources() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model tidak ditemukan: {MODEL_PATH}")
    model = keras.models.load_model(MODEL_PATH)
    state["model"] = model
    state["grad_model"] = build_grad_model(model)
    state["model_name"] = MODEL_PATH.stem
    state["model_file"] = MODEL_PATH.name


@asynccontextmanager
async def lifespan(_: FastAPI):
    load_resources()
    yield
    state.clear()


app = FastAPI(title="FreshSight API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    payload = await image.read()
    try:
        pil_image = Image.open(io.BytesIO(payload)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="Gambar tidak dapat dibaca") from exc

    resized = pil_image.resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR)
    full_rgb01 = np.asarray(resized, dtype=np.float32) / 255.0
    full_bgr = cv2.cvtColor(np.asarray(resized), cv2.COLOR_RGB2BGR)

    crops = find_fruit_crops(pil_image)
    crop = crops[0][0] if crops and crops[0][1] <= 0.25 else None
    used_crop = crop is not None

    started = time.perf_counter()
    with inference_lock:
        if crop is not None:
            analysis_image = crop.resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR)
            analysis_rgb01 = np.asarray(analysis_image, dtype=np.float32) / 255.0
            analysis_bgr = cv2.cvtColor(np.asarray(analysis_image), cv2.COLOR_RGB2BGR)
            probabilities = state["model"].predict(analysis_rgb01[None], batch_size=1, verbose=0)[0]
            used_tta = False
        else:
            analysis_rgb01 = full_rgb01
            analysis_bgr = full_bgr
            base_probs = state["model"].predict(full_rgb01[None], batch_size=1, verbose=0)[0]
            probabilities = base_probs
            used_tta = False
            if float(base_probs.max()) < TTA_THRESHOLD:
                tta_probs = tta_probabilities(pil_image)
                tta_peak = float(tta_probs.max())
                base_peak = float(base_probs.max())
                if tta_peak > base_peak and (tta_peak - base_peak >= 0.20 or tta_peak >= 0.85):
                    probabilities = tta_probs
                    used_tta = True
        class_idx = int(np.argmax(probabilities))
        heat, _, _ = run_gradcam(analysis_rgb01, class_idx=class_idx)
        features = analyze_defects(analysis_bgr)
        features["fruit_count"] = fruit_candidate_count(full_bgr)
    inference_ms = round((time.perf_counter() - started) * 1000, 2)

    label = CLASSES[class_idx]
    confidence = float(probabilities[class_idx])
    fruit = label.split("_")[1]

    ys, xs = np.indices(heat.shape)
    total_heat = float(heat.sum()) + 1e-8
    focus = region_label(
        float((xs * heat).sum() / total_heat),
        float((ys * heat).sum() / total_heat),
        heat.shape[1],
        heat.shape[0],
    )

    explanation = build_explanation(label, confidence, fruit, features, human_region(focus))
    gradcam = overlay_heatmap(analysis_rgb01, heat)
    preview = defect_overlay(analysis_rgb01, features["defect"])

    return {
        "label": label,
        "fruit": fruit,
        "freshness": "fresh" if label.startswith("fresh") else "rotten",
        "confidence": confidence,
        "probs": {name: float(probabilities[index]) for index, name in enumerate(CLASSES)},
        "features": {
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
