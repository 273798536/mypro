#!/bin/bash

BASE_URL="http://localhost:3000"

ADMIN_HEADER=(
  -H "x-user-id: admin-001"
  -H "x-user-name: 系统管理员"
  -H "x-user-role: admin"
  -H "Content-Type: application/json"
)

MANAGER_HEADER=(
  -H "x-user-id: manager-001"
  -H "x-user-name: 张经理"
  -H "x-user-role: manager"
  -H "Content-Type: application/json"
)

OPERATOR_HEADER=(
  -H "x-user-id: operator-001"
  -H "x-user-name: 李运营"
  -H "x-user-role: operator"
  -H "Content-Type: application/json"
)

GUEST_HEADER=(
  -H "x-user-id: guest-001"
  -H "x-user-name: 访客用户"
  -H "x-user-role: guest"
  -H "Content-Type: application/json"
)

extract_ledger_id() {
  echo "$1" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('id', '') if d.get('success') else '')"
}

extract_task_id() {
  echo "$1" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('taskId', '') if d.get('success') else '')"
}

echo "=========================================="
echo "会议室占用权限追责台账 API 测试脚本"
echo "=========================================="
echo ""

echo "1. 健康检查"
HEALTH=$(curl -s "$BASE_URL/health")
echo "$HEALTH" | python3 -m json.tool
echo ""

echo "=========================================="
echo "2. 创建台账草稿 (运营员)"
echo "=========================================="
CREATE_RESPONSE=$(curl -s -X POST "${OPERATOR_HEADER[@]}" "$BASE_URL/api/ledgers" -d '{
  "meetingId": "MTG-TEST-001",
  "meetingTitle": "Q1季度总结会议",
  "roomName": "301会议室",
  "startTime": "2024-01-15T09:00:00Z",
  "endTime": "2024-01-15T12:00:00Z",
  "organizer": "王总监",
  "participants": ["张三", "李四", "王五"],
  "hasTeaBreak": true,
  "hasEquipment": true,
  "teaBreakCost": 500,
  "equipmentCost": 300,
  "dataSources": ["calendar"]
}')
echo "$CREATE_RESPONSE" | python3 -m json.tool
LEDGER_ID=$(extract_ledger_id "$CREATE_RESPONSE")
echo "台账 ID: $LEDGER_ID"
echo ""

if [ -z "$LEDGER_ID" ]; then
  echo "创建台账失败，无法继续测试"
  exit 1
fi

echo "=========================================="
echo "3. 追加客服备注"
echo "=========================================="
curl -s -X POST "${OPERATOR_HEADER[@]}" "$BASE_URL/api/ledgers/$LEDGER_ID/notes" -d '{
  "note": "客户来电确认：会议时间不变，需要增加投影仪设备"
}' | python3 -m json.tool
echo ""

echo "=========================================="
echo "4. 追加门禁刷卡记录"
echo "=========================================="
curl -s -X POST "${OPERATOR_HEADER[@]}" "$BASE_URL/api/ledgers/$LEDGER_ID/access" -d '{
  "cardNumber": "CARD-8823",
  "personName": "张三",
  "swipeTime": "2024-01-15T08:55:00Z",
  "room": "301会议室"
}' | python3 -m json.tool
echo ""

echo "=========================================="
echo "5. 提交审核 (运营员)"
echo "=========================================="
curl -s -X POST "${OPERATOR_HEADER[@]}" "$BASE_URL/api/ledgers/$LEDGER_ID/submit" -d '{
  "reason": "数据核对完毕，申请提交审核"
}' | python3 -m json.tool
echo ""

echo "=========================================="
echo "6. 驳回申请 (经理)"
echo "=========================================="
curl -s -X POST "${MANAGER_HEADER[@]}" "$BASE_URL/api/ledgers/$LEDGER_ID/reject" -d '{
  "reason": "门禁记录不完整，缺少李四和王五的刷卡记录"
}' | python3 -m json.tool
echo ""

echo "=========================================="
echo "7. 补充门禁记录后重新提交"
echo "=========================================="
curl -s -X POST "${OPERATOR_HEADER[@]}" "$BASE_URL/api/ledgers/$LEDGER_ID/access" -d '{
  "cardNumber": "CARD-8824",
  "personName": "李四",
  "swipeTime": "2024-01-15T08:58:00Z",
  "room": "301会议室"
}' | python3 -m json.tool

curl -s -X POST "${OPERATOR_HEADER[@]}" "$BASE_URL/api/ledgers/$LEDGER_ID/submit" -d '{
  "reason": "已补充门禁记录，重新提交审核"
}' | python3 -m json.tool
echo ""

echo "=========================================="
echo "8. 审核通过 (经理)"
echo "=========================================="
curl -s -X POST "${MANAGER_HEADER[@]}" "$BASE_URL/api/ledgers/$LEDGER_ID/confirm" -d '{
  "reason": "数据完整，审核通过"
}' | python3 -m json.tool
echo ""

echo "=========================================="
echo "9. 查看变更历史记录"
echo "=========================================="
curl -s "${ADMIN_HEADER[@]}" "$BASE_URL/api/ledgers/$LEDGER_ID/history" | python3 -m json.tool
echo ""

echo "=========================================="
echo "10. 批量导入 - 测试三种策略"
echo "=========================================="
echo "策略1: ignore (忽略已存在的)"
curl -s -X POST "${ADMIN_HEADER[@]}" "$BASE_URL/api/ledgers/batch" -d '{
  "strategy": "ignore",
  "ledgersData": [
    {
      "meetingId": "MTG-TEST-001",
      "meetingTitle": "Q1季度总结会议(已更新)",
      "roomName": "301会议室",
      "startTime": "2024-01-15T09:00:00Z",
      "endTime": "2024-01-15T12:00:00Z",
      "organizer": "王总监",
      "participants": ["张三"]
    },
    {
      "meetingId": "MTG-TEST-002",
      "meetingTitle": "产品需求评审",
      "roomName": "201会议室",
      "startTime": "2024-01-16T14:00:00Z",
      "endTime": "2024-01-16T16:00:00Z",
      "organizer": "产品部",
      "participants": ["产品经理", "开发工程师"]
    }
  ]
}' | python3 -m json.tool
echo ""

echo "=========================================="
echo "11. 异步任务 - 创建批量导入任务"
echo "=========================================="
TASK_RESPONSE=$(curl -s -X POST "${ADMIN_HEADER[@]}" "$BASE_URL/api/tasks/batch-import" -d '{
  "strategy": "append",
  "ledgersData": [
    {
      "meetingId": "MTG-TEST-003",
      "meetingTitle": "技术架构讨论",
      "roomName": "101会议室",
      "startTime": "2024-01-17T10:00:00Z",
      "endTime": "2024-01-17T12:00:00Z",
      "organizer": "技术部",
      "participants": ["架构师", "后端开发"],
      "isCanceled": true,
      "cancelTime": "2024-01-16T18:00:00Z",
      "cancelReason": "会议取消，但茶歇和设备已准备，成本无法追回"
    }
  ]
}')
echo "$TASK_RESPONSE" | python3 -m json.tool
TASK_ID=$(extract_task_id "$TASK_RESPONSE")
echo "任务 ID: $TASK_ID"

echo ""
echo "触发立即执行任务..."
curl -s -X POST "${ADMIN_HEADER[@]}" "$BASE_URL/api/tasks/process-now" | python3 -m json.tool

sleep 2

echo ""
echo "查看任务状态..."
curl -s "${ADMIN_HEADER[@]}" "$BASE_URL/api/tasks/$TASK_ID" | python3 -m json.tool
echo ""

echo "=========================================="
echo "12. 权限测试 - 访客尝试删除台账(应该被拒绝)"
echo "=========================================="
curl -s -X DELETE "${GUEST_HEADER[@]}" "$BASE_URL/api/ledgers/$LEDGER_ID" | python3 -m json.tool
echo ""

echo "=========================================="
echo "13. 查看失败的审计日志(包含权限拦截记录)"
echo "=========================================="
curl -s "${ADMIN_HEADER[@]}" "$BASE_URL/api/audit/failed" | python3 -m json.tool
echo ""

echo "=========================================="
echo "14. 导出行政经理视图报表"
echo "=========================================="
curl -s "${MANAGER_HEADER[@]}" "$BASE_URL/api/export/manager-report" | python3 -m json.tool
echo ""

echo "=========================================="
echo "15. 脱敏导出示例 (运营员有 export:masked 权限)"
echo "=========================================="
curl -s "${OPERATOR_HEADER[@]}" "$BASE_URL/api/export/ledgers/masked" | python3 -m json.tool
echo ""

echo "=========================================="
echo "测试完成！"
echo "=========================================="
echo ""
echo "失败清单查看: curl -H \"x-user-id: admin-001\" -H \"x-user-name: 系统管理员\" -H \"x-user-role: admin\" $BASE_URL/api/audit/failed"
echo "任务失败查看: curl -H \"x-user-id: admin-001\" -H \"x-user-name: 系统管理员\" -H \"x-user-role: admin\" $BASE_URL/api/tasks/failed"
echo "最终报告: curl -H \"x-user-id: manager-001\" -H \"x-user-name: 张经理\" -H \"x-user-role: manager\" $BASE_URL/api/export/manager-report"
