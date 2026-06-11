#!/bin/bash
set -e

echo "=========================================="
echo "  血液检验复测建议系统 - 一键启动脚本"
echo "=========================================="
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "[1/5] 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 python3，请先安装 Python 3.8+"
    exit 1
fi
echo "  ✓ Python版本: $(python3 --version)"

echo ""
echo "[2/5] 创建虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "  ✓ 虚拟环境创建完成"
else
    echo "  ✓ 虚拟环境已存在"
fi

echo ""
echo "[3/5] 激活虚拟环境并安装依赖..."
source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
echo "  ✓ 依赖安装完成"

echo ""
echo "[4/5] 初始化数据库..."
python3 -c "from database import init_db; init_db(); print('  ✓ 数据库初始化完成')"

echo ""
echo "[5/5] 启动服务 (端口 5001)..."
echo ""
echo "=========================================="
echo "  服务启动中，请访问："
echo "  健康检查: http://localhost:5001/api/health"
echo "  分组统计(日常入口): http://localhost:5001/api/statistics/groups"
echo ""
echo "  按 Ctrl+C 停止服务"
echo "=========================================="
echo ""

python3 app.py --debug
