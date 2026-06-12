#!/bin/bash

# 海底地形剖面课堂 - 快速启动脚本
# 从空目录跑通全流程
# 使用方法: bash scripts/quick-start.sh

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║     海底地形剖面课堂 - 快速启动指南          ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

STEP=1

echo ""
echo -e "${YELLOW}[$STEP] 检查 Node.js 环境${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}  ✓ Node.js 版本: $(node -v)${NC}"
else
    echo -e "${RED}  ✗ 未找到 Node.js，请先安装${NC}"
    exit 1
fi

if command -v npm &> /dev/null; then
    echo -e "${GREEN}  ✓ npm 版本: $(npm -v)${NC}"
else
    echo -e "${RED}  ✗ 未找到 npm${NC}"
    exit 1
fi
STEP=$((STEP+1))

echo ""
echo -e "${YELLOW}[$STEP] 安装依赖${NC}"
echo -e "${GREEN}  执行: npm install${NC}"
npm install --no-audit --no-fund
echo -e "${GREEN}  ✓ 依赖安装完成${NC}"
STEP=$((STEP+1))

echo ""
echo -e "${YELLOW}[$STEP] 初始化数据库${NC}"
echo -e "${GREEN}  执行: npm run init${NC}"
npm run init
echo -e "${GREEN}  ✓ 数据库初始化完成${NC}"
STEP=$((STEP+1))

echo ""
echo -e "${YELLOW}[$STEP] 填充示例数据${NC}"
echo -e "${GREEN}  执行: npm run seed${NC}"
npm run seed
echo -e "${GREEN}  ✓ 示例数据填充完成${NC}"
STEP=$((STEP+1))

echo ""
echo -e "${YELLOW}[$STEP] 启动服务（后台运行）${NC}"

if command -v lsof &> /dev/null; then
    if lsof -Pi :3000 -sTCP:LISTEN -t &> /dev/null; then
        echo -e "${YELLOW}  ⚠ 端口3000已被占用，假设服务已在运行${NC}"
    else
        nohup node server.js > /tmp/seabed-server.log 2>&1 &
        echo -e "${GREEN}  ✓ 服务已启动 (PID: $!)${NC}"
    fi
else
    nohup node server.js > /tmp/seabed-server.log 2>&1 &
    echo -e "${GREEN}  ✓ 服务已启动 (PID: $!)${NC}"
fi

echo -e "${GREEN}  等待服务就绪...${NC}"
for i in {1..15}; do
    if curl -s http://localhost:3000/api/health &> /dev/null; then
        echo -e "${GREEN}  ✓ 服务就绪${NC}"
        break
    fi
    sleep 1
    echo -n "  ."
done
echo ""
STEP=$((STEP+1))

echo ""
echo -e "${YELLOW}[$STEP] 生成v2版本潮汐数据${NC}"
curl -s -X POST http://localhost:3000/api/tide-versions/v2 > /dev/null
echo -e "${GREEN}  ✓ v2潮汐数据已生成${NC}"
STEP=$((STEP+1))

echo ""
echo -e "${YELLOW}[$STEP] 运行第一次分析（v1）${NC}"
RESULT1=$(curl -s -X POST http://localhost:3000/api/analysis/runs \
  -H 'Content-Type: application/json' \
  -d '{"runName":"快速启动演示-v1","tideVersion":"v1"}')
RUN1_ID=$(echo "$RESULT1" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).runId))")
echo -e "${GREEN}  ✓ 分析完成，运行ID: $RUN1_ID${NC}"
STEP=$((STEP+1))

echo ""
echo -e "${YELLOW}[$STEP] 运行第二次分析（v2）${NC}"
RESULT2=$(curl -s -X POST http://localhost:3000/api/analysis/runs \
  -H 'Content-Type: application/json' \
  -d '{"runName":"快速启动演示-v2","tideVersion":"v2"}')
RUN2_ID=$(echo "$RESULT2" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).runId))")
echo -e "${GREEN}  ✓ 分析完成，运行ID: $RUN2_ID${NC}"
STEP=$((STEP+1))

echo ""
echo -e "${YELLOW}[$STEP] 生成海事处报告${NC}"
REPORT=$(curl -s -X POST http://localhost:3000/api/reports \
  -H 'Content-Type: application/json' \
  -d "{\"runId\":\"$RUN1_ID\"}")
echo -e "${GREEN}  ✓ 报告已生成${NC}"
STEP=$((STEP+1))

echo ""
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     🎉 系统启动成功，可以开始使用！          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}🌐 前端界面:${NC}  http://localhost:3000"
echo ""
echo -e "${CYAN}📋 常用命令:${NC}"
echo "  npm start          - 启动服务"
echo "  npm run init       - 初始化数据库"
echo "  npm run seed       - 填充示例数据"
echo "  npm run demo       - 运行完整演示"
echo ""
echo -e "${CYAN}📁 项目结构:${NC}"
echo "  data/classroom.db  - SQLite数据库"
echo "  public/            - 前端页面"
echo "  lib/               - 核心分析库"
echo "  scripts/           - 脚本工具"
echo "  server.js          - API服务"
echo ""
echo -e "${CYAN}🧪 试试这些:${NC}"
echo "  1. 浏览器打开 http://localhost:3000"
echo "  2. 查看地形剖面图"
echo "  3. 对比v1/v2潮汐版本的越界差异"
echo "  4. 查看数据缺口（养殖日志缺失、风浪预报晚到）"
echo "  5. 生成海事处报告，看证据链"
echo ""
