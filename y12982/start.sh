#!/bin/bash

set -e

echo "=========================================="
echo "  图数据库关系巡检 - 一键启动脚本"
echo "=========================================="
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "步骤 1/4: 检查并安装依赖..."
if [ ! -d "node_modules" ]; then
  echo "  正在安装 npm 依赖..."
  npm install
  echo "  ✓ 依赖安装完成"
else
  echo "  ✓ 依赖已存在，跳过安装"
fi

echo ""
echo "步骤 2/4: 初始化数据库..."
if [ ! -f "db/inspection.db" ]; then
  node scripts/init-db.js
  echo "  ✓ 数据库初始化完成"
else
  echo "  ✓ 数据库已存在，跳过初始化"
fi

echo ""
echo "步骤 3/4: 植入示例数据..."
DB_COUNT=$(node -e "
const Database = require('better-sqlite3');
const db = new Database('./db/inspection.db');
const count = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
console.log(count);
" 2>/dev/null || echo "0")

if [ "$DB_COUNT" = "0" ]; then
  node scripts/seed-data.js
  echo "  ✓ 示例数据植入完成"
else
  echo "  ✓ 数据已存在，跳过植入"
fi

echo ""
echo "步骤 4/4: 启动服务..."
echo ""
echo "=========================================="
echo "  服务即将启动，请稍候..."
echo "  前端地址: http://localhost:3000"
echo "  API路径:  /api/"
echo "  按 Ctrl+C 停止服务"
echo "=========================================="
echo ""

exec node server.js
