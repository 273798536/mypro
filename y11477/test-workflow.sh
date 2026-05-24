#!/bin/bash

BASE_URL="http://localhost:3000"
ENTRY_USER="admin_entry"
REVIEW_USER="admin_review"
SUPER_USER="admin_super"

echo "======================================"
echo "完整工作流程测试"
echo "======================================"
echo ""

echo "【步骤1】创建一个会议取消事件"
EVENT_RESULT=$(curl -s -X POST "$BASE_URL/api/events/cancel-message?user=$ENTRY_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "ROOM-003",
    "room_name": "第三会议室",
    "booking_id": "BK-2024-0524-003",
    "cancel_time": "2024-05-24T10:00:00",
    "start_time": "2024-05-24T14:00:00",
    "end_time": "2024-05-24T17:00:00",
    "has_tea_service": 1,
    "has_equipment": 1,
    "tea_cost": 200,
    "equipment_cost": 500
  }')
echo "$EVENT_RESULT" | python3 -m json.tool
EVENT_ID=$(echo "$EVENT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['event']['id'])")
echo "  -> 事件ID: $EVENT_ID"
echo ""

read -p "按回车继续..."
echo ""

echo "【步骤2】人工接管事件（复核员）"
curl -s -X POST "$BASE_URL/api/events/$EVENT_ID/manual-takeover?user=$REVIEW_USER" \
  -H "Content-Type: application/json" \
  -d '{"reason": "会议已取消，但茶歇和设备已准备，需要处理补偿"}' | python3 -m json.tool
echo ""

read -p "按回车继续..."
echo ""

echo "【步骤3】创建补偿记录"
COMP_RESULT=$(curl -s -X POST "$BASE_URL/api/events/$EVENT_ID/compensation?user=$REVIEW_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "compensation_type": "tea",
    "amount": 200,
    "notes": "茶歇已准备，无法退回，全额补偿"
  }')
echo "$COMP_RESULT" | python3 -m json.tool
COMP_ID=$(echo "$COMP_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  -> 补偿记录ID: $COMP_ID"
echo ""

read -p "按回车继续..."
echo ""

echo "【步骤4】添加设备补偿"
curl -s -X POST "$BASE_URL/api/events/$EVENT_ID/compensation?user=$REVIEW_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "compensation_type": "equipment",
    "amount": 300,
    "notes": "设备已布置，收取50%折损费"
  }' | python3 -m json.tool
echo ""

read -p "按回车继续..."
echo ""

echo "【步骤5】查看事件详情和补偿记录"
curl -s "$BASE_URL/api/events/$EVENT_ID/detail?user=$REVIEW_USER" | python3 -m json.tool
echo ""

read -p "按回车继续..."
echo ""

echo "【步骤6】审核补偿（主管审批）"
curl -s -X POST "$BASE_URL/api/compensations/$COMP_ID/review?user=$SUPER_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "notes": "情况属实，同意补偿"
  }' | python3 -m json.tool
echo ""

read -p "按回车继续..."
echo ""

echo "【步骤7】补偿入账"
curl -s -X POST "$BASE_URL/api/compensations/$COMP_ID/post?user=$SUPER_USER" | python3 -m json.tool
echo ""

read -p "按回车继续..."
echo ""

echo "【步骤8】查看事件审计追踪"
curl -s "$BASE_URL/api/events/$EVENT_ID/audit-trail?user=$SUPER_USER" | python3 -m json.tool
echo ""

echo "======================================"
echo "工作流程测试完成！"
echo "======================================"
