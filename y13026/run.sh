#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -d venv ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f .env ]; then
    cp .env.example .env
fi

echo "启动服务（默认 SQLite，无需额外数据库）..."
echo "API 文档: http://localhost:8000/docs"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
