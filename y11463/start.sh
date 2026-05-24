#!/bin/bash

echo "========================================="
echo "  口腔门诊材料验收回放链路服务"
echo "========================================="

if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

echo "激活虚拟环境并安装依赖..."
source venv/bin/activate
pip install -q -r requirements.txt

echo ""
echo "启动服务..."
echo "API文档: http://localhost:8000/docs"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
