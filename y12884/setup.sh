#!/bin/bash
set -e

echo "=============================================="
echo "  海上施工禁区核查系统 - 一键环境配置"
echo "=============================================="

echo ""
echo "[1/4] 检查 Python 环境..."
python3 --version

echo ""
echo "[2/4] 创建虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "虚拟环境创建成功"
else
    echo "虚拟环境已存在"
fi

echo ""
echo "[3/4] 激活虚拟环境并安装依赖..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "[4/4] 初始化数据库..."
python3 database.py

echo ""
echo "=============================================="
echo "  环境配置完成！"
echo ""
echo "  下一步操作："
echo "  1. 执行 ./run_demo.sh 加载样例数据并启动服务"
echo "  2. 或者手动执行："
echo "     source venv/bin/activate"
echo "     python3 sample_data.py  # 加载样例数据"
echo "     python3 app.py          # 启动服务（端口5001）"
echo "=============================================="
