#!/bin/bash

echo "========================================"
echo "银行网点排班验收回放链路服务"
echo "========================================"

echo ""
echo "[1/3] 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到python3，请先安装Python 3.8+"
    exit 1
fi
echo "Python版本: $(python3 --version)"

echo ""
echo "[2/3] 安装依赖..."
pip3 install -r requirements.txt

echo ""
echo "[3/3] 启动服务..."
echo "API文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
