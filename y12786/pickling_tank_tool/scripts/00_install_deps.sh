#!/bin/bash
set -e

echo "========================================="
echo " 酸洗槽浓度补加质检系统 - 安装依赖"
echo "========================================="

cd "$(dirname "$0")/.."

if ! command -v python3 &> /dev/null; then
    echo "❌ 未检测到 python3，请先安装 Python 3.8+"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(sys.version_info[1])')
if [ "$PYTHON_VERSION" -lt 8 ]; then
    echo "❌ Python 版本过低，需要 3.8+，当前版本: 3.$PYTHON_VERSION"
    exit 1
fi

echo "📦 创建虚拟环境..."
python3 -m venv venv
source venv/bin/activate

echo "📦 安装 Python 依赖..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo ""
echo "✅ 依赖安装完成！"
echo ""
echo "下一步操作："
echo "  1. 启动服务: bash scripts/01_start_server.sh"
echo "  2. 导入样例数据: bash scripts/02_import_sample.sh"
echo "  3. 完整流程演示: bash scripts/03_full_demo.sh"
