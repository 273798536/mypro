#!/bin/bash
set -e

echo "========================================"
echo "  客服工单补偿队列服务 - 快速启动脚本"
echo "========================================"

echo ""
echo "[1/7] 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ 请先安装 Docker 和 Docker Compose"
    exit 1
fi
echo "✅ Docker 已安装"

echo ""
echo "[2/7] 启动 PostgreSQL 和 Redis..."
docker-compose up -d

echo ""
echo "[3/7] 等待服务就绪..."
sleep 3

until docker exec compensation-postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "⏳ 等待 PostgreSQL 就绪..."
    sleep 2
done

until docker exec compensation-redis redis-cli ping > /dev/null 2>&1; do
    echo "⏳ 等待 Redis 就绪..."
    sleep 1
done
echo "✅ 数据库服务已就绪"

echo ""
echo "[4/7] 安装 Node.js 依赖..."
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "✅ 依赖已安装"

echo ""
echo "[5/7] 编译 TypeScript..."
npm run build
echo "✅ 编译完成"

echo ""
echo "[6/7] 初始化数据库和测试数据..."
if [ ! -f ".db_initialized" ]; then
    npx ts-node src/database/seed.ts --force
    touch .db_initialized
fi
echo "✅ 数据库已初始化"

echo ""
echo "[7/7] 启动应用服务..."
echo ""
echo "========================================"
echo "  服务启动中，请访问以下地址："
echo "  健康检查: http://localhost:3000/api/v1/health"
echo "  仪表盘统计: http://localhost:3000/api/v1/statistics/dashboard"
echo ""
echo "  测试操作员 (请求头):"
echo "    x-operator-id: operator-001"
echo "    x-operator-name: 测试管理员"
echo "========================================"
echo ""

npm start
