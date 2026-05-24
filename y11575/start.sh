#!/bin/bash

echo "=== 外协加工对账异常回执状态机 API 启动脚本"
echo ""

# 创建必要目录
mkdir -p data uploads logs

# 安装依赖
echo "正在安装依赖..."
npm install

# 编译TypeScript
echo "正在编译..."
npm run build

# 启动服务
echo "启动服务..."
npm run dev
