#!/bin/bash
set -e

echo "========================================"
echo "  酒店前台夜审验收回放链路服务"
echo "========================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "安装依赖..."
pip install -q -r requirements.txt

echo "初始化数据库..."
python3 -c "
from app.database import engine, Base
from app.models import *
Base.metadata.create_all(bind=engine)
print('数据库初始化完成')
"

echo ""
echo "启动服务..."
echo "API文档: http://localhost:8000/docs"
echo ""

exec python3 main.py
