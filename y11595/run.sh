#!/bin/bash
set -e

echo "=========================================="
echo "  客服知识库发布异常回执状态机服务"
echo "=========================================="
echo ""

echo "[1/3] 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装Python3"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✅ Python 版本: $PYTHON_VERSION"

echo ""
echo "[2/3] 创建虚拟环境并安装依赖..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "✅ 依赖安装完成"

echo ""
echo "[3/3] 启动服务..."
echo ""
echo "服务将在以下地址启动:"
echo "  - 主页面: http://localhost:8000"
echo "  - API文档: http://localhost:8000/docs"
echo "  - ReDoc: http://localhost:8000/redoc"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

python -m app.main
