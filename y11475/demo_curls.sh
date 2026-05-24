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
    "description": "包含预约日历、门禁刷卡、取消消息、异常照片数据",
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
echo "步骤 6: 导入异常照片记录"
echo "------------------------"
curl -s -X POST "${BASE_URL}/api/batches/${BATCH_ID}/import" \
  -F "file=@test_photo_evidence.xlsx" \
  -F "source_type=photo" \
  -F "uploaded_by=行政助理-小王" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 7: 查看多源数据关联（按预约ID分组）"
echo "------------------------"
curl -s "${BASE_URL}/api/batches/${BATCH_ID}/records-by-appointment" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 8: 获取批次记录列表"
echo "------------------------"
RECORDS_RESPONSE=$(curl -s "${BASE_URL}/api/batches/${BATCH_ID}/records")
echo "$RECORDS_RESPONSE" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 9: 提交审核（draft -> pending_review）"
echo "------------------------"
ALL_RECORD_IDS=$(echo "$RECORDS_RESPONSE" | python3 -c "import sys,json; print(','.join(['\"'+r['id']+'\"' for r in json.load(sys.stdin)]))")
curl -s -X POST "${BASE_URL}/api/records/submit-review" \
  -H "Content-Type: application/json" \
  -d "{
    \"record_ids\": [${ALL_RECORD_IDS}],
    \"approved\": true,
    \"reason\": \"数据整理完成，提请复核\",
    \"operator\": \"行政助理-小王\"
  }" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 10: 批量复核记录（部分通过，部分驳回）"
echo "------------------------"
FIRST_RECORD_ID=$(echo "$RECORDS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
SECOND_RECORD_ID=$(echo "$RECORDS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)[1]['id'])")
THIRD_RECORD_ID=$(echo "$RECORDS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)[2]['id'])")

echo "通过记录1和记录2"
curl -s -X POST "${BASE_URL}/api/records/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"record_ids\": [\"${FIRST_RECORD_ID}\", \"${SECOND_RECORD_ID}\"],
    \"approved\": true,
    \"reason\": \"数据核对无误，异常情况属实\",
    \"operator\": \"复核员-老李\"
  }" | python3 -m json.tool

echo ""
echo "驳回记录3（客服备注客户已改期）"
curl -s -X POST "${BASE_URL}/api/records/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"record_ids\": [\"${THIRD_RECORD_ID}\"],
    \"approved\": false,
    \"reason\": \"客户会议临时改期，有客服备注记录\",
    \"operator\": \"复核员-老李\"
  }" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 11: 人工改判（行政经理特批）"
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
echo "步骤 12: 撤回批次（测试边界情况）"
echo "------------------------"
curl -s -X POST "${BASE_URL}/api/batches/${BATCH_ID}/recall" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "发现遗漏门禁记录，需要补充完整数据",
    "operator": "行政经理-张总"
  }' | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 13: 撤回后补充门禁数据"
echo "------------------------"
BATCH_STATUS=$(curl -s "${BASE_URL}/api/batches/${BATCH_ID}" | python3 -c "import sys,json; print(json.load(sys.stdin)['state'])")
echo "批次当前状态: ${BATCH_STATUS}"
echo ""
echo "撤回后状态可以导入新数据（recalled -> importing）"
echo "补充第二批门禁记录..."
curl -s -X POST "${BASE_URL}/api/batches/${BATCH_ID}/import" \
  -F "file=@test_access_card.xlsx" \
  -F "source_type=access_card" \
  -F "uploaded_by=行政助理-小王" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 14: 撤回后重新提交审核"
echo "------------------------"
RECORDS_RESPONSE2=$(curl -s "${BASE_URL}/api/batches/${BATCH_ID}/records")
ALL_RECORD_IDS2=$(echo "$RECORDS_RESPONSE2" | python3 -c "import sys,json; print(','.join(['\"'+r['id']+'\"' for r in json.load(sys.stdin)]))")
echo "补充材料后再次提交审核..."
curl -s -X POST "${BASE_URL}/api/records/submit-review" \
  -H "Content-Type: application/json" \
  -d "{
    \"record_ids\": [${ALL_RECORD_IDS2}],
    \"approved\": true,
    \"reason\": \"已补充完整门禁数据，重新提请复核\",
    \"operator\": \"行政助理-小王\"
  }" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 15: 冻结批次（准备导出）"
echo "------------------------"
curl -s -X POST "${BASE_URL}/api/batches/${BATCH_ID}/freeze" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "全部数据复核完成，准备导出汇总报告",
    "operator": "行政经理-张总"
  }' | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 16: 确认批次已冻结"
echo "------------------------"
curl -s "${BASE_URL}/api/batches/${BATCH_ID}" | python3 -c "
import sys,json
d = json.load(sys.stdin)
print('批次ID:', d['id'])
print('批次状态:', d['state'])
print('冻结时间:', d['frozen_at'])
print('冻结操作人:', d['frozen_by'])
print('冻结原因:', d['frozen_reason'])
"
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 17: 查看导出摘要（冻结前后状态对比）"
echo "------------------------"
curl -s "${BASE_URL}/api/batches/${BATCH_ID}/export/summary?exported_by=行政经理-张总" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 18: 导出Excel报告"
echo "------------------------"
curl -s -o "异常回执报告_${BATCH_ID}.xlsx" "${BASE_URL}/api/batches/${BATCH_ID}/export/excel?exported_by=行政经理-张总"
echo "报告已导出至: 异常回执报告_${BATCH_ID}.xlsx"
echo ""
read -p "按回车继续..."

echo ""
echo "步骤 19: 查看总体统计"
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
echo "3. 支持多源数据：预约日历、门禁刷卡、取消消息、异常照片"
echo "4. 客服备注字段记录人工说明"
echo "5. 人工改判有强制状态转换并有特殊标记"
echo "6. 撤回后有正确的状态流转路径"
echo "7. 导出前必须冻结，防止数据不一致"
echo "8. 导出报告包含冻结前后状态对比"
echo "========================================"
