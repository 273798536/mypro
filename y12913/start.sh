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
from app.services.safety_service import init_default_safety_rules
from app.services.sample_service import generate_all_samples
init_db()
db = SessionLocal()
try:
    init_default_safety_rules(db, force_sync=True)
    stats = generate_all_samples(db)
    print('生成结果:', stats)
    from app.database import LoraRecord
    bad = db.query(LoraRecord).filter(LoraRecord.lora_id.like('LORA-F%')).all()
    for r in bad:
        print(f'  坏样本 {r.lora_id} safety={r.safety_check_result} merge={r.merge_result}')
finally:
    db.close()
"
        echo ""
        echo "========================================"
        echo " 🚀 启动服务: http://${HOST}:${PORT}"
        echo "========================================"
        echo ""
        echo "📌 第一份样例位置："
        echo "   - 打开浏览器访问 http://${HOST}:${PORT}"
        echo "   - 默认进入【灰度对比·日常入口】，可选择版本对比"
        echo "   - 侧边栏【台账列表】查看全部 12 条样例"
        echo "   - 数据库文件: data/lora_ledger.db (SQLite，可直接用 DB Browser 打开只读查询)"
        echo "   - 导出文件目录: exports/"
        echo ""
        echo "📌 常用核心命令（新开终端）："
        echo "   source .venv/bin/activate"
        echo "   python3 verify.py                 # 重新跑自动化验收（6项全通过才返回0）"
        echo "   python3 -c \"from app.database import init_db, SessionLocal; from app.services.safety_service import init_default_safety_rules; from app.services.sample_service import generate_all_samples; init_db(); db=SessionLocal(); init_default_safety_rules(db, force_sync=True); print(generate_all_samples(db))\""
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
