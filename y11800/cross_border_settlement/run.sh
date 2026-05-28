#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

if [ -f "settlement.db" ]; then
  rm settlement.db
fi

echo "=== 跨境结算到账裂缝 API 启动中 ==="
echo "Swagger 文档: http://127.0.0.1:8000/docs"
echo ""
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
