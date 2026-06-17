#!/bin/bash

echo "🚀 启动病历问答灰度对比系统"
echo ""

cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，复制 .env.example..."
    cp .env.example .env
fi

if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
fi

if [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo "📦 安装子项目依赖..."
    npm install
fi

echo ""
echo "🗄️  检查数据库连接..."
cd server
npx prisma db push --accept-data-loss 2>/dev/null || true

echo ""
echo "🌱 初始化种子数据..."
npx ts-node src/scripts/seed.ts

cd ..

echo ""
echo "🧪 运行业务场景测试..."
npm run test:scenario

echo ""
echo "🎉 环境准备完成！"
echo ""
echo "📋 启动命令："
echo "   同时启动前后端: npm run dev"
echo "   仅启动后端:   npm run dev:server"
echo "   仅启动前端:   npm run dev:client"
echo ""
echo "📊 其他命令："
echo "   运行场景测试: npm run test:scenario"
echo "   重新初始化:   npm run db:setup"
echo ""
echo "🌐 访问地址："
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:3001"
echo ""

read -p "是否立即启动服务？(y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run dev
fi
