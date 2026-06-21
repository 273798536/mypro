#!/bin/bash
set -e

cd "$(dirname "$0")/backend"

echo "=== 后端：检查依赖 ==="
if [ ! -d "venv" ]; then
  echo "创建虚拟环境..."
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

echo "=== 启动后端（8000 端口）==="
exec uvicorn main:app --host 127.0.0.1 --port 8000 --reload
