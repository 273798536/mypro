#!/bin/bash
cd "$(dirname "$0")"

echo "=========================================="
echo "  代码审查误判回放系统 - 前端启动"
echo "=========================================="

if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo ""
echo "🚀 启动开发服务器..."
echo "🌐 访问地址: http://localhost:3000"
echo ""
echo "请确保后端服务已启动 (http://localhost:8000)"
echo "按 Ctrl+C 停止服务"
echo "=========================================="

npm start
