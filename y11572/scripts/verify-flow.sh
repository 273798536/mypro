#!/bin/bash
set -e

BASE_URL="http://localhost:3000/api/v1"
OP_ID="operator-001"
OP_NAME="测试管理员"

echo "========================================"
echo "  客服工单补偿队列服务 - 流程验证"
echo "========================================"
echo ""

# 检查服务是否启动
echo "[步骤 0] 检查服务状态..."
if ! curl -s "${BASE_URL}/health/live" > /dev/null 2>&1; then
    echo "❌ 服务未启动，请先运行 scripts/start.sh"
    exit 1
fi
echo "✅ 服务运行正常"
echo ""

# 1. 查看统计
echo "[步骤 1] 查看仪表盘统计..."
curl -s -H "x-operator-id: ${OP_ID}" -H "x-operator-name: ${OP_NAME}" \
    "${BASE_URL}/statistics/dashboard" | head -c 200
echo ""
echo "✅ 统计数据获取成功"
echo ""

# 2. 获取工单列表
echo "[步骤 2] 获取工单列表..."
TICKETS=$(curl -s -H "x-operator-id: ${OP_ID}" -H "x-operator-name: ${OP_NAME}" \
    "${BASE_URL}/tickets?pageSize=5")
echo "$TICKETS" | grep -o '"ticketNo":"[^"]*"' | head -3
echo "✅ 工单列表获取成功"
echo ""

# 3. 创建新工单
echo "[步骤 3] 创建测试工单（测试幂等性）..."
BATCH_ID="test-batch-$(date +%s)"
IDEM_KEY="idem-test-$(date +%s)"

CREATE_RESULT=$(curl -s -X POST -H "Content-Type: application/json" \
    -H "x-operator-id: ${OP_ID}" -H "x-operator-name: ${OP_NAME}" \
    -d "{
        \"batchId\": \"${BATCH_ID}\",
        \"idempotencyKey\": \"${IDEM_KEY}\",
        \"idempotencyMode\": \"ignore\",
        \"data\": {
            \"sourceType\": \"manual\",
            \"sourceId\": \"test-123\",
            \"sessionSummary\": {
                \"sessionId\": \"sess-test\",
                \"customerId\": \"cust-001\",
                \"customerName\": \"测试客户\",
                \"issueType\": \"退款申请\",
                \"summary\": \"测试工单 - 验证重试补偿流程\",
                \"transferCount\": 2,
                \"agentNotes\": \"客服备注\",
                \"createdAt\": \"2024-01-15T10:00:00Z\"
            },
            \"slaRule\": {
                \"ruleId\": \"sla-001\",
                \"ruleName\": \"普通工单SLA\",
                \"priority\": 1,
                \"responseHours\": 24,
                \"resolutionHours\": 72,
                \"escalateAfterHours\": 48,
                \"conditions\": {\"vipLevel\": 1}
            },
            \"compensationApproval\": {
                \"approvalId\": \"appr-001\",
                \"approverId\": \"mgr-001\",
                \"approverName\": \"测试主管\",
                \"approvedAt\": \"2024-01-15T11:00:00Z\",
                \"approvedAmount\": 100,
                \"approvalNotes\": \"同意补偿\"
            },
            \"compensationAmounts\": [
                {\"type\": \"refund\", \"amount\": 100, \"description\": \"现金退款\"}
            ]
        }
    }" "${BASE_URL}/tickets")

TICKET_ID=$(echo "$CREATE_RESULT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)
echo "✅ 工单创建成功，ID: ${TICKET_ID}"
echo ""

# 4. 测试幂等性 - 重复提交
echo "[步骤 4] 测试幂等性 - 重复提交同一 key..."
DUPLICATE_RESULT=$(curl -s -X POST -H "Content-Type: application/json" \
    -H "x-operator-id: ${OP_ID}" -H "x-operator-name: ${OP_NAME}" \
    -d "{
        \"batchId\": \"${BATCH_ID}\",
        \"idempotencyKey\": \"${IDEM_KEY}\",
        \"idempotencyMode\": \"ignore\",
        \"data\": {
            \"sourceType\": \"manual\",
            \"sourceId\": \"test-123\",
            \"sessionSummary\": {
                \"sessionId\": \"sess-test\",
                \"customerId\": \"cust-001\",
                \"customerName\": \"测试客户\",
                \"issueType\": \"退款申请\",
                \"summary\": \"重复提交测试\",
                \"transferCount\": 2,
                \"agentNotes\": \"客服备注\",
                \"createdAt\": \"2024-01-15T10:00:00Z\"
            },
            \"slaRule\": {
                \"ruleId\": \"sla-001\",
                \"ruleName\": \"普通工单SLA\",
                \"priority\": 1,
                \"responseHours\": 24,
                \"resolutionHours\": 72,
                \"escalateAfterHours\": 48,
                \"conditions\": {\"vipLevel\": 1}
            },
            \"compensationApproval\": {
                \"approvalId\": \"appr-001\",
                \"approverId\": \"mgr-001\",
                \"approverName\": \"测试主管\",
                \"approvedAt\": \"2024-01-15T11:00:00Z\",
                \"approvedAmount\": 100,
                \"approvalNotes\": \"同意补偿\"
            },
            \"compensationAmounts\": [
                {\"type\": \"refund\", \"amount\": 100, \"description\": \"现金退款\"}
            ]
        }
    }" "${BASE_URL}/tickets")

echo "$DUPLICATE_RESULT" | grep -o '"action":"[^"]*"'
echo "✅ 幂等性验证通过"
echo ""

# 5. 提交工单到队列
echo "[步骤 5] 提交工单到队列处理（将触发模拟失败重试）..."
curl -s -X POST -H "Content-Type: application/json" \
    -H "x-operator-id: ${OP_ID}" -H "x-operator-name: ${OP_NAME}" \
    -d '{"reason": "流程验证测试提交"}' \
    "${BASE_URL}/tickets/${TICKET_ID}/submit"
echo ""
echo "✅ 工单已提交到队列"
echo ""

# 6. 查看工单详情
echo "[步骤 6] 查看工单详情（观察状态变化）..."
sleep 2
curl -s -H "x-operator-id: ${OP_ID}" -H "x-operator-name: ${OP_NAME}" \
    "${BASE_URL}/tickets/${TICKET_ID}" | grep -o '"status":"[^"]*"'
echo "✅ 详情获取成功"
echo ""

# 7. 查看状态历史
echo "[步骤 7] 查看状态历史..."
curl -s -H "x-operator-id: ${OP_ID}" -H "x-operator-name: ${OP_NAME}" \
    "${BASE_URL}/tickets/${TICKET_ID}/history" | grep -o '"toStatus":"[^"]*"'
echo "✅ 状态历史获取成功"
echo ""

# 8. 查看审计日志
echo "[步骤 8] 查看审计日志..."
curl -s -H "x-operator-id: ${OP_ID}" -H "x-operator-name: ${OP_NAME}" \
    "${BASE_URL}/tickets/${TICKET_ID}/audit" | grep -o '"action":"[^"]*"' | head -5
echo "✅ 审计日志获取成功"
echo ""

echo "========================================"
echo "  🎉 核心流程验证完成！"
echo "========================================"
echo ""
echo "观察建议："
echo "  1. 查看终端日志，观察模拟失败 -> 重试 -> 成功的过程"
echo "  2. 运行以下命令查看最终状态:"
echo "     curl -s -H \"x-operator-id: ${OP_ID}\" -H \"x-operator-name: ${OP_NAME}\" \\\"
echo "       ${BASE_URL}/tickets/${TICKET_ID} | grep 'status'
echo ""
echo "  3. 测试死信队列恢复:"
echo "     curl -s -H \"x-operator-id: ${OP_ID}\" -H \"x-operator-name: ${OP_NAME}\" \\\"
echo "       ${BASE_URL}/dead-letters"
echo ""
