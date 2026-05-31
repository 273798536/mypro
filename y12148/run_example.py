#!/usr/bin/env python3
"""运行弹簧疲劳寿命试算示例"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from spring_fatigue.main import run_example

if __name__ == "__main__":
    run_example()
