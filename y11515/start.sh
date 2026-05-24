#!/bin/bash

echo "========================================"
echo "水务抢修材料异常回执状态机 API"
echo "========================================"
echo ""

echo "检查 Python 环境..."
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 Python3，请先安装 Python 3.8+"
    exit 1
fi

echo "安装依赖..."
pip3 install -r requirements.txt
echo ""

echo "启动服务..."
echo "API 文档地址: http://localhost:8000/docs"
echo "Swagger UI: http://localhost:8000/docs"
echo "ReDoc: http://localhost:8000/redoc"
echo ""

python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
