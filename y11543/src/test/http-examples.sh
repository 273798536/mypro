#!/bin/bash
# 广告素材投放验收回放链路服务 - HTTP 请求示例

BASE_URL="http://localhost:3000"

echo "========================================"
echo "广告素材投放验收回放链路服务 - API 测试"
echo "========================================"
echo ""

# 健康检查
echo "1. 健康检查"
curl -s "$BASE_URL/health" | jq .
echo ""

# 创建批次
echo "2. 创建批次"
BATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/batches" \
  -H "Content-Type: application/json" \
  -d '{
    "batchNo": "BATCH-20240524-001",
    "name": "5月第4周广告素材验收",
    "operator": "张三",
    "description": "包含抖音、快手、微信平台素材",
    "duplicateStrategy": "overwrite"
  }')
echo "$BATCH_RESPONSE" | jq .
BATCH_ID=$(echo "$BATCH_RESPONSE" | jq -r '.data.id')
echo "批次ID: $BATCH_ID"
echo ""

# 添加素材
echo "3. 添加素材"
curl -s -X POST "$BASE_URL/api/batches/$BATCH_ID/materials" \
  -H "Content-Type: application/json" \
  -d '{
    "operator": "张三",
    "materials": [
      {"materialId": "MAT0001", "name": "品牌宣传视频_抖音版", "platform": "抖音"},
      {"materialId": "MAT0002", "name": "618活动海报_快手版", "platform": "快手"},
      {"materialId": "MAT0003", "name": "产品介绍_微信版", "platform": "微信"},
      {"materialId": "MAT0004", "name": "直播预热_抖音版", "platform": "抖音"}
    ]
  }' | jq .
echo ""

# 提交批次
echo "4. 提交批次"
curl -s -X POST "$BASE_URL/api/batches/$BATCH_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{"operator": "张三"}' | jq .
echo ""

# 添加审核结果 - MAT0001 通过
echo "5. 添加审核结果 - MAT0001 通过"
curl -s -X POST "$BASE_URL/api/materials/audit" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "'"$BATCH_ID"'",
    "materialId": "MAT0001",
    "status": "approved",
    "reason": "符合广告规范，无敏感内容",
    "auditor": "李四"
  }' | jq .
echo ""

# 添加审核结果 - MAT0002 拒绝
echo "6. 添加审核结果 - MAT0002 拒绝"
curl -s -X POST "$BASE_URL/api/materials/audit" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "'"$BATCH_ID"'",
    "materialId": "MAT0002",
    "status": "rejected",
    "reason": "含有极限词「最」，违反广告法",
    "auditor": "李四"
  }' | jq .
echo ""

# 添加客服备注
echo "7. 添加客服备注"
curl -s -X POST "$BASE_URL/api/materials/remark" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "'"$BATCH_ID"'",
    "materialId": "MAT0002",
    "content": "客户来电确认此素材需紧急投放，已申请特批",
    "operator": "客服小王",
    "source": "电话工单 #T20240524001"
  }' | jq .
echo ""

# 人工改判
echo "8. 人工改判 - MAT0002 特批通过"
curl -s -X POST "$BASE_URL/api/materials/manual-override" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "'"$BATCH_ID"'",
    "materialId": "MAT0002",
    "newStatus": "approved",
    "reason": "客户特批，紧急活动使用，风险由客户承担",
    "operator": "审核主管"
  }' | jq .
echo ""

# 添加花费日报
echo "9. 添加花费日报"
curl -s -X POST "$BASE_URL/api/materials/cost" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "'"$BATCH_ID"'",
    "materialId": "MAT0001",
    "reportDate": "2024-05-20",
    "cost": 1500.50,
    "impressions": 50000,
    "clicks": 2500,
    "conversionValue": 8500,
    "platform": "抖音",
    "operator": "系统同步"
  }' | jq .
echo ""

# 添加花费日报 - 第二天
echo "10. 添加花费日报 - 第二天"
curl -s -X POST "$BASE_URL/api/materials/cost" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "'"$BATCH_ID"'",
    "materialId": "MAT0001",
    "reportDate": "2024-05-21",
    "cost": 1800.00,
    "impressions": 62000,
    "clicks": 3100,
    "conversionValue": 9800,
    "platform": "抖音",
    "operator": "系统同步"
  }' | jq .
echo ""

# 获取对账报告
echo "11. 获取对账报告"
curl -s "$BASE_URL/api/audit/report/$BATCH_ID" | jq .
echo ""

# 检测异常
echo "12. 检测异常"
curl -s "$BASE_URL/api/audit/anomalies/$BATCH_ID" | jq .
echo ""

# 冻结批次
echo "13. 冻结批次 (导出前必须冻结)"
curl -s -X POST "$BASE_URL/api/batches/$BATCH_ID/freeze" \
  -H "Content-Type: application/json" \
  -d '{"operator": "管理员"}' | jq .
echo ""

# 导出数据
echo "14. 导出批次数据"
curl -s -X POST "$BASE_URL/api/audit/export/$BATCH_ID" \
  -H "Content-Type: application/json" \
  -d '{"operator": "管理员"}' | jq .
echo ""

# 导出历史记录
echo "15. 导出历史变更记录"
curl -s -X POST "$BASE_URL/api/audit/export-history/$BATCH_ID" \
  -H "Content-Type: application/json" | jq .
echo ""

# 查看批次详情
echo "16. 查看批次详情"
curl -s "$BASE_URL/api/batches/$BATCH_ID" | jq '.data | {batchNo, name, status, frozen, materialCount, successCount, failedCount}'
echo ""

# 回放素材变更历史
echo "17. 回放 MAT0002 变更历史"
curl -s "$BASE_URL/api/audit/replay/MAT0002?batchId=$BATCH_ID" | jq .
echo ""

echo "========================================"
echo "测试完成!"
echo "========================================"
