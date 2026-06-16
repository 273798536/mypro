#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================"
echo "  指令微调样本配比台 · 启动器"
echo "======================================"
echo ""

if [ ! -d "venv" ]; then
  echo "[1/3] 首次启动，正在创建 Python 虚拟环境..."
  python3 -m venv venv
fi

source venv/bin/activate

echo "[2/3] 检查/安装依赖..."
pip install -q -r requirements.txt

echo "[3/3] 启动看板（Streamlit）..."
echo ""
echo "访问地址将自动弹出，默认 http://localhost:8501"
echo "提示：首次使用请进入『🧩 示例数据 / 初始化』页签一键生成示例数据"
echo ""

exec streamlit run app.py --server.headless false --server.port 8501
