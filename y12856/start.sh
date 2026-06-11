#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "============================================="
echo "  潜点能见度记录台 - 一键启动脚本"
echo "============================================="

if [ ! -d "venv" ]; then
    echo "[1/5] 创建 Python 虚拟环境..."
    python3 -m venv venv
else
    echo "[1/5] 虚拟环境已存在，跳过"
fi

echo "[2/5] 激活虚拟环境并安装依赖..."
source venv/bin/activate
pip install -q -r requirements.txt

echo "[3/5] 初始化数据库..."
python3 database.py

if [ ! -f "dive_visibility.db" ] || [ "$(python3 -c "import sqlite3; c=sqlite3.connect('dive_visibility.db'); print(c.execute('SELECT COUNT(*) FROM dive_sites').fetchone()[0])")" = "0" ]; then
    echo "[4/5] 载入测试数据..."
    python3 seed_data.py
else
    echo "[4/5] 数据库已有数据，跳过测试数据载入（如需重置请删除 dive_visibility.db）"
fi

echo "[5/5] 启动后端服务 (端口 5001)..."
echo ""
echo "============================================="
echo "  服务已启动！"
echo "  前端页面: http://localhost:5001/"
echo "  API 地址:  http://localhost:5001/api/health"
echo "============================================="
echo ""
echo "其他终端可用以下命令跑完整流程："
echo "  bash demo_curl.sh        # curl 示例"
echo "  python3 demo_full.py     # Python 全流程示例"
echo ""

python3 app.py
