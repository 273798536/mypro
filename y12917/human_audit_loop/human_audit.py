#!/usr/bin/env python3
"""人审反馈闭环助手 - 顶层入口

直接运行示例（零参数即可跑通）：
    python3 human_audit.py run

追踪一条异常记录：
    python3 human_audit.py trace --id NEW000023

看帮助：
    python3 human_audit.py --help
    python3 human_audit.py run --help
    python3 human_audit.py trace --help
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from cli.main import main

if __name__ == "__main__":
    main()
