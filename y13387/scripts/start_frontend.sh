#!/bin/bash
set -e

cd "$(dirname "$0")/frontend"

echo "=== 前端：检查依赖 ==="
if [ ! -d "node_modules" ]; then
  echo "安装 node_modules..."
  npm install --silent
fi

echo "=== 启动前端（5173 端口）==="
exec npm run dev
