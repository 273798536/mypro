#!/bin/bash
set -e

echo "======================================"
echo "  门店会员储值验收回放链路服务 - 完整演示"
echo "======================================"
echo ""

echo "Step 1: 创建批次"
BATCH_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/batches \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: DEMO_OP" \
  -H "X-Operator-Name: 演示操作员" \
  -d '{
    "store_id": "STORE001",
    "store_name": "朝阳门店"
  }')

BATCH_ID=$(echo "$BATCH_RESPONSE" | jq -r '.id')
BATCH_NO=$(echo "$BATCH_RESPONSE" | jq -r '.batch_no')
echo "批次创建成功: $BATCH_ID ($BATCH_NO)"
echo ""

sleep 1

echo "Step 2: 生成测试数据（含异常）"
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/generate" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: DEMO_OP" \
  -H "X-Operator-Name: 演示操作员" \
  -d '{
    "recharge_count": 30,
    "refund_count": 3,
    "handover_count": 2,
    "include_errors": true
  }' | jq .
echo ""

sleep 1

echo "Step 3: 提交批次"
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/submit" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: DEMO_OP" \
  -H "X-Operator-Name: 演示操作员" \
  -d '{"reason": "数据准备完成，提交审核"}' | jq .
echo ""

sleep 1

echo "Step 4: 开始审核"
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/review" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: AUDIT_OP" \
  -H "X-Operator-Name: 审核员" \
  -d '{"reason": "开始对账审核"}' | jq .
echo ""

sleep 1

echo "Step 5: 执行对账"
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/reconcile" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: AUDIT_OP" \
  -H "X-Operator-Name: 审核员" \
  -d '{}' | jq .
echo ""

sleep 1

echo "Step 6: 查看对账结果摘要"
curl -s "http://localhost:8080/api/v1/batches/$BATCH_ID" | jq '{
  status: .status,
  total_records: .total_records,
  matched_records: .matched_records,
  mismatched_records: .mismatched_records
}'
echo ""

sleep 1

echo "Step 7: 人工改判 - 部分通过"
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/partial" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: MANAGER_OP" \
  -H "X-Operator-Name: 财务主管" \
  -d '{"reason": "异常已核实，部分通过"}' | jq .
echo ""

sleep 1

echo "Step 8: 冻结批次（导出前）"
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/freeze" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: MANAGER_OP" \
  -H "X-Operator-Name: 财务主管" \
  -d '{"reason": "导出前冻结批次"}' | jq .
echo ""

sleep 1

echo "Step 9: 解冻以便导出"
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/recall" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: MANAGER_OP" \
  -H "X-Operator-Name: 财务主管" \
  -d '{"reason": "解冻后导出"}' | jq .
echo ""

sleep 1

echo "Step 10: 重新审核并通过"
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/review" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: MANAGER_OP" \
  -H "X-Operator-Name: 财务主管" \
  -d '{"reason": "最终审核"}' | jq .
echo ""
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/approve" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: MANAGER_OP" \
  -H "X-Operator-Name: 财务主管" \
  -d '{"reason": "审核通过"}' | jq .
echo ""

sleep 1

echo "Step 11: 导出Excel"
EXPORT_RESULT=$(curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/export" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: MANAGER_OP" \
  -H "X-Operator-Name: 财务主管" \
  -d '{}')

echo "$EXPORT_RESULT" | jq .
FILE_PATH=$(echo "$EXPORT_RESULT" | jq -r '.file_path')
echo "导出文件: $FILE_PATH"
echo ""

sleep 1

echo "Step 12: 查看审计日志"
curl -s "http://localhost:8080/api/v1/audit/logs?batch_id=$BATCH_ID&page_size=10" | jq '.items[] | {action, operator_name, remark, created_at}'
echo ""

echo "======================================"
echo "  演示完成!"
echo "  批次ID: $BATCH_ID"
echo "  导出文件: $FILE_PATH"
echo "======================================"
