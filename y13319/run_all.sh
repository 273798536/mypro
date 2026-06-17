#!/bin/bash
set +e
LOG=/tmp/vision_install.log
echo "=== 工业视觉指标看板 启动 $(date) ===" | tee -a $LOG

cd /Users/mac/pro/solo/workspaces/y13319
ROOT=$(pwd)

echo "[1/6] 安装后端依赖..." | tee -a $LOG
cd $ROOT/backend && npm install --no-audit --no-fund 2>&1 | tail -10 | tee -a $LOG

echo "[2/6] 安装前端依赖..." | tee -a $LOG
cd $ROOT/frontend && npm install --no-audit --no-fund 2>&1 | tail -10 | tee -a $LOG

echo "[3/6] 初始化示例数据..." | tee -a $LOG
cd $ROOT/backend && node src/seed.js 2>&1 | tee -a $LOG

# 清理旧进程
pkill -f "node src/server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

echo "[4/6] 启动后端服务 :3001..." | tee -a $LOG
cd $ROOT/backend && nohup node src/server.js > /tmp/vision_back.log 2>&1 &
BPID=$!
echo "后端 PID=$BPID" | tee -a $LOG

echo "[5/6] 启动前端服务 :5173..." | tee -a $LOG
cd $ROOT/frontend && nohup npx vite --host 0.0.0.0 --port 5173 > /tmp/vision_front.log 2>&1 &
FPID=$!
echo "前端 PID=$FPID" | tee -a $LOG

echo "[6/6] 等待15秒检查服务..." | tee -a $LOG
sleep 15

echo "" | tee -a $LOG
echo "=== 健康检查 ===" | tee -a $LOG
echo "后端 /api/health: $(curl -s http://localhost:3001/api/health 2>&1)" | tee -a $LOG
echo "前端 HTTP 状态: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/ 2>&1)" | tee -a $LOG
echo "" | tee -a $LOG
echo "后端进程: $(ps aux | grep '[n]ode src/server.js' | head -1)" | tee -a $LOG
echo "前端进程: $(ps aux | grep '[v]ite' | head -1)" | tee -a $LOG
echo "" | tee -a $LOG
echo "✅ 完成！浏览器访问：http://localhost:5173" | tee -a $LOG
echo "后端日志: tail -f /tmp/vision_back.log" | tee -a $LOG
echo "前端日志: tail -f /tmp/vision_front.log" | tee -a $LOG
echo "停止服务: pkill -f 'node src/server.js' ; pkill -f vite" | tee -a $LOG
echo $BPID > /tmp/vision_pids.txt
echo $FPID >> /tmp/vision_pids.txt
