#!/bin/bash

BASE_URL="http://localhost:3000"
ENTRY_USER="admin_entry"
REVIEW_USER="admin_review"
SUPER_USER="admin_super"
READ_USER="admin_readonly"

echo "======================================"
echo "会议室占用重试补偿队列 API 测试脚本"
echo "======================================"
echo ""

echo "【1/8】健康检查"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""

echo "【2/8】提交预约日历事件（录入员权限）"
CALENDAR_RESULT=$(curl -s -X POST "$BASE_URL/api/events/calendar?user=$ENTRY_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "ROOM-001",
    "room_name": "第一会议室",
    "booking_id": "BK-2024-0524-001",
    "booked_by": "张三",
    "booked_at": "2024-05-24T09:00:00",
    "start_time": "2024-05-24T14:00:00",
    "end_time": "2024-05-24T16:00:00",
    "has_tea_service": 1,
    "has_equipment": 1,
    "tea_cost": 150,
    "equipment_cost": 300,
    "source_file": "calendar_export_20240524.xlsx"
  }')
echo "$CALENDAR_RESULT" | python3 -m json.tool
EVENT_ID=$(echo "$CALENDAR_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['event']['id'])")
EVENT_KEY=$(echo "$CALENDAR_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['eventKey'])")
echo "  -> 事件ID: $EVENT_ID, 事件Key: $EVENT_KEY"
echo ""

echo "【3/8】重复提交相同预约 - 验证去重逻辑"
curl -s -X POST "$BASE_URL/api/events/calendar?user=$ENTRY_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "ROOM-001",
    "room_name": "第一会议室(已更新)",
    "booking_id": "BK-2024-0524-001",
    "booked_by": "张三",
    "start_time": "2024-05-24T14:00:00",
    "end_time": "2024-05-24T16:30:00",
    "tea_cost": 200
  }' | python3 -m json.tool
echo ""

echo "【4/8】提交门禁刷卡记录"
curl -s -X POST "$BASE_URL/api/events/access-card?user=$ENTRY_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "ROOM-001",
    "room_name": "第一会议室",
    "checkin_time": "2024-05-24T14:05:00",
    "start_time": "2024-05-24T14:00:00"
  }' | python3 -m json.tool
echo ""

echo "【5/8】提交临时取消消息"
curl -s -X POST "$BASE_URL/api/events/cancel-message?user=$ENTRY_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "ROOM-002",
    "room_name": "第二会议室",
    "booking_id": "BK-2024-0524-002",
    "cancel_time": "2024-05-24T13:30:00",
    "start_time": "2024-05-24T14:00:00",
    "has_tea_service": 1,
    "tea_cost": 100
  }' | python3 -m json.tool
echo ""

echo "【6/8】查看事件列表（复核员权限 - 可看全部字段）"
curl -s "$BASE_URL/api/events?user=$REVIEW_USER&limit=5" | python3 -m json.tool
echo ""

echo "【7/8】查看事件列表（只读权限 - 字段受限）"
curl -s "$BASE_URL/api/events?user=$READ_USER&limit=5" | python3 -m json.tool
echo ""

echo "【8/8】查看汇总报表"
curl -s "$BASE_URL/api/reports/summary?user=$SUPER_USER" | python3 -m json.tool
echo ""

echo "======================================"
echo "基础测试完成！"
echo "======================================"
echo ""
echo "接下来可以运行:"
echo "  ./test-workflow.sh  - 测试完整工作流程"
echo "  ./test-manager.sh   - 测试主管视角功能"
