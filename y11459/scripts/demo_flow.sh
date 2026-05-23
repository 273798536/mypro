#!/bin/bash

BASE_URL="http://localhost:3000/api"

AUTH_HEADERS=(
  -H "X-User-Id: admin001"
  -H "X-User-Name: 系统管理员"
  -H "X-User-Role: admin"
  -H "X-City-Code: BJ"
  -H "Content-Type: application/json"
)

echo "=== 社区团购售后权限追责台账 - 完整流程演示 ==="
echo ""

echo "1. 创建批次"
BATCH_RESPONSE=$(curl -s -X POST "${AUTH_HEADERS[@]}" "$BASE_URL/batches" -d '{
  "cityCode": "BJ",
  "cityName": "北京",
  "importStrategy": "ignore"
}')
BATCH_ID=$(echo $BATCH_RESPONSE | sed 's/.*"id":"\([^"]*\)".*/\1/')
BATCH_NO=$(echo $BATCH_RESPONSE | sed 's/.*"batchNo":"\([^"]*\)".*/\1/')
echo "   批次ID: $BATCH_ID"
echo "   批次号: $BATCH_NO"
echo ""

echo "2. 导入团长退款表（3条记录：正常、金额不匹配、无复核）"
curl -s -X POST "${AUTH_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID/import/refunds" -d '{
  "strategy": "ignore",
  "data": [
    {
      "refundNo": "TK20240101001",
      "orderNo": "DD20240101001",
      "leaderId": "L001",
      "leaderName": "张三",
      "leaderPhone": "13800138001",
      "userId": "U001",
      "userName": "李四",
      "userPhone": "13900139001",
      "refundType": "less_shipped",
      "productSku": "SKU001",
      "productName": "新鲜草莓",
      "quantity": 2,
      "unitPrice": 29.90,
      "refundAmount": 59.80,
      "refundReason": "少发1盒"
    },
    {
      "refundNo": "TK20240101002",
      "orderNo": "DD20240101002",
      "leaderId": "L002",
      "leaderName": "王五",
      "leaderPhone": "13800138002",
      "userId": "U002",
      "userName": "赵六",
      "userPhone": "13900139002",
      "refundType": "defective",
      "productSku": "SKU002",
      "productName": "进口牛奶",
      "quantity": 1,
      "unitPrice": 68.00,
      "refundAmount": 68.00,
      "refundReason": "商品变质"
    },
    {
      "refundNo": "TK20240101003",
      "orderNo": "DD20240101003",
      "leaderId": "L003",
      "leaderName": "钱七",
      "leaderPhone": "13800138003",
      "userId": "U003",
      "userName": "孙八",
      "userPhone": "13900139003",
      "refundType": "other",
      "productSku": "SKU003",
      "productName": "有机蔬菜",
      "quantity": 3,
      "unitPrice": 15.00,
      "refundAmount": 45.00,
      "refundReason": "用户说有问题，但没有照片"
    }
  ]
}' | python3 -m json.tool
echo ""

echo "3. 导入仓库复核表（2条记录：1条匹配、1条金额不符）"
curl -s -X POST "${AUTH_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID/import/reviews" -d '{
  "strategy": "ignore",
  "data": [
    {
      "reviewNo": "FH20240101001",
      "orderNo": "DD20240101001",
      "warehouseCode": "WH001",
      "warehouseName": "北京一号仓",
      "reviewerId": "R001",
      "reviewerName": "王仓管",
      "productSku": "SKU001",
      "productName": "新鲜草莓",
      "actualQuantity": 1,
      "shouldQuantity": 2,
      "compensationAmount": 29.90,
      "reviewResult": "less_shipped",
      "reviewRemark": "称重核对，确实少发",
      "reviewedAt": "2024-01-01T10:00:00Z"
    },
    {
      "reviewNo": "FH20240101002",
      "orderNo": "DD20240101002",
      "warehouseCode": "WH001",
      "warehouseName": "北京一号仓",
      "reviewerId": "R001",
      "reviewerName": "王仓管",
      "productSku": "SKU002",
      "productName": "进口牛奶",
      "actualQuantity": 0,
      "shouldQuantity": 1,
      "compensationAmount": 58.00,
      "reviewResult": "defective",
      "reviewRemark": "出库时已发现变质，按8折补偿",
      "reviewedAt": "2024-01-01T11:00:00Z"
    }
  ]
}' | python3 -m json.tool
echo ""

echo "4. 执行数据匹配"
curl -s -X POST "${AUTH_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID/match" | python3 -m json.tool
echo ""

echo "5. 手动标记第3条为无法处理（无复核记录）"
REFUND_RESPONSE=$(curl -s "${AUTH_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID/refunds?status=pending_review")
REFUND3_ID=$(echo $REFUND_RESPONSE | sed 's/.*"refundNo":"TK20240101003","id":"\([^"]*\)".*/\1/')
curl -s -X PUT "${AUTH_HEADERS[@]}" "$BASE_URL/batches/refunds/$REFUND3_ID/status" -d '{
  "status": "unprocessable",
  "processRemark": "无对应仓库复核记录，且用户无法提供有效凭证，标记无法处理"
}' | python3 -m json.tool
echo ""

echo "6. 添加客服备注"
curl -s -X POST "${AUTH_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID/remarks" -d '{
  "refundId": "'"$REFUND3_ID"'",
  "remarkType": "customer_service",
  "content": "已联系用户说明情况，建议用户下次收到商品时及时拍照留证",
  "isSensitive": false
}' | python3 -m json.tool
echo ""

echo "7. 查看批次详情和统计"
curl -s "${AUTH_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID" | python3 -m json.tool
echo ""

echo "8. 提交批次审核"
curl -s -X POST "${AUTH_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID/submit" -d '{
  "reason": "数据已核对，共3条退款，2条匹配，1条无法处理"
}' | python3 -m json.tool
echo ""

echo "9. 城市负责人二次确认"
CITY_HEADERS=(
  -H "X-User-Id: city001"
  -H "X-User-Name: 北京负责人"
  -H "X-User-Role: city_manager"
  -H "X-City-Code: BJ"
  -H "Content-Type: application/json"
)
curl -s -X POST "${CITY_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID/confirm" -d '{
  "reason": "已核对明细，金额差异为牛奶补偿按8折计算，无法处理项已标注原因"
}' | python3 -m json.tool
echo ""

echo "10. 审计员审计"
AUDIT_HEADERS=(
  -H "X-User-Id: audit001"
  -H "X-User-Name: 审计员小张"
  -H "X-User-Role: auditor"
  -H "X-City-Code: BJ"
  -H "Content-Type: application/json"
)
curl -s -X POST "${AUDIT_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID/audit" -d '{
  "reason": "审计通过",
  "remark": "所有单据流程合规，无法处理项有客服跟进记录"
}' | python3 -m json.tool
echo ""

echo "11. 查看审计轨迹（脱敏后）"
curl -s "${CITY_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID/audit-trails?pageSize=10" | python3 -m json.tool
echo ""

echo "12. 导出汇总报表（城市负责人视图，脱敏）"
echo "   导出文件: ${BATCH_NO}_汇总报表.csv"
curl -s "${CITY_HEADERS[@]}" "$BASE_URL/batches/$BATCH_ID/export?type=summary&format=csv"
echo ""

echo "=== 演示完成 ==="
echo ""
echo "三种结果说明："
echo "1. ✅ 正常 - 草莓退款：金额匹配一致（退款59.80 = 少发1盒补偿29.90 × 2）"
echo "2. ⚠️ 待复核 - 牛奶退款：金额不匹配（退款68.00 vs 补偿58.00 = 8折）"
echo "3. ❌ 无法处理 - 蔬菜退款：无对应复核记录，无凭证，标记无法处理"
echo ""
echo "导出时去向说明："
echo "- 正常：数据匹配一致"
echo "- 待复核：数据不匹配，需核实"
echo "- 无法处理：标记无法处理，需单独跟进"
