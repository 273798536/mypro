#!/usr/bin/env python3
"""负采样任务追踪 - 命令行入口"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from neg_sample_tracker.cli import main

if __name__ == "__main__":
    main()
