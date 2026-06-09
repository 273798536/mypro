#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "======================================"
echo "  缓冲液配方计算器 - 一键启动"
echo "======================================"
echo ""

echo "[1/2] 启动后端 (端口 8000)..."
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
else
  source .venv/bin/activate
fi
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "      后端 PID: $BACKEND_PID"

sleep 2

echo "[2/2] 启动前端 (端口 5173)..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run dev &
FRONTEND_PID=$!
echo "      前端 PID: $FRONTEND_PID"

echo ""
echo "✔  服务全部启动"
echo "   访问地址:  http://localhost:5173"
echo "   后端文档:  http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"

cleanup() {
  echo ""
  echo "正在停止服务..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID 2>/dev/null
  wait $FRONTEND_PID 2>/dev/null
  echo "已停止"
}
trap cleanup EXIT INT TERM

wait
