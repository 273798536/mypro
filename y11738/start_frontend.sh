#!/bin/bash

cd "$(dirname "$0")/frontend"

echo "=========================================="
echo "  加油卡企业分摊分析工具 - 前端页面"
echo "=========================================="
echo ""
echo "前端页面地址: http://localhost:8080"
echo "请确保后端服务已启动 (端口: 5001)"
echo ""

python3 -m http.server 8080
