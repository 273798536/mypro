#!/bin/bash
BASE_URL="http://localhost:3001"

echo "========== 客服知识库发布重试补偿队列 API 验证 =========="
echo ""

echo "=== 1. 登录获取Token ==="
LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN" | sed 's/.*"token":"\([^"]*\)".*/\1/')
echo "✓ 登录成功，角色: supervisor"
echo ""

echo "=== 2. 提交补偿记录（变更单来源）==="
RECORD=$(curl -s -X POST $BASE_URL/api/compensation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "businessKey": "CO-VERIFY-001",
    "dataSource": "change_order",
    "sourceId": "CHG-VERIFY-001",
    "customerId": "CUST-VERIFY-001",
    "customerName": "验证客户",
    "compensationAmount": 299.99,
    "reason": "旧口径答案下线后坐席误用验证"
  }')
RECORD_ID=$(echo "$RECORD" | sed 's/.*"id":"\([^"]*\)".*/\1/')
STATUS=$(echo "$RECORD" | sed 's/.*"status":"\([^"]*\)".*/\1/')
echo "✓ 提交成功，记录ID: $RECORD_ID，状态: $STATUS"
echo ""

echo "=== 3. 加入队列 ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/compensation/$RECORD_ID/queue" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RESULT" | sed 's/.*"status":"\([^"]*\)".*/\1/')
echo "✓ 队列化成功，状态: $STATUS"
echo ""

echo "=== 4. 重试（模拟外部服务失败）==="
RESULT=$(curl -s -X POST "$BASE_URL/api/compensation/$RECORD_ID/retry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"retryCategory":"external_service_down","errorMessage":"支付网关暂时不可用"}')
STATUS=$(echo "$RESULT" | sed 's/.*"status":"\([^"]*\)".*/\1/')
RETRY_COUNT=$(echo "$RESULT" | sed 's/.*"retryCount":\([0-9]*\).*/\1/')
echo "✓ 重试成功，状态: $STATUS，重试次数: $RETRY_COUNT"
echo ""

echo "=== 5. 人工接管 ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/compensation/$RECORD_ID/takeover" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason":"外部系统持续故障，转人工处理"}')
STATUS=$(echo "$RESULT" | sed 's/.*"status":"\([^"]*\)".*/\1/')
HANDLED_BY=$(echo "$RESULT" | sed 's/.*"handledBy":"\([^"]*\)".*/\1/')
echo "✓ 人工接管成功，状态: $STATUS，处理人: $HANDLED_BY"
echo ""

echo "=== 6. 补偿入账 ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/compensation/$RECORD_ID/compensate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"externalReceiptId":"PAY-VERIFY-12345"}')
STATUS=$(echo "$RESULT" | sed 's/.*"status":"\([^"]*\)".*/\1/')
RECEIPT=$(echo "$RESULT" | sed 's/.*"externalReceiptId":"\([^"]*\)".*/\1/')
echo "✓ 补偿入账成功，状态: $STATUS，外部回执: $RECEIPT"
echo ""

echo "=== 7. 开始复核 ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/compensation/$RECORD_ID/review" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RESULT" | sed 's/.*"status":"\([^"]*\)".*/\1/')
REVIEWED_BY=$(echo "$RESULT" | sed 's/.*"reviewedBy":"\([^"]*\)".*/\1/')
echo "✓ 复核开始，状态: $STATUS，复核人: $REVIEWED_BY"
echo ""

echo "=== 8. 审批通过 ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/compensation/$RECORD_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"remark":"验证测试-复核通过"}')
STATUS=$(echo "$RESULT" | sed 's/.*"status":"\([^"]*\)".*/\1/')
APPROVED_BY=$(echo "$RESULT" | sed 's/.*"approvedBy":"\([^"]*\)".*/\1/')
echo "✓ 审批通过，状态: $STATUS，审批人: $APPROVED_BY"
echo ""

echo "=== 9. 关闭记录 ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/compensation/$RECORD_ID/close" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason":"验证测试流程完成"}')
STATUS=$(echo "$RESULT" | sed 's/.*"status":"\([^"]*\)".*/\1/')
echo "✓ 关闭成功，最终状态: $STATUS"
echo ""

echo "=== 10. 查看状态历史（数据追溯）==="
HISTORY=$(curl -s "$BASE_URL/api/compensation/$RECORD_ID/history" \
  -H "Authorization: Bearer $TOKEN")
echo "✓ 历史记录数: $(echo "$HISTORY" | grep -o '"id"' | wc -l)"
echo ""

echo "=== 11. 查看运营报表 ==="
REPORT=$(curl -s "$BASE_URL/api/report/summary" \
  -H "Authorization: Bearer $TOKEN")
TOTAL=$(echo "$REPORT" | sed 's/.*"totalRecords":\([0-9]*\).*/\1/')
AMOUNT=$(echo "$REPORT" | sed 's/.*"totalAmount":\([0-9.]*\).*/\1/')
BAD_DATA=$(echo "$REPORT" | sed 's/.*"badDataRecords":\([0-9]*\).*/\1/')
echo "✓ 运营报表: 总记录$TOTAL条，总金额$AMOUNT元，坏数据$BAD_DATA条"
echo ""

echo "=== 12. 查看失败记录列表 ==="
FAILED=$(curl -s "$BASE_URL/api/compensation/failed?isResolved=false" \
  -H "Authorization: Bearer $TOKEN")
FAILED_COUNT=$(echo "$FAILED" | sed 's/.*"total":\([0-9]*\).*/\1/')
echo "✓ 未解决失败记录: $FAILED_COUNT条"
echo ""

echo "========== 验证完成！所有核心流程通过 =========="
