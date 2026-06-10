#!/bin/bash

# ============================================================
# 反应热安全预警系统 - 快速启动脚本
# 用途：从空目录一键启动完整开发环境
# ============================================================

set -e

echo "============================================"
echo "  反应热安全预警系统 - 快速启动"
echo "============================================"
echo ""

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js 18+ 版本"
    echo "   下载地址: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d. -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  检测到 Node.js 版本过低 (v$NODE_VERSION)，建议使用 18+"
fi

echo "✅ Node.js 版本检测通过: $(node -v)"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
    echo ""
fi

echo "🚀 启动开发服务器..."
echo "   - 前端地址: http://localhost:5173"
echo "   - 后端地址: http://localhost:3001"
echo "   - API 代理: /api -> http://localhost:3001"
echo ""
echo "💡 第一份样例位置: samples/weighing_success.csv"
echo "   更多样例文件在 samples/ 目录下"
echo ""
echo "📋 快速测试 curl 命令:"
echo "   curl http://localhost:3001/api/health"
echo "   curl http://localhost:3001/api/weighing/list"
echo ""
echo "按 Ctrl+C 停止服务"
echo "============================================"
echo ""

npm run dev
