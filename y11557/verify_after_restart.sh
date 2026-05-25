#!/bin/bash

echo "======================================"
echo "重启后数据持久化验证脚本"
echo "======================================"

BASE_URL="http://localhost:8000"

echo ""
echo "获取主管 Token..."
SUPER_TOKEN=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=supervisor_user&password=super123" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "======================================"
echo "验证1: 检查失败记录是否保留"
echo "======================================"

echo ""
echo "查看所有失败记录..."
curl -s -X GET "$BASE_URL/failures/" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "验证2: 检查人工处理意见是否保留"
echo "======================================"

echo ""
echo "查看已解决的失败记录..."
curl -s -X GET "$BASE_URL/failures/?is_resolved=true" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "验证3: 检查订单状态是否保留"
echo "======================================"

echo ""
echo "查看所有订单..."
curl -s -X GET "$BASE_URL/orders/" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "验证4: 检查审计日志（变更历史）是否保留"
echo "======================================"

echo ""
echo "查看 ORDER001 的变更历史..."
curl -s -X GET "$BASE_URL/orders/ORDER001/diff" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "验证5: 检查最终状态一致性"
echo "======================================"

echo ""
echo "查看汇总报表..."
curl -s -X GET "$BASE_URL/reports/summary" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "验证6: 重新导出数据"
echo "======================================"

echo ""
echo "重新导出订单数据..."
curl -s -X GET "$BASE_URL/export/orders" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -o /tmp/orders_export_after_restart.xlsx
echo "订单数据已导出到 /tmp/orders_export_after_restart.xlsx"

echo ""
echo "重新导出失败记录..."
curl -s -X GET "$BASE_URL/export/failures" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -o /tmp/failures_export_after_restart.xlsx
echo "失败记录已导出到 /tmp/failures_export_after_restart.xlsx"

echo ""
echo "======================================"
echo "验证7: 检查司机轨迹是否保留"
echo "======================================"

echo ""
echo "查看司机轨迹..."
curl -s -X GET "$BASE_URL/driver-tracks/" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "验证8: 检查历史导入数据是否保留"
echo "======================================"

echo ""
echo "查看历史数据版本统计..."
curl -s -X GET "$BASE_URL/history/versions" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "查看历史订单（HIST开头）..."
curl -s -X GET "$BASE_URL/orders/" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "验证9: 检查报表钻取功能"
echo "======================================"

echo ""
echo "钻取: 按状态查看订单明细..."
curl -s -X POST "$BASE_URL/reports/drilldown" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "orders_by_status",
    "status": "delivered"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "验证10: 检查带来源的汇总报表"
echo "======================================"

echo ""
echo "查看带来源记录的汇总报表..."
curl -s -X GET "$BASE_URL/reports/summary-with-sources" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "验证完成！"
echo "======================================"
echo ""
echo "数据持久化验证要点:"
echo "✓ 失败原因应该还在"
echo "✓ 人工意见（resolution_note）应该还在"
echo "✓ 最终状态（closed/delivered）应该还在"
echo "✓ 审计日志应该完整"
echo "✓ 司机轨迹应该保留"
echo "✓ 历史导入数据应该保留"
echo "✓ 报表钻取应该能追到单条记录"
echo "✓ 汇总数据应该有来源记录"
echo "✓ 导出的数据应该与重启前一致"
echo ""
