#!/usr/bin/env python3
"""测试脚本 - 模拟 CLI 调用"""

import sys
sys.path.insert(0, '.')

from crowdpay_frozen.cli import main

if __name__ == "__main__":
    sys.argv = ["crowdpay", "--help"]
    main()
