#!/bin/bash

BASE_URL="http://localhost:8000"

echo "========================================"
echo "会议室占用异常回执状态机 API 演示脚本"
echo "========================================"
echo ""

echo "步骤 1: 健康检查"
echo "------------------------"
curl -s "${BASE_URL}/api/health" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 2: 创建批次"
echo "------------------------"
BATCH_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/batches" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2025年5月药监抽查异常批次",
    "description": "包含预约日历、门禁刷卡、取消消息数据",
    "created_by": "行政助理-小王"
  }')
echo "$BATCH_RESPONSE" | python3 -m json.tool
BATCH_ID=$(echo "$BATCH_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "批次ID: ${BATCH_ID}"
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 3: 导入预约日历数据"
echo "------------------------"
curl -s -X POST "${BASE_URL}/api/batches/${BATCH_ID}/import" \
  -F "file=@test_calendar.xlsx" \
  -F "source_type=calendar" \
  -F "uploaded_by=行政助理-小王" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 4: 导入门禁刷卡数据"
echo "------------------------"
curl -s -X POST "${BASE_URL}/api/batches/${BATCH_ID}/import" \
  -F "file=@test_access_card.xlsx" \
  -F "source_type=access_card" \
  -F "uploaded_by=行政助理-小王" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 5: 导入取消消息数据"
echo "------------------------"
curl -s -X POST "${BASE_URL}/api/batches/${BATCH_ID}/import" \
  -F "file=@test_cancel_message.xlsx" \
  -F "source_type=cancel_message" \
  -F "uploaded_by=行政助理-小王" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 6: 查看批次详情"
echo "------------------------"
curl -s "${BASE_URL}/api/batches/${BATCH_ID}" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 7: 获取批次记录列表"
echo "------------------------"
RECORDS_RESPONSE=$(curl -s "${BASE_URL}/api/batches/${BATCH_ID}/records")
echo "$RECORDS_RESPONSE" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 8: 获取第一条记录详情（含原始证据）"
echo "------------------------"
FIRST_RECORD_ID=$(echo "$RECORDS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "记录ID: ${FIRST_RECORD_ID}"
curl -s "${BASE_URL}/api/records/${FIRST_RECORD_ID}" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 9: 批量复核记录（部分通过，部分驳回）"
echo "------------------------"
SECOND_RECORD_ID=$(echo "$RECORDS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)[1]['id'])")
THIRD_RECORD_ID=$(echo "$RECORDS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)[2]['id'])")

echo "通过记录1和记录2，驳回记录3"
curl -s -X POST "${BASE_URL}/api/records/review" \
  -H "Content-Type: application/json" \
  -d '{
    "record_ids": ["'${FIRST_RECORD_ID}'", "'${SECOND_RECORD_ID}'"],
    "approved": true,
    "reason": "数据核对无误，异常情况属实",
    "operator": "复核员-老李"
  }' | python3 -m json.tool

curl -s -X POST "${BASE_URL}/api/records/review" \
  -H "Content-Type: application/json" \
  -d '{
    "record_ids": ["'${THIRD_RECORD_ID}'"],
    "approved": false,
    "reason": "客户会议临时改期，有客服备注记录",
    "operator": "复核员-老李"
  }' | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 10: 人工改判（强制修改状态）"
echo "------------------------"
curl -s -X POST "${BASE_URL}/api/records/${THIRD_RECORD_ID}/override" \
  -H "Content-Type: application/json" \
  -d '{
    "new_state": "approved",
    "reason": "行政经理特批：虽有改期，但茶歇和设备已准备，成本需追回",
    "operator": "行政经理-张总",
    "remark": "特殊情况，已与部门负责人确认"
  }' | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 11: 撤回批次（测试边界情况）"
echo "------------------------"
curl -s -X POST "${BASE_URL}/api/batches/${BATCH_ID}/recall" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "发现数据不全，需要补充门禁记录",
    "operator": "行政助理-小王"
  }' | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 12: 冻结批次（准备导出）"
echo "------------------------"
curl -s -X POST "${BASE_URL}/api/batches/${BATCH_ID}/freeze" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "数据复核完成，准备导出汇总报告",
    "operator": "行政经理-张总"
  }' | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 13: 查看导出摘要（冻结前后状态对比）"
echo "------------------------"
curl -s "${BASE_URL}/api/batches/${BATCH_ID}/export/summary?exported_by=行政经理-张总" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 14: 导出Excel报告"
echo "------------------------"
curl -s -o "异常回执报告_${BATCH_ID}.xlsx" "${BASE_URL}/api/batches/${BATCH_ID}/export/excel?exported_by=行政经理-张总"
echo "报告已导出至: 异常回执报告_${BATCH_ID}.xlsx"
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 15: 查看总体统计"
echo "------------------------"
curl -s "${BASE_URL}/api/stats/overview" | python3 -m json.tool
echo ""

echo ""
echo "========================================"
echo "演示完成！"
echo "========================================"
echo "关键点总结："
echo "1. 每个状态变更都记录了时间、操作人、原因"
echo "2. 原始证据（来源文件、行号、原始值）被完整保留"
echo "3. 人工改判有强制状态转换并有特殊标记"
echo "4. 导出前必须冻结，防止数据不一致"
echo "5. 导出报告包含冻结前后状态对比"
echo "========================================"
