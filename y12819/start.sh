#!/bin/bash
set -e

echo "=== 动物行为轨迹分析系统 - 快速启动 ==="
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -d "node_modules" ]; then
  echo "[1/3] 安装依赖..."
  npm install
else
  echo "[1/3] 依赖已安装，跳过"
fi

if [ ! -f "data/animal_analysis.db" ]; then
  echo "[2/3] 数据库将在首次启动时自动创建并填充种子数据"
else
  echo "[2/3] 数据库已存在: data/animal_analysis.db"
fi

echo "[3/3] 启动开发服务器..."
echo ""
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

npm run dev
