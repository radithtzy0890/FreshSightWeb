"""Dual-Gate OOD detection: 576-d embedding distance + MobileCLIP2-S0 zero-shot ONNX."""

from __future__ import annotations

import numpy as np
import onnxruntime as ort
from PIL import Image

from .config import (
    CLIP_IMG_SIZE,
    CLIP_PROMPTS_PATH,
    CLIP_VISION_PATH,
    OOD_CLIP_BORDERLINE_MARGIN,
    OOD_CLIP_FAR_OVERRIDE_MARGIN,
    OOD_CLIP_HARD_MARGIN,
    OOD_COS_BORDERLINE,
    OOD_COS_FAR,
    OOD_MAHAL_BORDERLINE,
    OOD_MAHAL_FAR,
    OOD_REF_PATH,
)


def load_ood_assets(state: dict[str, object]) -> None:
    """Load embedding statistics and MobileCLIP2-S0 ONNX vision session into runtime state."""
    if OOD_REF_PATH.exists():
        ref = np.load(OOD_REF_PATH)
        state["ood_ref"] = {
            "centroids": np.asarray(ref["centroids"], dtype=np.float32),
            "class_means": np.asarray(ref["class_means"], dtype=np.float32),
            "precision": np.asarray(ref["precision"], dtype=np.float32),
        }

    if CLIP_VISION_PATH.exists() and CLIP_PROMPTS_PATH.exists():
        clip_sess = ort.InferenceSession(str(CLIP_VISION_PATH), providers=["CPUExecutionProvider"])
        clip_in_name = clip_sess.get_inputs()[0].name
        _ = clip_sess.run(
            None,
            {clip_in_name: np.zeros((1, 3, CLIP_IMG_SIZE, CLIP_IMG_SIZE), dtype=np.float32)},
        )
        p_npz = np.load(CLIP_PROMPTS_PATH, allow_pickle=False)
        state["clip_sess"] = clip_sess
        state["clip_prompts"] = {
            "input_name": clip_in_name,
            "labels": np.asarray(p_npz["labels"]),
            "is_target": np.asarray(p_npz["is_target"], dtype=bool),
            "is_non_fruit": np.asarray(p_npz["is_non_fruit"], dtype=bool),
            "embeddings": np.asarray(p_npz["embeddings"], dtype=np.float32),
        }


def preprocess_clip_image(pil_image: Image.Image) -> np.ndarray:
    """MobileCLIP2-S0 vision preprocessing: shortest-edge 256 resize, center crop, [0, 1] CHW float32."""
    img = pil_image.convert("RGB")
    width, height = img.size
    scale = float(CLIP_IMG_SIZE) / max(min(width, height), 1)
    nw = max(CLIP_IMG_SIZE, int(round(width * scale)))
    nh = max(CLIP_IMG_SIZE, int(round(height * scale)))
    img = img.resize((nw, nh), Image.Resampling.BILINEAR)
    left = (nw - CLIP_IMG_SIZE) // 2
    top = (nh - CLIP_IMG_SIZE) // 2
    img = img.crop((left, top, left + CLIP_IMG_SIZE, top + CLIP_IMG_SIZE))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    return arr.transpose(2, 0, 1)[np.newaxis, ...].astype(np.float32)


def evaluate_dual_ood(
    pil_image: Image.Image,
    gap_feat: np.ndarray,
    probs: np.ndarray,
    color_ood: bool,
    state: dict[str, object],
) -> tuple[bool, str, dict[str, object]]:
    """Dual-Gate OOD rejection:
    1) Embedding Cosine Similarity + Mahalanobis distance in fine-tuned 576-d GAP space;
    2) Open-vocabulary MobileCLIP2-S0 zero-shot semantic gate using precomputed fruit & non-fruit prompts
       to reject non-target fruits/vegetables as well as screenshots, charts, patterns, and general objects.
    """
    _ = probs
    metrics: dict[str, object] = {}
    max_cos = 1.0
    min_mahal = 0.0

    ood_ref = state.get("ood_ref")
    if ood_ref is not None:
        centroids = ood_ref["centroids"]
        class_means = ood_ref["class_means"]
        precision = ood_ref["precision"]
        fn = gap_feat / (float(np.linalg.norm(gap_feat)) + 1e-8)
        max_cos = float(np.max(centroids @ fn))
        diffs = gap_feat[None, :] - class_means
        mahals = np.sqrt(np.maximum(np.sum((diffs @ precision) * diffs, axis=1), 0.0))
        min_mahal = float(np.min(mahals))
        metrics["ood_max_cos"] = round(max_cos, 4)
        metrics["ood_min_mahal"] = round(min_mahal, 2)

    if color_ood:
        return True, "warna dan morfologi tidak cocok dengan buah apel, pisang, atau jeruk", metrics

    clip_sess = state.get("clip_sess")
    clip_prompts = state.get("clip_prompts")
    if clip_sess is not None and clip_prompts is not None:
        pv = preprocess_clip_image(pil_image)
        img_emb = clip_sess.run(None, {clip_prompts["input_name"]: pv})[0][0]
        img_emb = img_emb / (float(np.linalg.norm(img_emb)) + 1e-8)
        sims = clip_prompts["embeddings"] @ img_emb

        target_mask = clip_prompts["is_target"]
        non_target_mask = ~target_mask
        t_idx = int(np.where(target_mask)[0][int(np.argmax(sims[target_mask]))])
        nt_idx = int(np.where(non_target_mask)[0][int(np.argmax(sims[non_target_mask]))])

        best_t_label = str(clip_prompts["labels"][t_idx])
        best_nt_label = str(clip_prompts["labels"][nt_idx])
        best_nt_is_non_fruit = bool(clip_prompts["is_non_fruit"][nt_idx])
        margin = float(sims[t_idx] - sims[nt_idx])

        metrics["clip_target"] = best_t_label
        metrics["clip_other"] = best_nt_label
        metrics["clip_margin"] = round(margin, 4)

        if margin < OOD_CLIP_HARD_MARGIN:
            return (
                True,
                f"objek teridentifikasi sebagai {best_nt_label}, bukan apel, pisang, atau jeruk",
                metrics,
            )
        if margin < 0.0 and best_nt_is_non_fruit:
            return (
                True,
                f"objek teridentifikasi bukan buah target (indikasi: {best_nt_label})",
                metrics,
            )
        if (
            ood_ref is not None
            and margin < OOD_CLIP_BORDERLINE_MARGIN
            and (min_mahal >= OOD_MAHAL_BORDERLINE or max_cos < OOD_COS_BORDERLINE)
        ):
            return (
                True,
                f"citra diduga {best_nt_label} atau di luar kategori apel, pisang, dan jeruk",
                metrics,
            )
        if (
            ood_ref is not None
            and margin < OOD_CLIP_FAR_OVERRIDE_MARGIN
            and (max_cos < OOD_COS_FAR or min_mahal > OOD_MAHAL_FAR)
        ):
            return (
                True,
                f"fitur citra berada di luar distribusi buah target (kemiripan {max_cos:.2f}, jarak {min_mahal:.1f})",
                metrics,
            )
        return False, "", metrics

    if ood_ref is not None:
        if max_cos < 0.46 or min_mahal > OOD_MAHAL_FAR or (min_mahal > 27.0 and max_cos < OOD_COS_BORDERLINE):
            return (
                True,
                f"fitur citra berada di luar distribusi buah target (kemiripan {max_cos:.2f}, jarak {min_mahal:.1f})",
                metrics,
            )

    return False, "", metrics
