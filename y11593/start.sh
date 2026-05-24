#!/bin/bash

echo "========================================"
echo "仓内波次拣货验收回放链路服务"
echo "========================================"

echo ""
echo "步骤1: 安装依赖..."
pip install -r requirements.txt

echo ""
echo "步骤2: 生成测试数据..."
python cli.py generate-test-data --output ./sample_data --wave-count 3 --items-per-wave 5

echo ""
echo "步骤3: 启动API服务..."
echo "服务将在 http://localhost:8000 启动"
echo "API文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

python main.py
