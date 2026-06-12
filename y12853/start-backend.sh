#!/bin/bash
set -e

echo "================================"
echo "港口拖轮潮窗 API - 后端启动"
echo "================================"

cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
  echo "[1/3] 创建 Python 虚拟环境..."
  python3 -m venv venv
fi

source venv/bin/activate

echo "[2/3] 安装依赖..."
pip install --upgrade pip
pip install -r requirements.txt

echo "[3/3] 启动后端服务 (端口 8000)..."
echo "      API文档: http://localhost:8000/docs"
echo "      首次使用: 打开前端 http://localhost:5173/ → 示例数据 → 一键生成"
echo "                  或 curl -X POST http://localhost:8000/api/v1/example/seed"
echo ""

export PYTHONPATH="$(pwd)"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
