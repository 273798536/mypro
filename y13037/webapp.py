"""Streamlit Web 入口 — 放在项目根目录，保证 `streamlit run webapp.py` 能直接跑。"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from hk_tax_recon.webapp import *  # noqa: F401,F403
