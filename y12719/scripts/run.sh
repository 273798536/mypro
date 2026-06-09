#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=========================================="
echo " 风险价值分位回测系统 - 一键启动"
echo "=========================================="

if [ ! -d ".venv" ]; then
  echo "📦 创建虚拟环境 .venv ..."
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

echo "🔧 安装依赖 ..."
pip install --upgrade pip >/dev/null
pip install -r requirements.txt

echo "🗄  初始化数据库 ..."
python scripts/init_db.py

if [ ! -f "data/sample_data_ready.flag" ]; then
  echo "🧪 生成示例数据并跑通完整流程 ..."
  python scripts/run_demo.py
  touch data/sample_data_ready.flag
fi

echo "🚀 启动 API 服务 (http://127.0.0.1:8000) ..."
echo "   文档地址: http://127.0.0.1:8000/docs"
echo ""
exec uvicorn var_backtest.main:app --host 127.0.0.1 --port 8000 --reload
