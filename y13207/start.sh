#!/bin/bash

cd "$(dirname "$0")"

echo "========================================"
echo "  录音棚时码清单归档系统"
echo "========================================"
echo ""

if [ ! -d "venv" ]; then
    echo "首次运行，正在创建虚拟环境..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

PORT=${PORT:-8080}

echo ""
echo "系统启动中..."
echo "访问地址: http://localhost:$PORT"
echo ""
echo "提示：按 Ctrl+C 停止服务"
echo "数据自动保存在 data/ 目录，服务重启不丢失"
echo ""

python3 app.py
