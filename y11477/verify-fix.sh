#!/bin/bash

BASE_URL="http://localhost:3000"
ENTRY_USER="admin_entry"
REVIEW_USER="admin_review"
SUPER_USER="admin_super"

echo "======================================"
echo "修复验证测试"
echo "======================================"
echo ""

echo "【1/5】健康检查"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""

echo "【2/5】创建测试事件"
EVENT_RESULT=$(curl -s -X POST "$BASE_URL/api/events/calendar?user=$ENTRY_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "TEST-001",
    "booking_id": "BK-FIX-001",
    "start_time": "2024-05-25T10:00:00",
    "has_tea_service": 1,
    "tea_cost": 100
  }')
echo "$EVENT_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('事件ID:', d['event']['id'], '| 状态:', d['event']['status'])"
EVENT_ID=$(echo "$EVENT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['event']['id'])")
echo ""

echo "【3/5】调度重试 - 验证 scheduled 状态写入"
RETRY_RESULT=$(curl -s -X POST "$BASE_URL/api/events/$EVENT_ID/retry?user=$REVIEW_USER" \
  -H "Content-Type: application/json")
echo "$RETRY_RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d:
    print('❌ 失败:', d['error'])
else:
    print('✅ 成功! 事件状态:', d['status'], '| 重试次数:', d['retry_count'])
"
echo ""

echo "【4/5】主管仪表盘 - 验证 SQL 修复"
DASHBOARD=$(curl -s "$BASE_URL/api/reports/manager-dashboard?user=$SUPER_USER")
echo "$DASHBOARD" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    if 'generatedAt' in d:
        print('✅ 主管仪表盘加载成功!')
        print('   - 可重试分类数:', len(d.get('retryByCategory', [])))
        print('   - 死信事件数:', len(d.get('deadLetter', [])))
        print('   - 待恢复事件数:', len(d.get('recoverableEvents', [])))
        if 'recoveryImpact' in d:
            print('   - 风险金额:', d['recoveryImpact'].get('at_risk_amount', 0))
    else:
        print('❌ 响应格式异常')
except Exception as e:
    print('❌ SQL 错误:', str(e))
    print('原始响应前500字符:', repr(sys.stdin.read()[:500]))
"
echo ""

echo "【5/5】执行重试 - 验证完整流程"
EXEC_RESULT=$(curl -s -X POST "$BASE_URL/api/events/$EVENT_ID/execute-retry?user=$REVIEW_USER")
echo "$EXEC_RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d:
    print('❌ 失败:', d['error'])
else:
    print('✅ 执行重试成功! 最终状态:', d['status'])
"
echo ""

echo "======================================"
echo "修复验证完成!"
echo "======================================"
echo ""
echo "其他快速验证命令:"
echo "  查看重试日志: curl $BASE_URL/api/events/$EVENT_ID/audit-trail?user=$SUPER_USER"
echo "  查看事件详情: curl $BASE_URL/api/events/$EVENT_ID/detail?user=$SUPER_USER"
