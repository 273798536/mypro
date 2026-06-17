#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "======================================"
echo "  工具参数 Schema 审计系统 - 启动脚本"
echo "======================================"

if [ ! -d ".venv" ]; then
    echo "[1/3] 检测到虚拟环境不存在，正在创建..."
    python3 -m venv .venv
    echo "[1/3] 虚拟环境创建完成"
else
    echo "[1/3] 虚拟环境已存在，跳过创建"
fi

echo "[2/3] 激活虚拟环境并安装依赖..."
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "[2/3] 依赖安装完成"

echo "[3/3] 启动 Streamlit 审计面板..."
echo ""
echo "  访问地址: http://localhost:8501"
echo "  第一份样例位置: data/sample_schema_records.json"
echo "  停止服务: Ctrl+C"
echo ""

streamlit run app.py --server.port=8501 --server.headless=true
