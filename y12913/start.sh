#!/bin/bash
# ============================================================
# LoRA 合并版本台账 · 一键启动脚本
# 从空目录跑通全流程的完整步骤
# ============================================================
set -e

cd "$(dirname "$0")"

echo "========================================"
echo " LoRA 合并版本台账 · 启动器"
echo "========================================"

# 1. 创建必要目录（首次运行时）
mkdir -p app/static app/api app/services samples exports data

# 2. 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 python3，请先安装 Python 3.9+"
    exit 1
fi

PYVER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "✅ Python 版本: $PYVER"

# 3. 创建虚拟环境（可选）
if [ ! -d ".venv" ]; then
    echo "📦 创建虚拟环境 .venv ..."
    python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

# 4. 安装依赖
echo "📦 安装依赖 (requirements.txt) ..."
pip install --upgrade pip > /dev/null
pip install -r requirements.txt

# 5. 启动选项
echo ""
echo "请选择启动模式："
echo "  1) 生成样例数据 + 启动服务 (推荐首次使用)"
echo "  2) 仅启动服务 (已有数据)"
echo "  3) 运行自动化验证脚本 (验收用)"
read -rp "输入选项 [1-3，默认1]: " CHOICE
CHOICE=${CHOICE:-1}

HOST="0.0.0.0"
PORT="8765"

case $CHOICE in
    1)
        echo ""
        echo "🧪 生成样例数据（正常/边界/坏样本）..."
        python3 -c "
from app.database import init_db, SessionLocal
from app.services.sample_service import generate_all_samples
init_db()
db = SessionLocal()
try:
    stats = generate_all_samples(db)
    print('生成结果:', stats)
finally:
    db.close()
"
        echo ""
        echo "========================================"
        echo " 🚀 启动服务: http://${HOST}:${PORT}"
        echo "========================================"
        echo ""
        echo "📌 第一份样例位置："
        echo "   - 样例生成后直接看 台账列表 页面"
        echo "   - 数据库文件: data/lora_ledger.db (SQLite)"
        echo "   - 导出文件目录: exports/"
        echo ""
        echo "按 Ctrl+C 停止服务"
        uvicorn main:app --host ${HOST} --port ${PORT} --reload
        ;;
    2)
        echo ""
        echo "========================================"
        echo " 🚀 启动服务: http://${HOST}:${PORT}"
        echo "========================================"
        uvicorn main:app --host ${HOST} --port ${PORT} --reload
        ;;
    3)
        echo ""
        echo "🧪 运行自动化验证脚本 ..."
        python3 verify.py
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac
