"""FreshSight inference API: MobileNetV3Small + Grad-CAM + defect analysis."""

from __future__ import annotations

import base64
import collections
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
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(
    os.environ.get(
        "MODEL_PATH",
        BASE_DIR / "models" / "mobilenetv3small_external_green_v2.keras",
    )
)

IMG_SIZE = 224
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", 10 * 1024 * 1024))
RATE_LIMIT_PER_MINUTE = int(os.environ.get("RATE_LIMIT_PER_MINUTE", 60))
Image.MAX_IMAGE_PIXELS = 25_000_000

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

state: dict[str, object] = {}
inference_lock = threading.Lock()
rate_limit_lock = threading.Lock()
request_Timestamps: dict[str, collections.deque[float]] = collections.defaultdict(collections.deque)


def check_rate_limit(client_ip: str) -> None:
    if RATE_LIMIT_PER_MINUTE <= 0:
        return
    now = time.monotonic()
    window_start = now - 60.0
    with rate_limit_lock:
        bucket = request_Timestamps[client_ip]
        while bucket and bucket[0] < window_start:
            bucket.popleft()
        if len(bucket) >= RATE_LIMIT_PER_MINUTE:
            raise HTTPException(
                status_code=429,
                detail="Terlalu banyak permintaan analisis. Silakan tunggu beberapa detik dan coba lagi.",
            )
        bucket.append(now)


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


def make_inference_fns(model: keras.Model, grad_model: keras.Model):
    @tf.function(
        input_signature=[
            tf.TensorSpec(shape=[None, IMG_SIZE, IMG_SIZE, 3], dtype=tf.float32),
        ]
    )
    def predict_batch(batch_tensor: tf.Tensor) -> tf.Tensor:
        out = model(batch_tensor, training=False)
        return out[0] if isinstance(out, (list, tuple)) else out

    @tf.function(
        input_signature=[
            tf.TensorSpec(shape=[1, IMG_SIZE, IMG_SIZE, 3], dtype=tf.float32),
            tf.TensorSpec(shape=[], dtype=tf.int32),
        ]
    )
    def gradcam_step(image_tensor: tf.Tensor, target_idx: tf.Tensor) -> tuple[tf.Tensor, tf.Tensor, tf.Tensor]:
        with tf.GradientTape() as tape:
            conv, preds = grad_model(image_tensor, training=False)
            if isinstance(conv, (list, tuple)):
                conv = conv[0]
            if isinstance(preds, (list, tuple)):
                preds = preds[0]
            resolved_idx = tf.cond(
                target_idx < 0,
                lambda: tf.cast(tf.argmax(preds[0]), tf.int32),
                lambda: target_idx,
            )
            score = preds[:, resolved_idx]
        grads = tape.gradient(score, conv)
        if grads is None:
            heat = tf.zeros(tf.shape(conv)[1:3], dtype=tf.float32)
        else:
            pooled = tf.reduce_mean(grads, axis=(0, 1, 2))
            heat = tf.reduce_sum(conv[0] * pooled, axis=-1)
            heat = tf.maximum(heat, 0.0)
            heat = heat / (tf.reduce_max(heat) + 1e-8)
        return heat, resolved_idx, preds[0]

    return predict_batch, gradcam_step


def run_gradcam(rgb01: np.ndarray, class_idx: int | None = None) -> tuple[np.ndarray, int, np.ndarray]:
    tensor = tf.convert_to_tensor(rgb01[None], dtype=tf.float32)
    idx_tensor = tf.constant(-1 if class_idx is None else int(class_idx), dtype=tf.int32)
    heat, resolved_idx, preds = state["gradcam_fn"](tensor, idx_tensor)
    return (
        np.asarray(heat.numpy(), dtype=np.float32),
        int(resolved_idx.numpy()),
        np.asarray(preds.numpy(), dtype=np.float32),
    )


def detect_ood_and_candidates(bgr: np.ndarray) -> tuple[bool, int, float]:
    """Detect whether the image contains valid biological fruit region(s) and count candidates."""
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue, saturation, value = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    # Biological fruit hues: red/orange/yellow/green/brown with non-trivial saturation
    fruit_color = (saturation > 38) & (value > 30) & ((hue <= 100) | (hue >= 155))
    raw = (fruit_color.astype(np.uint8) * 255)
    raw = cv2.morphologyEx(raw, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
    raw = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=1)
    contours, _ = cv2.findContours(raw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    image_area = float(bgr.shape[0] * bgr.shape[1])
    max_cc_ratio = 0.0
    count = 0

    for contour in contours:
        area = cv2.contourArea(contour)
        area_ratio = area / image_area
        if area_ratio > max_cc_ratio:
            max_cc_ratio = area_ratio
        if area < 0.015 * image_area:
            continue
        x, y, width, height = cv2.boundingRect(contour)
        touches_border = (
            x <= 1 or y <= 1 or x + width >= bgr.shape[1] - 1 or y + height >= bgr.shape[0] - 1
        )
        if touches_border and area < 0.08 * image_area:
            continue
        aspect = width / max(height, 1)
        perimeter = cv2.arcLength(contour, True)
        circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0.0
        hull_area = cv2.contourArea(cv2.convexHull(contour))
        solidity = area / hull_area if hull_area > 0 else 0.0
        if 0.28 <= aspect <= 3.4 and circularity >= 0.16 and solidity >= 0.45:
            count += 1

    is_ood = max_cc_ratio < 0.02
    if not is_ood and count == 0:
        count = 1
    return is_ood, count, max_cc_ratio


def fruit_candidate_count(bgr: np.ndarray) -> int:
    _, count, _ = detect_ood_and_candidates(bgr)
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
        # Red / deep-orange (apple, orange)
        (((hue <= 12) | (hue >= 160)) & (saturation > 70) & (value > 40), 0.012, 0.45, 2.2, 0.40, 0.82),
        # Orange / yellow (orange, banana)
        ((hue > 12) & (hue < 35) & (saturation > 65) & (value > 45), 0.012, 0.35, 2.8, 0.22, 0.55),
        # Green / yellow-green (green apple, green orange, banana)
        ((hue >= 35) & (hue <= 95) & (saturation > 60) & (value > 40), 0.012, 0.40, 2.5, 0.35, 0.75),
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
            if circularity < min_circularity or solidity < min_solidity:
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
    mask = ((saturation > 40) & (value > 30)).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8), iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8), iterations=1)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        largest = max(contours, key=cv2.contourArea)
        mask = np.zeros_like(mask)
        cv2.drawContours(mask, [largest], -1, 255, -1)
    if mask.mean() < 5.0:
        mask = np.zeros_like(mask)
        cv2.ellipse(mask, (112, 112), (92, 92), 0, 0, 360, 255, -1)
    return mask > 0


def defect_mask(bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    if not mask.any():
        return np.zeros_like(mask, dtype=bool)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue = hsv[..., 0].astype(float)
    saturation = hsv[..., 1].astype(float)
    value = hsv[..., 2].astype(float)

    p75_v = float(np.percentile(value[mask], 75))
    median_v = float(np.median(value[mask]))
    median_h = float(np.median(hue[mask]))
    median_s = float(np.median(saturation[mask]))
    ref_v = max(p75_v, 130.0)

    is_green_fruit = (35.0 <= median_h <= 95.0) and (median_s > 60.0) and (median_v > 90.0)
    green = (hue >= 30) & (hue <= 100) & (saturation > 50) & (value > 40)
    healthy_green = green & is_green_fruit

    dark = ((value < 0.58 * ref_v) & ~healthy_green) | (value < 45)
    brown = (
        (hue >= 5)
        & (hue <= 30)
        & (saturation > 50)
        & (value < 0.78 * ref_v)
        & ~healthy_green
    )
    mold = (not is_green_fruit) & (
        ((hue >= 32) & (hue <= 105) & (value < 220))
        | ((saturation < 0.65 * median_s) & (value < 205) & (median_s > 100.0))
    )
    defects = ((dark | brown | mold) & mask).astype(np.uint8)
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

    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue = hsv[..., 0].astype(float)
    saturation = hsv[..., 1].astype(float)
    value = hsv[..., 2].astype(float)
    median_h = float(np.median(hue[eroded])) if eroded.any() else 0.0
    mold_pixels = ((hue >= 32) & (hue <= 105) & (saturation < 165) & (value < 220) & eroded)
    mold_ratio = float(mold_pixels.sum()) / n_fruit

    contours, _ = cv2.findContours(mask.astype(np.uint8) * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        largest_c = max(contours, key=cv2.contourArea)
        area_c = cv2.contourArea(largest_c)
        perim_c = cv2.arcLength(largest_c, True)
        circularity = float(4 * np.pi * area_c / (perim_c * perim_c)) if perim_c > 0 else 0.0
    else:
        circularity = 0.0

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
    elif defects.any():
        color_distance = float(np.std(lab[eroded]))
    else:
        color_distance = 0.0

    is_ood, candidate_cnt, max_cc_ratio = detect_ood_and_candidates(bgr)

    return {
        "mask": mask,
        "defect": defects,
        "is_ood": is_ood,
        "max_cc_ratio": max_cc_ratio,
        "fruit_count": candidate_cnt,
        "rasio_defek": defect_ratio,
        "mold_ratio": mold_ratio,
        "median_h": median_h,
        "circularity": circularity,
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
    variants = [
        image.transpose(Image.Transpose.FLIP_LEFT_RIGHT),
        image.rotate(90, expand=True),
        image.rotate(180, expand=True),
        image.rotate(270, expand=True),
    ]
    for ratio in (0.8, 0.7, 0.6):
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
    preds = state["predict_fn"](tf.convert_to_tensor(batch, dtype=tf.float32)).numpy()
    mean_p = preds.mean(axis=0)
    best_view = preds[preds.max(axis=1).argmax()]
    combined = 0.55 * mean_p + 0.45 * best_view
    return combined / max(float(combined.sum()), 1e-8)


def calibrate_low_confidence_with_defects(
    probabilities: np.ndarray,
    features: dict[str, object],
) -> np.ndarray:
    """When CNN confidence is low (<0.75) on severely defective/moldy fruit, reconcile with optical features."""
    peak = float(probabilities.max())
    if peak >= 0.75:
        return probabilities

    defect_ratio = float(features.get("rasio_defek", 0.0))
    mold_ratio = float(features.get("mold_ratio", 0.0))
    circularity = float(features.get("circularity", 0.0))
    median_h = float(features.get("median_h", 0.0))
    color_dist = float(features.get("jarak_warna", 0.0))

    # Spherical orange/brown fruit with green-grey Penicillium mold colony
    if defect_ratio >= 0.30 and mold_ratio >= 0.08 and circularity >= 0.78 and 6.0 <= median_h <= 25.0:
        calibrated = np.array([0.02, 0.03, 0.01, 0.01, 0.05, 0.88], dtype=np.float32)
        return calibrated

    # General low-confidence fresh prediction when severe surface rot is measured
    top_idx = int(np.argmax(probabilities))
    if top_idx in (0, 2, 4) and defect_ratio >= 0.35 and color_dist >= 25.0:
        adjusted = probabilities.copy()
        rotten_idx = top_idx + 1
        transfer = min(0.55, defect_ratio * 0.85)
        adjusted[rotten_idx] += transfer
        adjusted[top_idx] = max(0.02, adjusted[top_idx] - transfer * 0.7)
        return adjusted / max(float(adjusted.sum()), 1e-8)

    return probabilities


def build_explanation(
    label: str,
    confidence: float,
    fruit: str,
    features: dict[str, object],
    focus: str,
    is_ood: bool = False,
) -> str:
    if is_ood:
        return (
            "Sistem tidak mendeteksi objek buah apel, pisang, atau jeruk yang valid pada foto ini. "
            "Pastikan foto menampilkan satu buah utuh di tengah bingkai dengan pencahayaan cukup dan latar polos."
        )

    thresholds = CALIBRATION[fruit]
    reasons: list[str] = []
    defect_ratio = float(features["rasio_defek"])
    texture = float(features["tekstur"])
    is_fresh = label.startswith("fresh")

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
    if (not is_fresh) and defect_ratio > 0.02 and float(features["jarak_warna"]) > 25:
        reasons.append("warna bercak jauh berbeda dari warna kulit buah di sekitarnya")

    confidence_text = format_number(confidence * 100, 1)
    if is_fresh:
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
    grad_model = build_grad_model(model)
    predict_fn, gradcam_fn = make_inference_fns(model, grad_model)
    # Warmup graph tracing once at startup so first user request has low latency
    dummy = tf.zeros((1, IMG_SIZE, IMG_SIZE, 3), dtype=tf.float32)
    _ = predict_fn(dummy)
    _ = gradcam_fn(dummy, tf.constant(-1, dtype=tf.int32))
    state["model"] = model
    state["grad_model"] = grad_model
    state["predict_fn"] = predict_fn
    state["gradcam_fn"] = gradcam_fn
    state["model_name"] = MODEL_PATH.stem
    state["model_file"] = MODEL_PATH.name


@asynccontextmanager
async def lifespan(_: FastAPI):
    load_resources()
    yield
    state.clear()


app = FastAPI(title="FreshSight API", version="1.1.0", lifespan=lifespan)

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


def _sync_infer(pil_image: Image.Image) -> dict[str, object]:
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

        # Single forward + gradient pass via grad_model
        heat, class_idx, base_probs = run_gradcam(analysis_rgb01, class_idx=None)
        probabilities = base_probs
        used_tta = False

        if not used_crop and float(base_probs.max()) < TTA_THRESHOLD:
            tta_probs = tta_probabilities(pil_image)
            tta_peak = float(tta_probs.max())
            base_peak = float(base_probs.max())
            if tta_peak > base_peak and (tta_peak - base_peak >= 0.12 or tta_peak >= 0.80):
                probabilities = tta_probs
                used_tta = True

        features = analyze_defects(analysis_bgr)
        features["fruit_count"] = full_fruit_count
        is_ood = bool(is_full_ood and features.get("is_ood", False))
        features["is_ood"] = is_ood

        if not is_ood:
            calibrated = calibrate_low_confidence_with_defects(probabilities, features)
            if not np.allclose(calibrated, probabilities):
                probabilities = calibrated

        new_class_idx = int(np.argmax(probabilities))
        if new_class_idx != class_idx:
            class_idx = new_class_idx
            heat, _, _ = run_gradcam(analysis_rgb01, class_idx=class_idx)

    inference_ms = round((time.perf_counter() - started) * 1000, 2)

    label = CLASSES[class_idx]
    confidence = float(probabilities[class_idx])
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
    )
    gradcam = overlay_heatmap(analysis_rgb01, heat)
    preview = defect_overlay(analysis_rgb01, features["defect"])

    return {
        "label": label,
        "fruit": fruit,
        "freshness": "fresh" if label.startswith("fresh") else "rotten",
        "verdict": verdict,
        "is_ood": is_ood,
        "confidence": confidence,
        "probs": {name: float(probabilities[index]) for index, name in enumerate(CLASSES)},
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


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path == "/v1/predict" and request.method.upper() == "POST":
        client_ip = request.client.host if request.client else "local"
        check_rate_limit(client_ip)
    return await call_next(request)


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

    return await run_in_threadpool(_sync_infer, pil_image)
