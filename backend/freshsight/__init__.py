"""FreshSight inference backend package.

Imports ``onnxruntime`` before any TensorFlow/Keras submodule to prevent native
DLL load-order clashes on Windows.
"""

from __future__ import annotations

import onnxruntime as _ort  # noqa: F401
