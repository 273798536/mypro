#!/usr/bin/env python3
"""
欧拉路径巡检工具 - 可执行入口
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from euler_path_inspector.cli.main import main

if __name__ == "__main__":
    sys.exit(main())
