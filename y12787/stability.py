#!/usr/bin/env python3
"""
化妆品稳定性台账系统 - 入口脚本
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cosmetic_stability.cli import main

if __name__ == "__main__":
    main()
