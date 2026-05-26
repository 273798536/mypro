#!/bin/bash
BASE_URL="http://localhost:3001"
PASS=0
FAIL=0

check_result() {
  local step="$1"
  local http_code="$2"
  local expected_code="$3"
  local response="$4"
  
  if [ "$http_code" != "$expected_code" ]; then
    echo "✗ $step - HTTP $http_code (期望 $expected_code)"
    echo "  响应: $response"
    FAIL=$((FAIL + 1))
    return 1
  fi
  
  if echo "$response" | grep -q '"error"'; then
    echo "✗ $step - 返回错误"
    echo "  响应: $response"
    FAIL=$((FAIL + 1))
    return 1
  fi
  
  echo "✓ $step"
  PASS=$((PASS + 1))
  return 0
}

echo "========== 客服知识库发布重试补偿队列 API 验证 =========="
echo ""

echo "=== 1. 登录获取Token ==="
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')
TOKEN=$(echo "$LOGIN_BODY" | sed 's/.*"token":"\([^"]*\)".*/\1/')
if [ -n "$TOKEN" ] && [ "$HTTP_CODE" = "200" ]; then
  echo "✓ 登录成功，角色: supervisor"
  PASS=$((PASS + 1))
else
  echo "✗ 登录失败"
  echo "  HTTP: $HTTP_CODE, 响应: $LOGIN_BODY"
  FAIL=$((FAIL + 1))
  exit 1
fi
echo ""

echo "=== 2. 提交补偿记录（变更单来源）==="
RECORD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/compensation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "businessKey": "CO-VERIFY-002",
    "dataSource": "change_order",
    "sourceId": "CHG-VERIFY-002",
    "customerId": "CUST-VERIFY-002",
    "customerName": "验证客户2",
    "compensationAmount": 199.99,
    "reason": "验证测试-旧口径答案下线后坐席误用"
  }')
HTTP_CODE=$(echo "$RECORD_RESPONSE" | tail -1)
RECORD_BODY=$(echo "$RECORD_RESPONSE" | sed '$d')
RECORD_ID=$(echo "$RECORD_BODY" | sed 's/.*"id":"\([^"]*\)".*/\1/')
check_result "提交补偿记录" "$HTTP_CODE" "201" "$RECORD_BODY"
echo ""

echo "=== 3. 加入队列 ==="
RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compensation/$RECORD_ID/queue" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
check_result "加入队列" "$HTTP_CODE" "200" "$BODY"
echo ""

echo "=== 4. 重试（模拟外部服务失败）==="
RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compensation/$RECORD_ID/retry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"retryCategory":"external_service_down","errorMessage":"支付网关暂时不可用"}')
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
check_result "重试记录" "$HTTP_CODE" "200" "$BODY"
echo ""

echo "=== 5. 人工接管 ==="
RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compensation/$RECORD_ID/takeover" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason":"外部系统持续故障，转人工处理"}')
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
check_result "人工接管" "$HTTP_CODE" "200" "$BODY"
echo ""

echo "=== 6. 补偿入账 ==="
RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compensation/$RECORD_ID/compensate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"externalReceiptId":"PAY-VERIFY-67890"}')
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
check_result "补偿入账" "$HTTP_CODE" "200" "$BODY"
echo ""

echo "=== 7. 开始复核 ==="
RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compensation/$RECORD_ID/review" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
check_result "开始复核" "$HTTP_CODE" "200" "$BODY"
echo ""

echo "=== 8. 审批通过 ==="
RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compensation/$RECORD_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"remark":"验证测试-复核通过"}')
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
check_result "审批通过" "$HTTP_CODE" "200" "$BODY"
echo ""

echo "=== 9. 关闭记录 ==="
RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compensation/$RECORD_ID/close" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason":"验证测试流程完成"}')
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
check_result "关闭记录" "$HTTP_CODE" "200" "$BODY"
echo ""

echo "=== 10. 查看状态历史（数据追溯）==="
RESULT=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/compensation/$RECORD_ID/history" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
HISTORY_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l)
check_result "状态历史($HISTORY_COUNT条)" "$HTTP_CODE" "200" "$BODY"
echo ""

echo "=== 11. 查看运营报表 ==="
RESULT=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/report/summary" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
check_result "运营报表" "$HTTP_CODE" "200" "$BODY"
echo ""

echo "=== 12. 查看失败记录列表（核心验证）==="
RESULT=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/compensation/failed?isResolved=false" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')

if [ "$HTTP_CODE" = "200" ] && ! echo "$BODY" | grep -q '"记录.*不存在"'; then
  FAILED_TOTAL=$(echo "$BODY" | sed 's/.*"total":\([0-9]*\).*/\1/')
  if [ -n "$FAILED_TOTAL" ] && [ "$FAILED_TOTAL" -ge 0 ] 2>/dev/null; then
    echo "✓ 失败列表 - 未解决失败记录: $FAILED_TOTAL条"
    PASS=$((PASS + 1))
  else
    echo "✗ 失败列表 - 返回格式异常"
    echo "  响应: $BODY"
    FAIL=$((FAIL + 1))
  fi
else
  echo "✗ 失败列表 - HTTP $HTTP_CODE 或返回错误"
  echo "  响应: $BODY"
  FAIL=$((FAIL + 1))
fi
echo ""

echo "=== 13. 验证失败列表返回正确结构（非'记录failed不存在'）==="
if echo "$BODY" | grep -q '"records"'; then
  echo "✓ 失败列表返回正确的 records 数组结构"
  PASS=$((PASS + 1))
else
  echo "✗ 失败列表未返回 records 数组，可能被 /:id 路由拦截"
  FAIL=$((FAIL + 1))
fi
echo ""

echo "========== 验证结果 =========="
echo "通过: $PASS, 失败: $FAIL"
if [ "$FAIL" -eq 0 ]; then
  echo "✓ 所有核心流程验证通过！"
else
  echo "✗ 存在 $FAIL 个失败项"
  exit 1
fi
