"""Make the repository root importable in every test-run mode.

Covers `pytest`, `python -m pytest` and direct `python3 core/tests/test_core.py`.
"""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
