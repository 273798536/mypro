#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "=========================================="
echo "客服知识库发布权限追责台账 API - 测试命令"
echo "=========================================="

echo ""
echo "【1】健康检查"
echo "------------------------------------------"
curl -s "$BASE_URL/health" | jq .
sleep 1

echo ""
echo "【2】创建变更单草稿"
echo "------------------------------------------"
CREATE_DRAFT_RESPONSE=$(curl -s -X POST "$BASE_URL/change-orders" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user001" \
  -H "X-User-Name: 张三" \
  -H "X-User-Role: CONTENT_EDITOR" \
  -H "X-Idempotent-Key: draft-$(date +%s)" \
  -d '{
    "title": "关于退货政策的更新说明",
    "type": "UPDATE",
    "knowledgeId": "KB001",
    "knowledgeTitle": "7天无理由退货政策",
    "content": "为了提升用户体验，现将退货政策调整为30天无理由退货。",
    "changeReason": "用户反馈退货期太短，影响购买决策",
    "sensitiveFields": ["赔偿金额", "客户隐私"]
  }')
echo "$CREATE_DRAFT_RESPONSE" | jq .
ORDER_ID=$(echo "$CREATE_DRAFT_RESPONSE" | jq -r '.data.id')
ORDER_NO=$(echo "$CREATE_DRAFT_RESPONSE" | jq -r '.data.orderNo')
echo "变更单ID: $ORDER_ID"
echo "变更单编号: $ORDER_NO"
sleep 1

echo ""
echo "【3】提交变更单"
echo "------------------------------------------"
curl -s -X POST "$BASE_URL/change-orders/$ORDER_ID/submit" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user001" \
  -H "X-User-Name: 张三" \
  -H "X-User-Role: CONTENT_EDITOR" \
  -d '{"changeReason": "经过团队讨论，确认需要更新此政策"}' | jq .
sleep 1

echo ""
echo "【4】驳回变更单"
echo "------------------------------------------"
curl -s -X POST "$BASE_URL/change-orders/$ORDER_ID/reject" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user002" \
  -H "X-User-Name: 李四" \
  -H "X-User-Role: REVIEWER" \
  -d '{"rejectReason": "30天退货期可能增加运营成本，请重新评估", "riskLevel": "MEDIUM"}' | jq .
sleep 1

echo ""
echo "【5】修改后重新提交"
echo "------------------------------------------"
curl -s -X PUT "$BASE_URL/change-orders/$ORDER_ID" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user001" \
  -H "X-User-Name: 张三" \
  -H "X-User-Role: CONTENT_EDITOR" \
  -d '{"content": "为了提升用户体验，现将退货政策调整为15天无理由退货。"}' | jq .

curl -s -X POST "$BASE_URL/change-orders/$ORDER_ID/submit" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user001" \
  -H "X-User-Name: 张三" \
  -H "X-User-Role: CONTENT_EDITOR" \
  -d '{"changeReason": "调整为15天，平衡用户体验和运营成本"}' | jq .
sleep 1

echo ""
echo "【6】二次确认通过"
echo "------------------------------------------"
curl -s -X POST "$BASE_URL/change-orders/$ORDER_ID/confirm" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user002" \
  -H "X-User-Name: 李四" \
  -H "X-User-Role: REVIEWER" \
  -d '{"opinion": "调整合理，予以通过"}' | jq .
sleep 1

echo ""
echo "【7】审计归档"
echo "------------------------------------------"
curl -s -X POST "$BASE_URL/change-orders/$ORDER_ID/audit" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user003" \
  -H "X-User-Name: 王五" \
  -H "X-User-Role: AUDITOR" \
  -d '{"opinion": "流程合规，归档保存"}' | jq .
sleep 1

echo ""
echo "【8】查看变更单历史"
echo "------------------------------------------"
curl -s "$BASE_URL/change-orders/$ORDER_ID/history" | jq '.data | length'
echo "共 $(curl -s "$BASE_URL/change-orders/$ORDER_ID/history" | jq '.data | length') 条变更记录"
sleep 1

echo ""
echo "【9】批量导入客服引用记录"
echo "------------------------------------------"
BATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/reference-records/batch" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user004" \
  -H "X-User-Name: 系统导入" \
  -H "X-User-Role: SYSTEM" \
  -d '{
    "batchId": "BATCH-2024-001",
    "batchStrategy": "IGNORE",
    "items": [
      {
        "knowledgeId": "KB001",
        "knowledgeTitle": "7天无理由退货政策",
        "agentId": "agent001",
        "agentName": "赵六",
        "agentRole": "CUSTOMER_SERVICE",
        "customerPhone": "13800138000",
        "isOfflineContent": true,
        "referenceType": "COPY",
        "isErrorClaim": true,
        "errorClaimAmount": 500.00,
        "errorClaimReason": "引用了已下线的旧版本内容，导致错赔",
        "relatedOrderNo": "ORDER-2024-001"
      },
      {
        "knowledgeId": "KB002",
        "knowledgeTitle": "运费险说明",
        "agentId": "agent002",
        "agentName": "孙七",
        "agentRole": "CUSTOMER_SERVICE",
        "customerPhone": "13900139000",
        "isOfflineContent": false,
        "referenceType": "VIEW",
        "isErrorClaim": false
      },
      {
        "knowledgeId": "KB001",
        "knowledgeTitle": "7天无理由退货政策",
        "agentId": "agent001",
        "agentName": "赵六",
        "agentRole": "CUSTOMER_SERVICE",
        "customerPhone": "13700137000",
        "isOfflineContent": true,
        "referenceType": "SEND",
        "isErrorClaim": true,
        "errorClaimAmount": 200.00,
        "errorClaimReason": "错用旧政策",
        "relatedOrderNo": "ORDER-2024-002"
      }
    ]
  }')
echo "$BATCH_RESPONSE" | jq .
TASK_ID=$(echo "$BATCH_RESPONSE" | jq -r '.data.taskId')
sleep 2

echo ""
echo "【10】查看任务状态"
echo "------------------------------------------"
curl -s "$BASE_URL/tasks/$TASK_ID" | jq '.data | {status: .status, successCount, failedCount, skippedCount}'
sleep 1

echo ""
echo "【11】幂等性测试 - 重复请求同一幂等键"
echo "------------------------------------------"
IDEMPOTENT_KEY="test-idempotent-$(date +%s)"
echo "第一次请求 (幂等键: $IDEMPOTENT_KEY)"
curl -s -X POST "$BASE_URL/change-orders" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user001" \
  -H "X-User-Name: 张三" \
  -H "X-User-Role: CONTENT_EDITOR" \
  -H "X-Idempotent-Key: $IDEMPOTENT_KEY" \
  -d '{
    "title": "测试幂等性的变更单",
    "type": "CREATE",
    "knowledgeId": "KB003",
    "content": "这是一个测试内容"
  }' | jq '.data | {orderNo, createdAt}'

echo ""
echo "第二次请求 (相同幂等键) - 应该返回缓存结果"
curl -s -X POST "$BASE_URL/change-orders" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user001" \
  -H "X-User-Name: 张三" \
  -H "X-User-Role: CONTENT_EDITOR" \
  -H "X-Idempotent-Key: $IDEMPOTENT_KEY" \
  -d '{
    "title": "测试幂等性的变更单",
    "type": "CREATE",
    "knowledgeId": "KB003",
    "content": "这是一个测试内容"
  }' | jq '._meta'
sleep 1

echo ""
echo "【12】查询失败任务列表"
echo "------------------------------------------"
curl -s "$BASE_URL/tasks?status=FAILED_PERMANENT" | jq '.data.list | length'
echo "永久失败任务数: $(curl -s "$BASE_URL/tasks?status=FAILED_PERMANENT" | jq '.data.total')"
curl -s "$BASE_URL/tasks?status=WAITING_MANUAL" | jq '.data.list | length'
echo "等待人工处理任务数: $(curl -s "$BASE_URL/tasks?status=WAITING_MANUAL" | jq '.data.total')"
curl -s "$BASE_URL/tasks?status=WAITING_RETRY" | jq '.data.list | length'
echo "等待重试任务数: $(curl -s "$BASE_URL/tasks?status=WAITING_RETRY" | jq '.data.total')"
sleep 1

echo ""
echo "【13】生成运营报告"
echo "------------------------------------------"
curl -s "$BASE_URL/export/report?desensitize=true" | jq '.data.summary'
sleep 1

echo ""
echo "【14】角色视图统计"
echo "------------------------------------------"
curl -s "$BASE_URL/audit/role-view" | jq '.data.roleStats'
sleep 1

echo ""
echo "【15】错赔统计"
echo "------------------------------------------"
curl -s "$BASE_URL/audit/error-claim-stats" | jq '.data'
sleep 1

echo ""
echo "【16】脱敏导出引用记录"
echo "------------------------------------------"
curl -s "$BASE_URL/export/reference-records?isErrorClaim=true&desensitize=true" | jq '.data | .[] | {recordNo, customerPhone, isErrorClaim, errorClaimAmount}'
sleep 1

echo ""
echo "【17】查看审计日志"
echo "------------------------------------------"
curl -s "$BASE_URL/audit/logs?entityType=CHANGE_ORDER&pageSize=5" | jq '.data.list | .[] | {logNo, action, operatorName, operatorRole, createdAt}'
sleep 1

echo ""
echo "=========================================="
echo "测试完成！"
echo "=========================================="
