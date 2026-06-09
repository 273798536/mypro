#!/bin/bash

echo "=== 安装后端依赖 ==="
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

echo ""
echo "=== 启动后端服务 (端口: 8000) ==="
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
