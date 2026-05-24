#!/bin/bash

BASE_URL="http://localhost:3000"
ENTRY_USER="admin_entry"
REVIEW_USER="admin_review"
SUPER_USER="admin_super"

echo "======================================"
echo "主管视角功能测试"
echo "======================================"
echo ""

echo "【1/7】查看主管仪表盘"
curl -s "$BASE_URL/api/reports/manager-dashboard?user=$SUPER_USER" | python3 -m json.tool
echo ""

read -p "按回车继续..."
echo ""

echo "【2/7】创建测试事件并模拟失败场景"
for i in 1 2 3; do
  curl -s -X POST "$BASE_URL/api/events/calendar?user=$ENTRY_USER" \
    -H "Content-Type: application/json" \
    -d "{
      \"room_id\": \"ROOM-00$i\",
      \"room_name\": \"测试会议室$i\",
      \"booking_id\": \"BK-TEST-00$i\",
      \"start_time\": \"2024-05-24T1$i:00:00\",
      \"has_tea_service\": 1,
      \"tea_cost\": $((100 * i))
    }" > /dev/null 2>&1
done
echo "  -> 已创建3个测试事件"
echo ""

echo "【3/7】将事件移至死信队列"
for id in 1 2 3; do
  curl -s -X POST "$BASE_URL/api/events/$id/dead-letter?user=$SUPER_USER" \
    -H "Content-Type: application/json" \
    -d "{\"reason\": \"测试死信队列 - 数据异常\"}" > /dev/null 2>&1
done
echo "  -> 已将事件移至死信队列"
echo ""

read -p "按回车继续..."
echo ""

echo "【4/7】查看死信队列"
curl -s "$BASE_URL/api/reports/dead-letter?user=$SUPER_USER" | python3 -m json.tool
echo ""

read -p "按回车继续..."
echo ""

echo "【5/7】恢复死信事件"
curl -s -X POST "$BASE_URL/api/events/1/restore?user=$SUPER_USER" \
  -H "Content-Type: application/json" \
  -d '{"reason": "数据已修正，重新处理"}' | python3 -m json.tool
echo ""

read -p "按回车继续..."
echo ""

echo "【6/7】查看失败事件清单"
curl -s "$BASE_URL/api/reports/failed-events?user=$SUPER_USER&resolved=0" | python3 -m json.tool
echo ""

read -p "按回车继续..."
echo ""

echo "【7/7】查看重试统计"
curl -s "$BASE_URL/api/reports/retry-stats?user=$SUPER_USER" | python3 -m json.tool
echo ""

echo "======================================"
echo "主管视角测试完成！"
echo "======================================"
echo ""
echo "其他常用命令:"
echo "  查看重试队列: curl $BASE_URL/api/reports/retry-queue?user=$SUPER_USER"
echo "  执行到期重试: curl -X POST $BASE_URL/api/reports/process-retries?user=$SUPER_USER"
echo "  每日报表:     curl $BASE_URL/api/reports/daily?user=$SUPER_USER"
