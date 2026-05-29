#!/bin/bash

echo "=== 长租公寓押金退还服务 - 示例请求 ==="
echo ""

BASE_URL="http://localhost:8000"

echo "1. 计算张三(HT2024001)的押金账本"
curl -s -X POST "$BASE_URL/deposit-ledgers/calculate" \
  -H "Content-Type: application/json" \
  -d '{"contract_id": 1, "ledger_no": "ZD202412001", "changed_by": "财务-刘"}' | python3 -m json.tool
echo ""

echo "2. 计算李四(HT2024002)的押金账本（含免租期误扣、维修争议、水电费未缴）"
curl -s -X POST "$BASE_URL/deposit-ledgers/calculate" \
  -H "Content-Type: application/json" \
  -d '{"contract_id": 2, "ledger_no": "ZD202412002", "changed_by": "财务-刘"}' | python3 -m json.tool
echo ""

echo "3. 计算王五(HT2024003)的押金账本（无争议）"
curl -s -X POST "$BASE_URL/deposit-ledgers/calculate" \
  -H "Content-Type: application/json" \
  -d '{"contract_id": 3, "ledger_no": "ZD202412003", "changed_by": "财务-陈"}' | python3 -m json.tool
echo ""

echo "4. 正向追溯：从租约合同查结果 (HT2024002)"
curl -s "$BASE_URL/trace/forward/HT2024002" | python3 -m json.tool
echo ""

echo "5. 反向追溯：从结果查押金流水 (账本ID=2)"
curl -s "$BASE_URL/trace/backward/2" | python3 -m json.tool
echo ""

echo "6. 查看李四的争议列表"
curl -s "$BASE_URL/disputes/?ledger_id=2" | python3 -m json.tool
echo ""

echo "7. 查看李四账本的审计日志"
curl -s "$BASE_URL/deposit-ledgers/2/audit-logs" | python3 -m json.tool
echo ""

echo "8. 确认维修工单责任（李四的墙面维修，设为非租客责任）"
curl -s -X POST "$BASE_URL/repair-orders/2/confirm-responsibility" \
  -H "Content-Type: application/json" \
  -d '{"is_tenant_responsible": false, "confirmed_by": "维修主管-王"}' | python3 -m json.tool
echo ""

echo "9. 重新计算李四的押金账本（补录后）"
curl -s -X POST "$BASE_URL/deposit-ledgers/calculate" \
  -H "Content-Type: application/json" \
  -d '{"contract_id": 2, "ledger_no": "ZD202412002", "changed_by": "财务-刘"}' | python3 -m json.tool
echo ""

echo "10. 再次查看审计日志（查看改动记录）"
curl -s "$BASE_URL/deposit-ledgers/2/audit-logs" | python3 -m json.tool
echo ""

echo "11. 处理免租期争议（确认调整）"
curl -s -X PATCH "$BASE_URL/disputes/1" \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved", "next_verifier": "财务", "resolution": "运营主管确认免租期误扣，同意调整2250元"}' | python3 -m json.tool
echo ""

echo "12. 确认李四的最终账本"
curl -s -X PATCH "$BASE_URL/deposit-ledgers/2" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed", "is_rent_free_pending": false, "changed_by": "财务主管", "change_reason": "所有争议已处理，确认退款"}' | python3 -m json.tool
echo ""

echo "13. 月底导出12月数据"
curl -s "$BASE_URL/export/monthly?year=2024&month=12" | python3 -m json.tool
echo ""

echo "14. 下载CSV格式导出"
curl -s "$BASE_URL/export/monthly/download?year=2024&month=12" | python3 -m json.tool
echo ""

echo "=== 示例请求完成 ==="
