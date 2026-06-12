#!/bin/bash
set -e

echo "================================"
echo "港口拖轮潮窗 API - 前端启动"
echo "================================"

cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
  echo "[1/2] 安装前端依赖..."
  npm install --registry https://registry.npmmirror.com
fi

echo "[2/2] 启动前端服务 (端口 5173)..."
echo "      访问 http://localhost:5173"
echo "      先启动后端（另一个终端运行 ./start-backend.sh）"
echo ""

npm run dev
