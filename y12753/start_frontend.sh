#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/frontend"
if [ ! -d "node_modules" ]; then
  echo "[前端] 首次运行，正在安装依赖..."
  npm install
fi
echo "[前端] 启动服务 http://localhost:5173  (Ctrl+C 退出)"
npm run dev
