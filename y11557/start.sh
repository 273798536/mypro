#!/bin/bash

echo "======================================"
echo "农资门店配送重试补偿队列API 启动脚本"
echo "======================================"

echo ""
echo "1. 安装依赖..."
pip install -r requirements.txt

echo ""
echo "2. 启动服务..."
echo "服务将在 http://localhost:8000 启动"
echo "API文档: http://localhost:8000/docs"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
