#!/bin/bash

echo "============================================"
echo "  校园饭卡沉淀金后端服务 - 启动脚本"
echo "============================================"
echo ""

PROJECT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$PROJECT_DIR"

echo "检查虚拟环境..."
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

echo "激活虚拟环境..."
source venv/bin/activate

echo "安装依赖..."
pip install -r requirements.txt -q

echo "启动服务 (端口 8000)..."
echo ""
echo "接口文档: http://localhost:8000/docs"
echo "健康检查: http://localhost:8000/health"
echo ""

python main.py
