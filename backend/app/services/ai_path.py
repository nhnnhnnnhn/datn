"""Put `datn/` on sys.path so `import ai...` works when running the backend."""

from __future__ import annotations

import sys
from pathlib import Path

_DATN_ROOT = Path(__file__).resolve().parents[3]  # .../datn


def ensure_ai_on_path() -> Path:
    root = str(_DATN_ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)
    return _DATN_ROOT
