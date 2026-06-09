#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "==> 检查 Python 环境..."
python3 --version

if [ ! -d "venv" ]; then
    echo "==> 创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "==> 安装依赖..."
pip install -r requirements.txt

echo "==> 启动服务..."
export PYTHONPATH="$(pwd)"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
