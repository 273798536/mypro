#!/usr/bin/env python3
"""owi 命令行入口"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from offshore_wind_inspection.cli import main

if __name__ == "__main__":
    main()
