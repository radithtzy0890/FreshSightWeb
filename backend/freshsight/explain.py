"""Post-processing calibration, Grad-CAM/defect visual overlays, and Indonesian explanations."""

from __future__ import annotations

import base64
import io

import cv2
import numpy as np
from PIL import Image

from .config import CALIBRATION, CLIP_APPLE_OVER_ORANGE_MARGIN, FRUIT_NAMES


def human_region(region: str) -> str:
    if region in ("-", None):
        return "tidak terdeteksi"
    if region == "tengah":
        return "bagian tengah"
    return "bagian " + " ".join(reversed(region.split("-")))


def format_number(value: float, decimals: int = 0) -> str:
    return f"{value:.{decimals}f}".replace(".", ",")


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
        return np.array([0.02, 0.03, 0.01, 0.01, 0.05, 0.88], dtype=np.float32)

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


def reconcile_species_with_clip(
    probabilities: np.ndarray,
    ood_metrics: dict[str, object],
) -> np.ndarray:
    """Correct orange-tinted apples (e.g. Fuji/Gala/Honeycrisp) misclassified as orange by the CNN.

    Preserves the CNN's fresh-vs-rotten prediction while transferring orange probability mass to apple
    only when MobileCLIP2-S0 strongly prefers apple over orange (+0.030 margin, verified 0/120 false flips
    on real internal & Mendeley oranges).
    """
    top_idx = int(np.argmax(probabilities))
    if top_idx not in (4, 5):  # Only intervene when CNN predicts fresh_orange (4) or rotten_orange (5)
        return probabilities

    apple_sim = ood_metrics.get("clip_apple_sim")
    orange_sim = ood_metrics.get("clip_orange_sim")
    banana_sim = ood_metrics.get("clip_banana_sim", -1.0)
    if apple_sim is None or orange_sim is None:
        return probabilities

    if (float(apple_sim) - float(orange_sim)) >= CLIP_APPLE_OVER_ORANGE_MARGIN and float(apple_sim) > float(banana_sim):
        adjusted = probabilities.copy()
        adjusted[0] = probabilities[0] + probabilities[4]
        adjusted[1] = probabilities[1] + probabilities[5]
        adjusted[4] = min(0.01, float(probabilities[0]))
        adjusted[5] = min(0.01, float(probabilities[1]))
        return adjusted / max(float(adjusted.sum()), 1e-8)

    return probabilities


def build_explanation(
    label: str,
    confidence: float,
    fruit: str,
    features: dict[str, object],
    focus: str,
    is_ood: bool = False,
    ood_reason: str = "",
) -> str:
    if is_ood:
        detail = f" ({ood_reason})." if ood_reason else "."
        return (
            f"Sistem tidak mendeteksi buah apel, pisang, atau jeruk yang valid pada foto ini{detail} "
            "FreshSight hanya mendukung klasifikasi kesegaran apel, pisang, dan jeruk. "
            "Pastikan foto menampilkan satu buah target utuh di tengah bingkai dengan pencahayaan cukup."
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
