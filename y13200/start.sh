#!/bin/bash
set -e

echo "=========================================="
echo "  巡演耳返版本复核系统 - 启动脚本"
echo "=========================================="
echo ""

# 检查数据库是否存在
if [ ! -f "server/prisma/dev.db" ]; then
    echo "⚠️  数据库不存在，正在初始化..."
    cd server
    npx prisma migrate dev --name init --skip-generate
    npm run seed
    cd ..
    echo "✅ 数据库初始化完成"
    echo ""
fi

echo "🚀 启动开发服务..."
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:3001/api"
echo ""

npm run dev
