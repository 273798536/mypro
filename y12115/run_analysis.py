#!/usr/bin/env python3
"""便捷运行脚本 - 多目标减碳配额优化系统"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from multi_objective_carbon.cli import main

if __name__ == "__main__":
    main()
