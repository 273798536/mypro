#!/usr/bin/env python3
"""启动Web看板 - python start.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == "__main__":
    print("=" * 60)
    print("📊 知识库召回指标看板")
    print("   Web界面: http://127.0.0.1:5000/")
    print("   CLI脚本: python scripts/run_pipeline.py --help")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False)
