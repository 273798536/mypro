#!/bin/bash

echo "========================================="
echo "水务抢修材料权限追责台账服务 - 启动脚本"
echo "========================================="

echo ""
echo "[1/4] 检查 Python 环境..."
python3 --version

echo ""
echo "[2/4] 安装依赖..."
pip3 install -r requirements.txt

echo ""
echo "[3/4] 复制环境变量配置..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "已创建 .env 文件"
fi

echo ""
echo "[4/4] 启动服务..."
echo "服务地址: http://localhost:8000"
echo "API 文档: http://localhost:8000/docs"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000
