#!/bin/bash

echo "=== 安装前端依赖 ==="
cd frontend
npm install

echo ""
echo "=== 启动前端开发服务器 (端口: 5173) ==="
npm run dev
