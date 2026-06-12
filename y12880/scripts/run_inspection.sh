#!/bin/bash
# ============================================
# 离岸平台设备点检 - 一键跑批脚本
# 使用方法：./scripts/run_inspection.sh [潮汐表CSV] [浮标数据CSV]
# ============================================

set -e

API_BASE="http://localhost:3001/api"

echo "======================================"
echo "  离岸平台设备点检 - 批处理脚本"
echo "======================================"
echo ""

# 检查服务是否启动
echo "检查服务状态..."
if ! curl -s "$API_BASE/health" > /dev/null 2>&1; then
  echo "❌ 后端服务未启动，请先运行 npm run dev"
  exit 1
fi
echo "✅ 服务运行正常"
echo ""

# 1. 导入潮汐表
if [ -f "$1" ]; then
  echo "[1/5] 导入潮汐表数据: $1"
  TIDE_RESULT=$(curl -s -X POST "$API_BASE/import/tide" \
    -F "file=@$1" \
    -F "source=$(basename "$1")")
  TIDE_COUNT=$(echo "$TIDE_RESULT" | grep -o '"count":[0-9]*' | cut -d: -f2)
  BATCH_ID=$(echo "$TIDE_RESULT" | grep -o '"batchId":"[^"]*"' | cut -d'"' -f4)
  echo "      导入记录: $TIDE_COUNT 条"
  echo "      批次ID: $BATCH_ID"
else
  echo "[1/5] 跳过潮汐表导入（未提供文件，使用示例数据）"
  BATCH_ID="batch_2026_06_12"
fi

echo ""

# 2. 导入浮标数据
if [ -f "$2" ]; then
  echo "[2/5] 导入浮标数据: $2"
  BUOY_RESULT=$(curl -s -X POST "$API_BASE/import/buoy" \
    -F "file=@$2" \
    -F "source=$(basename "$2")")
  BUOY_COUNT=$(echo "$BUOY_RESULT" | grep -o '"count":[0-9]*' | cut -d: -f2)
  echo "      导入记录: $BUOY_COUNT 条"
else
  echo "[2/5] 跳过浮标数据导入（使用示例数据）"
fi

echo ""

# 3. 运行点检计算
echo "[3/5] 运行点检计算..."
INSPECT_RESULT=$(curl -s -X POST "$API_BASE/import/run-inspection" \
  -H "Content-Type: application/json" \
  -d "{\"batchId\": \"$BATCH_ID\"}")

CONFLICT_COUNT=$(echo "$INSPECT_RESULT" | grep -o '"conflictCount":[0-9]*' | cut -d: -f2)
RISK_COUNT=$(echo "$INSPECT_RESULT" | grep -o '"riskCount":[0-9]*' | cut -d: -f2)
echo "      数据冲突: $CONFLICT_COUNT 处"
echo "      风险记录: $RISK_COUNT 条"

echo ""

# 4. 风险概览
echo "[4/5] 风险分层概览..."
RISK_OVERVIEW=$(curl -s "$API_BASE/risks/overview?batchId=$BATCH_ID")
HIGH=$(echo "$RISK_OVERVIEW" | grep -o '"high":[0-9]*' | cut -d: -f2)
MEDIUM=$(echo "$RISK_OVERVIEW" | grep -o '"medium":[0-9]*' | cut -d: -f2)
LOW=$(echo "$RISK_OVERVIEW" | grep -o '"low":[0-9]*' | cut -d: -f2)
echo "      高风险: $HIGH 台"
echo "      中风险: $MEDIUM 台"
echo "      低风险: $LOW 台"

echo ""

# 5. 生成报告
echo "[5/5] 生成点检报告..."
REPORT_RESULT=$(curl -s -X POST "$API_BASE/reports/generate" \
  -H "Content-Type: application/json" \
  -d "{\"batchId\": \"$BATCH_ID\", \"format\": \"pdf\"}")

REPORT_ID=$(echo "$REPORT_RESULT" | grep -o '"reportId":"[^"]*"' | cut -d'"' -f4)
REPORT_TITLE=$(echo "$REPORT_RESULT" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
echo "      报告ID: $REPORT_ID"
echo "      报告标题: $REPORT_TITLE"

echo ""
echo "======================================"
echo "  ✅ 点检完成！"
echo "======================================"
echo ""
echo "  访问 http://localhost:5173 查看详情"
echo "  数据管理页: http://localhost:5173/data"
echo "  冲突中心: http://localhost:5173/conflicts"
echo ""
