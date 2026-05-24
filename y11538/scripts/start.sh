#!/bin/bash

echo "=========================================="
echo "  企业培训签到验收回放链路服务"
echo "=========================================="

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
fi

echo "激活虚拟环境..."
source venv/bin/activate

echo "安装依赖..."
pip install -r requirements.txt

echo ""
echo "启动服务..."
echo "服务地址: http://0.0.0.0:5001"
echo "API前缀: /api"
echo ""
echo "健康检查: curl http://localhost:5001/api/health"
echo ""

python app.py
