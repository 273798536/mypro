#!/bin/bash
set -e

echo "=========================================="
echo "  巡演耳返版本复核系统 - 一键安装脚本"
echo "=========================================="
echo ""

# 检查Node.js版本
echo "📋 检查环境..."
NODE_VERSION=$(node -v 2>/dev/null || echo "not found")
if [ "$NODE_VERSION" = "not found" ]; then
    echo "❌ 错误: 未安装 Node.js，请先安装 Node.js 18.x 或更高版本"
    exit 1
fi
echo "✅ Node.js 版本: $NODE_VERSION"

NPM_VERSION=$(npm -v 2>/dev/null || echo "not found")
echo "✅ npm 版本: $NPM_VERSION"
echo ""

# 安装根目录依赖
echo "📦 安装根目录依赖..."
npm install --no-audit --no-fund
echo "✅ 根目录依赖安装完成"
echo ""

# 安装后端依赖
echo "📦 安装后端依赖..."
cd server
npm install --no-audit --no-fund
echo "✅ 后端依赖安装完成"
echo ""

# 生成Prisma Client
echo "🔧 生成 Prisma Client..."
npx prisma generate
echo "✅ Prisma Client 生成完成"
echo ""

# 初始化数据库
echo "🗄️  初始化数据库..."
npx prisma migrate dev --name init --skip-generate
echo "✅ 数据库初始化完成"
echo ""

# 填充模拟数据
echo "🌱 填充模拟数据..."
npm run seed
echo "✅ 模拟数据填充完成"
echo ""

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../client
npm install --no-audit --no-fund
echo "✅ 前端依赖安装完成"
echo ""

echo "=========================================="
echo "🎉  安装完成！"
echo "=========================================="
echo ""
echo "📖 快速启动命令："
echo "   同时启动前后端: npm run dev"
echo "   仅启动后端:     npm run dev:server"
echo "   仅启动前端:     npm run dev:client"
echo ""
echo "🌐 访问地址："
echo "   前端: http://localhost:5173"
echo "   后端API: http://localhost:3001/api"
echo "   API文档: http://localhost:3001/api/docs"
echo ""
echo "📋 核心页面验证："
echo "   1. 巡演看板页   - /"
echo "   2. 曲目列表页   - /tracks"
echo "   3. 曲目详情页   - /tracks/:id"
echo "   4. 文件上传页   - /upload"
echo "   5. CSV导出页    - /export"
echo ""
