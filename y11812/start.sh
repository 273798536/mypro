#!/bin/bash

echo "========================================"
echo "  门店租金抽成复核 API - 启动脚本"
echo "========================================"

echo ""
echo "1. 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "   安装 npm 依赖..."
    npm install
fi

echo ""
echo "2. 初始化数据库..."
node src/scripts/init-db.js

echo ""
echo "3. 加载样例数据..."
node src/scripts/load-samples.js

echo ""
echo "4. 启动服务..."
echo ""
echo "服务地址: http://localhost:3000"
echo ""
echo "可用命令:"
echo "  npm start          - 启动服务"
echo "  npm run dev        - 开发模式(自动重启)"
echo "  npm test           - 运行完整流程测试"
echo "  npm run init-db    - 重新初始化数据库"
echo "  npm run load-samples - 重新加载样例数据"
echo ""

npm start
