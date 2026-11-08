"""Seed idioms from datn/data/raw/vivid into the app database."""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

SEED = Path(__file__).resolve().parents[1] / "backend" / "scripts" / "seed_idioms.py"

if __name__ == "__main__":
    sys.argv = [str(SEED), *sys.argv[1:]]
    runpy.run_path(str(SEED), run_name="__main__")
