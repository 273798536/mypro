#!/bin/bash

echo "========================================="
echo "  会议室占用验收回放链路服务 - 演示"
echo "========================================="

chmod +x start.sh
chmod +x test_api.py

echo ""
echo "步骤1: 启动服务 (后台运行)..."
source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt -q

uvicorn app.main:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &
SERVER_PID=$!
echo "服务PID: $SERVER_PID"

echo ""
echo "步骤2: 等待服务启动..."
sleep 5

echo ""
echo "步骤3: 运行测试脚本..."
python3 test_api.py

echo ""
echo "步骤4: 查看服务日志..."
echo "------------------------"
tail -20 server.log

echo ""
echo "========================================="
echo "演示完成!"
echo ""
echo "服务仍在运行，可访问: http://localhost:8000/docs"
echo "停止服务: kill $SERVER_PID"
echo "========================================="
