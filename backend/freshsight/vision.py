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
    """Detect and inpaint compact supermarket PLU / barcode stickers on fruit skin.

    Handles three supermarket sticker/barcode types without disturbing natural mold or highlights:
    1) High-contrast white-paper + dark-ink barcode/text PLU stickers (including small/anti-aliased ovals),
       separated from fuzzy mold & specular highlights by compact solidity and sharp Sobel edge gradients.
    2) Vivid non-biological blue/indigo/violet PLU stickers with printed text/barcode detail.
    3) Direct/transparent printed barcodes (no white paper) detected via >= 7 periodic alternating
       parallel dark/light stripes (anisotropic high-pass sign flips) strictly inside the fruit interior.
    """
    h_img, w_img = bgr.shape[:2]
    img_area = float(h_img * w_img)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    # Restrict strictly to the fruit interior so white studio backgrounds never leak in
    fmask = fruit_mask(bgr)
    inner = cv2.erode(fmask.astype(np.uint8) * 255, np.ones((5, 5), np.uint8), iterations=1) > 0
    border_ok = np.ones((h_img, w_img), dtype=bool)
    margin = max(4, int(0.03 * min(h_img, w_img)))
    border_ok[:margin, :] = False
    border_ok[-margin:, :] = False
    border_ok[:, :margin] = False
    border_ok[:, -margin:] = False
    inner = inner & border_ok

    white_paper = (sat < 60) & (val > 165) & inner
    dark_ink = (sat < 90) & (val < 120) & inner
    blue_ink = (hue >= 98) & (hue <= 150) & (sat > 75) & (val > 40) & inner

    gx_signed = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy_signed = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    gx_abs = np.abs(gx_signed)
    gy_abs = np.abs(gy_signed)
    grad = np.sqrt(gx_signed * gx_signed + gy_signed * gy_signed)

    sticker_mask = np.zeros((h_img, w_img), dtype=np.uint8)

    # Branch 1 & 2: White-paper / dark-ink / vivid-blue PLU stickers
    if int(np.count_nonzero(white_paper)) + int(np.count_nonzero(blue_ink)) >= int(0.0015 * img_area):
        cand_raw = (white_paper | dark_ink | blue_ink).astype(np.uint8) * 255
        cand_closed = cv2.morphologyEx(cand_raw, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8), iterations=2)
        cand_closed = cv2.morphologyEx(cand_closed, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
        contours, _ = cv2.findContours(cand_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            area_ratio = area / img_area
            if area_ratio < 0.0025 or area_ratio > 0.14:
                continue
            _, _, bw, bh = cv2.boundingRect(cnt)
            aspect = bw / max(bh, 1)
            hull_area = cv2.contourArea(cv2.convexHull(cnt))
            solidity = area / max(hull_area, 1.0)

            blob_u8 = np.zeros((h_img, w_img), dtype=np.uint8)
            cv2.drawContours(blob_u8, [cnt], -1, 255, -1)
            blob = blob_u8 > 0
            n_pix = max(int(blob.sum()), 1)

            w_frac = float((white_paper & blob).sum()) / n_pix
            d_frac = float((dark_ink & blob).sum()) / n_pix
            b_frac = float((blue_ink & blob).sum()) / n_pix
            sharp_edge_frac = float(((grad > 120.0) & blob).sum()) / n_pix
            mean_grad = float(grad[blob].mean())
            p90_grad = float(np.percentile(grad[blob], 90))

            is_barcode_sticker = (
                (0.35 <= aspect <= 2.8)
                and solidity >= 0.70
                and w_frac >= 0.16
                and (d_frac >= 0.07 or b_frac >= 0.04)
                and sharp_edge_frac >= 0.24
                and mean_grad >= 100.0
                and p90_grad >= 200.0
            )
            is_small_white_sticker = (
                (0.35 <= aspect <= 2.8)
                and solidity >= 0.85
                and area_ratio <= 0.08
                and w_frac >= 0.35
                and sharp_edge_frac >= 0.35
                and mean_grad >= 105.0
                and p90_grad >= 210.0
            )
            is_blue_sticker = (
                (0.30 <= aspect <= 3.2)
                and solidity >= 0.65
                and b_frac >= 0.15
                and area_ratio <= 0.10
                and sharp_edge_frac >= 0.22
                and p90_grad >= 190.0
            )
            if is_barcode_sticker or is_small_white_sticker or is_blue_sticker:
                sticker_mask[blob] = 255

    # Branch 3: Direct / transparent printed barcode (periodic alternating parallel stripes on fruit skin)
    inner_strict = cv2.erode(fmask.astype(np.uint8) * 255, np.ones((7, 7), np.uint8), iterations=1) > 0
    inner_strict = inner_strict & border_ok
    bar_v = cv2.boxFilter(np.maximum(gx_abs - 1.5 * gy_abs, 0.0), -1, (11, 11)) * inner_strict
    bar_h = cv2.boxFilter(np.maximum(gy_abs - 1.5 * gx_abs, 0.0), -1, (11, 11)) * inner_strict
    bar_score = np.maximum(bar_v, bar_h)

    if float(bar_score.max()) >= 140.0:
        gray_f = gray.astype(np.float32)
        hp_x = gray_f - cv2.GaussianBlur(gray_f, (9, 1), 0)
        hp_y = gray_f - cv2.GaussianBlur(gray_f, (1, 9), 0)
        bseed = ((bar_score > 75.0) & inner_strict).astype(np.uint8) * 255
        bseed = cv2.morphologyEx(bseed, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8), iterations=1)
        b_cnts, _ = cv2.findContours(bseed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in b_cnts:
            area = cv2.contourArea(cnt)
            if area < 0.0020 * img_area or area > 0.10 * img_area:
                continue
            x, y, bw, bh = cv2.boundingRect(cnt)
            if bw < 8 or bh < 8 or float(bar_score[y : y + bh, x : x + bw].max()) < 140.0:
                continue
            is_vert = float(bar_v[y : y + bh, x : x + bw].mean()) >= float(bar_h[y : y + bh, x : x + bw].mean())
            if is_vert:
                profile = hp_x[y + bh // 4 : y + 3 * bh // 4, x : x + bw].mean(axis=0)
            else:
                profile = hp_y[y : y + bh, x + bw // 4 : x + 3 * bw // 4].mean(axis=1)
            sig = np.where(np.abs(profile) > 10.0, np.sign(profile), 0.0)
            nz = sig[sig != 0]
            flips = int(np.sum(nz[1:] != nz[:-1])) if len(nz) >= 2 else 0
            if flips >= 7:
                cv2.drawContours(sticker_mask, [cnt], -1, 255, -1)

    if int(np.count_nonzero(sticker_mask)) == 0:
        return bgr, False

    sticker_mask = cv2.dilate(sticker_mask, np.ones((9, 9), np.uint8), iterations=1)
    cleaned = cv2.inpaint(bgr, sticker_mask, 7, cv2.INPAINT_TELEA)
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


def assess_image_quality(
    bgr: np.ndarray,
    mask: np.ndarray,
    is_ood: bool = False,
) -> dict[str, object]:
    """Check basic capture quality (lighting, blur, fruit framing distance) for user guidance."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    mask_bool = mask.astype(bool)
    n_total = max(int(mask_bool.size), 1)
    n_fruit = int(mask_bool.sum())
    area_ratio = n_fruit / n_total

    region_v = hsv[:, :, 2][mask_bool] if n_fruit >= 20 else hsv[:, :, 2].ravel()
    region_s = hsv[:, :, 1][mask_bool] if n_fruit >= 20 else hsv[:, :, 1].ravel()
    mean_v = float(region_v.mean())
    glare_ratio = float(((region_v >= 248) & (region_s <= 22)).mean())

    if mean_v < 42.0:
        light = "dark"
    elif mean_v > 245.0 or glare_ratio > 0.35:
        light = "glare"
    else:
        light = "ok"

    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    focus = "blur" if lap_var < 25.0 else "ok"
    distance = "far" if (not is_ood and area_ratio < 0.06) else "ok"

    warnings: list[str] = []
    if light == "dark":
        warnings.append("Foto terlalu gelap; tambahkan pencahayaan agar warna kulit terbaca jelas.")
    elif light == "glare":
        warnings.append("Pantulan cahaya terlalu terang pada permukaan buah.")
    if focus == "blur":
        warnings.append("Foto tampak buram; tahan kamera tetap stabil dan fokuskan ke buah.")
    if distance == "far":
        warnings.append("Posisi buah terlalu jauh; dekatkan kamera agar buah memenuhi bingkai.")

    return {
        "light": light,
        "focus": focus,
        "distance": distance,
        "warnings": warnings,
    }
