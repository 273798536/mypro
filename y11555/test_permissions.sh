#!/bin/bash
# 权限校验专项测试

BASE_URL="http://localhost:8000"

echo "======================================"
echo "权限校验专项测试"
echo "======================================"
echo ""

# 先导入基础数据获取一个回执
echo "0. 准备测试数据..."
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/batch/import" \
  -H "Content-Type: application/json" \
  -d "{
    \"batch_no\": \"BATCH_PERM_TEST_${TIMESTAMP}\",
    \"source_file\": \"权限测试.xlsx\",
    \"source_type\": \"excel\",
    \"created_by\": \"driver_zhang\",
    \"items\": [
      {
        \"original_row_number\": 1,
        \"original_data\": {\"row\": 1},
        \"store_order\": {\"order_no\": \"ORD_PERM_${TIMESTAMP}\", \"store_name\": \"测试门店\", \"product_name\": \"测试农药\", \"quantity\": 10, \"price\": 100},
        \"driver_track\": {\"track_no\": \"TRK_PERM_${TIMESTAMP}\", \"driver_name\": \"张司机\", \"vehicle_no\": \"鲁A00001\", \"status\": \"completed\"},
        \"sign_receipt\": {\"sign_no\": \"SIGN_PERM_${TIMESTAMP}\", \"signer_name\": \"李店长\", \"is_iou\": false},
        \"abnormal_type\": \"near_expiry\",
        \"abnormal_description\": \"测试异常\",
        \"abnormal_quantity\": 10,
        \"abnormal_amount\": 1000.00,
        \"area\": \"华东区\",
        \"store_name\": \"测试门店\",
        \"product_name\": \"测试农药\"
      }
    ]
  }")
RCP_NO=$(echo "$BATCH_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('success_count:', data.get('success_count'))
")
echo "导入结果: $RCP_NO"
echo ""

# 获取回执编号
QUERY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/receipt/query" \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "page_size": 1}')
RCP_NO=$(echo "$QUERY_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data['data'][0]['receipt_no'])
")
echo "测试回执: $RCP_NO"
echo ""
echo "--------------------------------------------------"

# 测试1: driver 尝试确认异常（应该失败）
echo "1. 测试 driver 角色确认异常 (abnormal_detected→abnormal_confirmed) - 应该失败..."
RESULT=$(curl -s -X POST "$BASE_URL/api/receipt/status/change" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO\",
    \"target_status\": \"abnormal_confirmed\",
    \"changed_by\": \"driver_zhang\",
    \"operator_role\": \"driver\",
    \"change_reason\": \"司机越权测试\"
  }")
echo "响应: $RESULT"
if echo "$RESULT" | grep -q "权限不足"; then
    echo "✅ PASS: driver 被正确拦截"
else
    echo "❌ FAIL: driver 不应有确认权限"
fi
echo ""
echo "--------------------------------------------------"

# 测试2: store_manager 确认异常（应该成功）
echo "2. 测试 store_manager 角色确认异常 - 应该成功..."
RESULT=$(curl -s -X POST "$BASE_URL/api/receipt/status/change" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO\",
    \"target_status\": \"abnormal_confirmed\",
    \"changed_by\": \"store_li\",
    \"operator_role\": \"store_manager\",
    \"change_reason\": \"门店确认\"
  }")
echo "响应: $RESULT"
if echo "$RESULT" | grep -q "success"; then
    echo "✅ PASS: store_manager 可正常确认"
else
    echo "❌ FAIL: store_manager 确认失败"
fi
echo ""
echo "--------------------------------------------------"

# 测试3: store_manager 尝试复核（应该失败）
echo "3. 测试 store_manager 角色复核 - 应该失败..."
RESULT=$(curl -s -X POST "$BASE_URL/api/receipt/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO\",
    \"review_result\": \"approve\",
    \"review_reason\": \"门店越权复核\",
    \"reviewed_by\": \"store_li\",
    \"operator_role\": \"store_manager\"
  }")
echo "响应: $RESULT"
if echo "$RESULT" | grep -q "权限不足"; then
    echo "✅ PASS: store_manager 被正确拦截"
else
    echo "❌ FAIL: store_manager 不应有复核权限"
fi
echo ""
echo "--------------------------------------------------"

# 测试4: area_manager 复核（应该成功）
echo "4. 测试 area_manager 角色复核 - 应该成功..."
RESULT=$(curl -s -X POST "$BASE_URL/api/receipt/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO\",
    \"review_result\": \"approve\",
    \"review_reason\": \"片区经理复核通过\",
    \"reviewed_by\": \"area_wang\",
    \"operator_role\": \"area_manager\"
  }")
echo "响应: $RESULT"
if echo "$RESULT" | grep -q "success"; then
    echo "✅ PASS: area_manager 可正常复核"
else
    echo "❌ FAIL: area_manager 复核失败"
fi
echo ""
echo "--------------------------------------------------"

# 测试5: finance 尝试冻结（应该失败）
echo "5. 测试 finance 角色冻结 - 应该失败..."
RESULT=$(curl -s -X POST "$BASE_URL/api/receipt/freeze" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO\",
    \"frozen_reason\": \"财务越权冻结\",
    \"frozen_by\": \"finance_zhao\",
    \"operator_role\": \"finance\"
  }")
echo "响应: $RESULT"
if echo "$RESULT" | grep -q "权限不足"; then
    echo "✅ PASS: finance 被正确拦截"
else
    echo "❌ FAIL: finance 不应有冻结权限"
fi
echo ""
echo "--------------------------------------------------"

# 测试6: area_manager 冻结（应该成功）
echo "6. 测试 area_manager 角色冻结 - 应该成功..."
RESULT=$(curl -s -X POST "$BASE_URL/api/receipt/freeze" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO\",
    \"frozen_reason\": \"片区经理冻结\",
    \"frozen_by\": \"area_wang\",
    \"operator_role\": \"area_manager\"
  }")
echo "响应: $RESULT"
if echo "$RESULT" | grep -q "success"; then
    echo "✅ PASS: area_manager 可正常冻结"
else
    echo "❌ FAIL: area_manager 冻结失败"
fi
echo ""
echo "--------------------------------------------------"

# 测试7: driver 尝试导出（应该失败）
echo "7. 测试 driver 角色导出 - 应该失败..."
RESULT=$(curl -s -X POST "$BASE_URL/api/export/summary" \
  -H "Content-Type: application/json" \
  -d '{
    "export_type": "summary",
    "filters": {},
    "exported_by": "driver_zhang",
    "operator_role": "driver"
  }')
echo "响应: $RESULT"
if echo "$RESULT" | grep -q "权限不足"; then
    echo "✅ PASS: driver 被正确拦截"
else
    echo "❌ FAIL: driver 不应有导出权限"
fi
echo ""
echo "--------------------------------------------------"

# 测试8: finance 导出（应该成功）
echo "8. 测试 finance 角色导出 - 应该成功..."
RESULT=$(curl -s -X POST "$BASE_URL/api/export/summary" \
  -H "Content-Type: application/json" \
  -d '{
    "export_type": "summary",
    "filters": {},
    "exported_by": "finance_zhao",
    "operator_role": "finance"
  }')
RECORD_COUNT=$(echo "$RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('record_count', 0))
")
echo "导出记录数: $RECORD_COUNT"
if [ "$RECORD_COUNT" -ge 1 ]; then
    echo "✅ PASS: finance 可正常导出"
else
    echo "❌ FAIL: finance 导出失败"
fi
echo ""
echo "--------------------------------------------------"

echo ""
echo "======================================"
echo "权限测试完成！"
echo "======================================"
echo "请检查以上 8 项权限测试是否全部通过"
