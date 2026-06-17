#!/bin/bash

cd "$(dirname "$0")"

echo "正在检查 Python 依赖..."
pip install -q -r requirements.txt

echo ""
echo "正在初始化演示数据..."
python seed_data.py

echo ""
echo "启动服务..."
cd app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
