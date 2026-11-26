"""TensorFlow/Keras model loading, Grad-CAM graph execution, and adaptive TTA."""

from __future__ import annotations

import threading

import onnxruntime as _ort  # noqa: F401 - Keep before TensorFlow/Keras on Windows
import keras
import numpy as np
import tensorflow as tf
from PIL import Image

from .config import IMG_SIZE, MODEL_PATH
from .ood import load_ood_assets


def _apply_keras_compat_patch() -> None:
    """Strip unknown layer/initializer kwargs when loading models across Keras 3 versions."""
    try:
        from keras.src.initializers.random_initializers import GlorotUniform
        from keras.src.layers.layer import Layer

        unknown_kwargs = {
            "input_axes",
            "output_axes",
            "quantization_config",
            "renorm",
            "renorm_clipping",
            "renorm_momentum",
        }

        if not getattr(Layer.__init__, "_freshsight_patched", False):
            orig_layer_init = Layer.__init__

            def _compat_layer_init(self, *args, **kwargs):
                for key in unknown_kwargs:
                    kwargs.pop(key, None)
                return orig_layer_init(self, *args, **kwargs)

            _compat_layer_init._freshsight_patched = True  # type: ignore[attr-defined]
            Layer.__init__ = _compat_layer_init

        if not getattr(GlorotUniform.__init__, "_freshsight_patched", False):
            orig_glorot_init = GlorotUniform.__init__

            def _compat_glorot_init(self, *args, **kwargs):
                for key in unknown_kwargs:
                    kwargs.pop(key, None)
                return orig_glorot_init(self, *args, **kwargs)

            _compat_glorot_init._freshsight_patched = True  # type: ignore[attr-defined]
            GlorotUniform.__init__ = _compat_glorot_init
    except Exception:
        pass


_apply_keras_compat_patch()

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
    return keras.Model(inputs, [feat, y, outputs], name="gradcam_model")


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
    def gradcam_step(
        image_tensor: tf.Tensor, target_idx: tf.Tensor
    ) -> tuple[tf.Tensor, tf.Tensor, tf.Tensor, tf.Tensor]:
        with tf.GradientTape() as tape:
            conv, gap_feat, preds = grad_model(image_tensor, training=False)
            if isinstance(conv, (list, tuple)):
                conv = conv[0]
            if isinstance(gap_feat, (list, tuple)):
                gap_feat = gap_feat[0]
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
        return heat, resolved_idx, preds[0], gap_feat[0]

    return predict_batch, gradcam_step


def run_gradcam(
    rgb01: np.ndarray, class_idx: int | None = None
) -> tuple[np.ndarray, int, np.ndarray, np.ndarray]:
    tensor = tf.convert_to_tensor(rgb01[None], dtype=tf.float32)
    idx_tensor = tf.constant(-1 if class_idx is None else int(class_idx), dtype=tf.int32)
    heat, resolved_idx, preds, gap_feat = state["gradcam_fn"](tensor, idx_tensor)
    return (
        np.asarray(heat.numpy(), dtype=np.float32),
        int(resolved_idx.numpy()),
        np.asarray(preds.numpy(), dtype=np.float32),
        np.asarray(gap_feat.numpy(), dtype=np.float32),
    )


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
    batch = np.stack(
        [
            np.asarray(
                variant.convert("RGB").resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR),
                dtype=np.float32,
            )
            / 255.0
            for variant in variants
        ]
    )
    preds = state["predict_fn"](tf.convert_to_tensor(batch, dtype=tf.float32)).numpy()
    mean_p = preds.mean(axis=0)
    best_view = preds[preds.max(axis=1).argmax()]
    combined = 0.55 * mean_p + 0.45 * best_view
    return combined / max(float(combined.sum()), 1e-8)


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

    load_ood_assets(state)
