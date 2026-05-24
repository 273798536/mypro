#!/bin/bash

cd "$(dirname "$0")"
export PYTHONPATH=$(pwd)

echo "=============================================="
echo "线下展会物料重试补偿队列 API"
echo "=============================================="

if [ ! -f "exhibition_material.db" ]; then
    echo "首次运行，初始化数据库..."
    python3 scripts/init_db.py
    echo ""
    echo "导入样例数据..."
    python3 scripts/seed_data.py
    echo ""
    echo "触发脏数据场景..."
    python3 scripts/trigger_bad_data.py
fi

echo ""
echo "启动服务..."
echo "API文档: http://localhost:8000/docs"
echo "仪表盘: http://localhost:8000/api/v1/dashboard"
echo ""

UVICORN_PATH=$(python3 -c "import uvicorn; import os; print(os.path.dirname(uvicorn.__file__))")
if command -v uvicorn &> /dev/null; then
    uvicorn app.main:app --host 0.0.0.0 --port 8000
elif [ -f "/Users/mac/Library/Python/3.9/bin/uvicorn" ]; then
    /Users/mac/Library/Python/3.9/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
else
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
fi
