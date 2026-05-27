#!/bin/bash

echo "========================================"
echo "  外汇敞口限额监控 API 启动脚本"
echo "========================================"

if [ ! -d "venv" ]; then
    echo ""
    echo "[1/4] 创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

echo ""
echo "[2/4] 安装依赖..."
pip install -r requirements.txt -q

if [ ! -f "forex_exposure.db" ]; then
    echo ""
    echo "[3/4] 初始化示例数据..."
    python init_data.py
else
    echo ""
    echo "[3/4] 数据库已存在，跳过数据初始化"
fi

echo ""
echo "[4/4] 启动 API 服务..."
echo ""
echo "API 文档地址: http://localhost:8000/docs"
echo "按 Ctrl+C 停止服务"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
