"""命令行入口 - python -m search_index_audit"""

from .cli import main
import sys

if __name__ == "__main__":
    sys.exit(main())
