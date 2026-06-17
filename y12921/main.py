#!/usr/bin/env python3
"""训练任务成本分摊 —— 命令行入口。

用法见：python main.py --help
"""
import sys

from costalloc.cli import main

if __name__ == "__main__":
    sys.exit(main())
