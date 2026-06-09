#!/bin/bash
set -e
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
    echo "[setup] 创建虚拟环境..."
    python3 -m venv venv
fi

echo "[setup] 激活虚拟环境并安装依赖..."
source venv/bin/activate
pip install -q -r requirements.txt

echo "[setup] 启动服务 http://localhost:5001"
echo "        风控工作台: http://localhost:5001/"
echo "        学生查看:   http://localhost:5001/student"
python app.py
