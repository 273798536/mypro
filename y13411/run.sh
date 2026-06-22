#!/bin/bash
set -e
cd "$(dirname "$0")/backend"

PYTHON_BIN=${PYTHON_BIN:-python3}

echo "=== 微分方程参数沙盘 - 启动脚本"
echo ""

if [ ! -d "venv" ]; then
  echo "[1/3] 创建 Python 虚拟环境..."
  $PYTHON_BIN -m venv venv
fi

echo "[2/3] 安装/更新依赖..."
source venv/bin/activate
pip install --upgrade pip >/dev/null 2>&1
pip install -r requirements.txt

echo "[3/3] 启动服务..."
echo ""
echo "服务启动后，请在浏览器中打开:  http://localhost:8000"
echo "API 文档地址:  http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

python main.py
