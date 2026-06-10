#!/bin/bash
set -e

echo "========================================="
echo " 酸洗槽浓度补加质检系统 - 启动服务"
echo "========================================="

cd "$(dirname "$0")/.."

if [ ! -d "venv" ]; then
    echo "❌ 未检测到虚拟环境，请先运行: bash scripts/00_install_deps.sh"
    exit 1
fi

source venv/bin/activate

echo "🚀 启动 FastAPI 服务 (端口 8000)..."
echo "   API 文档: http://localhost:8000/docs"
echo "   前端界面: http://localhost:8000/static/index.html"
echo "   停止服务: Ctrl+C"
echo ""

cd backend
python main.py
