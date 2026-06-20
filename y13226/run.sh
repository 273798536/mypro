#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if ! command -v python3 &> /dev/null; then
    echo "[错误] 未找到 python3，请先安装 Python 3"
    exit 1
fi

echo "=============================================="
echo "  剧场返场曲排期冲突检测"
echo "=============================================="
echo ""

if [ $# -eq 0 ]; then
    python3 run.py
else
    python3 run.py "$@"
fi
