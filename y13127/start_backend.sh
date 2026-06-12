#!/usr/bin/env bash
set -e

# ============================================================
# 贝叶斯先验参数试算系统 - 一键启动后端脚本
# 使用方法：./start_backend.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
DATA_DIR="$BACKEND_DIR/data"
EXPORT_DIR="$DATA_DIR/exports"

mkdir -p "$DATA_DIR" "$EXPORT_DIR"

cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
  echo "📦 首次启动，创建虚拟环境并安装依赖..."
  python3 -m venv venv
  source venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
else
  source venv/bin/activate
fi

echo ""
echo "🚀 启动贝叶斯先验参数试算后端服务..."
echo "   API 文档:  http://localhost:8000/docs"
echo "   Redoc:     http://localhost:8000/redoc"
echo ""
echo "   前端打开:  $SCRIPT_DIR/frontend/index.html"
echo "   或直接运行: open $SCRIPT_DIR/frontend/index.html"
echo ""

python main.py
