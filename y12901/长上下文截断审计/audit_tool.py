#!/usr/bin/env python3
"""长上下文截断审计工具 - 入口脚本

直接运行这个文件就能用，比如:
  python audit_tool.py --help
  python audit_tool.py demo
  python audit_tool.py audit -i samples/old_records.csv -o result.xlsx
"""

import sys
import os
from pathlib import Path

src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

from context_truncation_audit.cli import cli

if __name__ == "__main__":
    cli()
