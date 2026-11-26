"""OpenCV image preprocessing: fruit candidates, auto-crop, PLU sticker suppression, and defect analysis."""

from __future__ import annotations

import cv2
import numpy as np
from PIL import Image


def detect_ood_and_candidates(bgr: np.ndarray) -> tuple[bool, int, float]:
    """Detect whether the image contains valid biological fruit region(s) and count candidates."""
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue, saturation, value = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    # Biological fruit hues: red/orange/yellow/green/brown with non-trivial saturation
    fruit_color = (saturation > 38) & (value > 30) & ((hue <= 100) | (hue >= 155))
    raw = fruit_color.astype(np.uint8) * 255
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
        binary = mask.astype(np.uint8) * 255
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


def suppress_fruit_sticker(bgr: np.ndarray) -> tuple[np.ndarray, bool]:
    """Detect and inpaint compact non-biological blue/violet supermarket PLU stickers on fruit skin.

    Triggers ONLY when a compact vivid blue/indigo/violet core (H in [100, 148], S > 85)
    lies inside the fruit region, avoiding any interference with green/white Penicillium mold.
    """
    h_img, w_img = bgr.shape[:2]
    img_area = float(h_img * w_img)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    blue_core = ((hue >= 100) & (hue <= 148) & (sat > 85) & (val > 45)).astype(np.uint8) * 255
    if int(np.count_nonzero(blue_core)) < int(0.0015 * img_area):
        return bgr, False

    fmask = fruit_mask(bgr)
    border_ok = np.ones((h_img, w_img), dtype=bool)
    margin = max(4, int(0.03 * min(h_img, w_img)))
    border_ok[:margin, :] = False
    border_ok[-margin:, :] = False
    border_ok[:, :margin] = False
    border_ok[:, -margin:] = False

    seed = ((blue_core > 0) & fmask & border_ok).astype(np.uint8) * 255
    seed = cv2.morphologyEx(seed, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=1)
    contours, _ = cv2.findContours(seed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    sticker_mask = np.zeros((h_img, w_img), dtype=np.uint8)
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 0.0015 * img_area or area > 0.10 * img_area:
            continue
        x, y, bw, bh = cv2.boundingRect(cnt)
        pad = max(8, int(0.45 * max(bw, bh)))
        x1, y1 = max(0, x - pad), max(0, y - pad)
        x2, y2 = min(w_img, x + bw + pad), min(h_img, y + bh + pad)
        roi_h = hue[y1:y2, x1:x2]
        roi_s = sat[y1:y2, x1:x2]
        roi_v = val[y1:y2, x1:x2]
        roi_sticker = (
            ((roi_h >= 96) & (roi_h <= 152) & (roi_s > 50))
            | ((roi_s < 55) & (roi_v > 150))
            | ((roi_s < 65) & (roi_v < 120))
        )
        roi_u8 = roi_sticker.astype(np.uint8) * 255
        roi_u8 = cv2.morphologyEx(roi_u8, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)
        n_cc, cc_labels, cc_stats, _ = cv2.connectedComponentsWithStats(roi_u8, 8)
        core_in_roi = seed[y1:y2, x1:x2] > 0
        for cid in range(1, n_cc):
            cc_mask = cc_labels == cid
            if np.any(cc_mask & core_in_roi) and cc_stats[cid, cv2.CC_STAT_AREA] <= 0.14 * img_area:
                sticker_mask[y1:y2, x1:x2][cc_mask] = 255

    if int(np.count_nonzero(sticker_mask)) == 0:
        return bgr, False

    sticker_mask = cv2.dilate(sticker_mask, np.ones((5, 5), np.uint8), iterations=1)
    cleaned = cv2.inpaint(bgr, sticker_mask, 5, cv2.INPAINT_TELEA)
    return cleaned, True


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
    mold_pixels = (hue >= 32) & (hue <= 105) & (saturation < 165) & (value < 220) & eroded
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
