#!/bin/bash

cd "$(dirname "$0")"

echo "=========================================="
echo "  加油卡企业分摊分析工具 - 后端服务"
echo "=========================================="
echo ""

if [ ! -d "venv" ]; then
    echo "首次运行，正在创建虚拟环境..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo ""
echo "启动后端服务 (端口: 5001)..."
echo "API 文档: http://localhost:5001/api/health"
echo ""

cd backend
python app.py
