#!/usr/bin/env python3
"""
分段回归边界校验工具 - 快速入口脚本

标准用法（推荐，安装后）:
    pip install -e .
    segment-check --help

直接调用（无需安装）:
    python3 segment_check_runner.py --help
    python3 segment_check_runner.py demo
    python3 segment_check_runner.py anomaly
    python3 segment_check_runner.py report
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from segment_check.cli import main

if __name__ == "__main__":
    main()
