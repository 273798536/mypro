#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"
if [ ! -d ".venv" ]; then
  echo "[后端] 首次运行，正在创建虚拟环境并安装依赖..."
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
else
  source .venv/bin/activate
fi
echo "[后端] 启动服务 http://localhost:8000  (Ctrl+C 退出)"
echo "[后端] 首次启动将自动初始化示例数据"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
