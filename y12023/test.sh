#!/bin/bash
set -euo pipefail

BASE="http://localhost:5050"
PASS=0
FAIL=0
TOTAL=0

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL+1))
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS+1))
    echo "  ✅ $label: $actual"
  else
    FAIL=$((FAIL+1))
    echo "  ❌ $label: expected=$expected actual=$actual"
  fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  TOTAL=$((TOTAL+1))
  if echo "$haystack" | grep -q "$needle"; then
    PASS=$((PASS+1))
    echo "  ✅ $label: contains '$needle'"
  else
    FAIL=$((FAIL+1))
    echo "  ❌ $label: missing '$needle'"
  fi
}

assert_not_contains() {
  local label="$1" needle="$2" haystack="$3"
  TOTAL=$((TOTAL+1))
  if echo "$haystack" | grep -q "$needle"; then
    FAIL=$((FAIL+1))
    echo "  ❌ $label: should NOT contain '$needle'"
  else
    PASS=$((PASS+1))
    echo "  ✅ $label: correctly excludes '$needle'"
  fi
}

jq_val() {
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print($2)" 2>/dev/null || echo "PARSE_ERROR"
}

echo "========================================"
echo "  共享充电宝押金仲裁 - 验收测试"
echo "========================================"

# ─── Reset ───
echo ""
echo "▶ 重置数据"
curl -s -X POST "$BASE/api/reset" > /dev/null

###############################################################################
echo ""
echo "═══ 第一阶段：导入租借订单 + 设备归还 ═══"

echo ""
echo "▶ 导入租借订单（6个订单，覆盖各边界场景）"
ORDERS=$(curl -s -X POST "$BASE/api/import/rental-orders" \
  -H "Content-Type: application/json" \
  -d '[
    {"order_id":"ORD001","user_id":"U001","device_serial":"SN001","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD002","user_id":"U002","device_serial":"SN002","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD003","user_id":"U003","device_serial":"SN003","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD004","user_id":"U004","device_serial":"SN004","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD005","user_id":"U005","device_serial":"SN005","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD006","user_id":"U006","device_serial":"SN006","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"}
  ]')
IMPORTED=$(jq_val "$ORDERS" 'd["imported"]')
assert_eq "导入订单数" "6" "$IMPORTED"

echo ""
echo "▶ 导入设备归还（5条，含延迟归还、串码不一致、缺少归还）"
RETURNS=$(curl -s -X POST "$BASE/api/import/device-returns" \
  -H "Content-Type: application/json" \
  -d '[
    {"return_id":"RET001","device_serial":"SN001","return_time":"2025-05-01T17:00:00","return_station":"ST-A"},
    {"return_id":"RET002","device_serial":"SN002","return_time":"2025-05-02T10:00:00","return_station":"ST-B"},
    {"return_id":"RET003","device_serial":"SN099","return_time":"2025-05-01T17:00:00","return_station":"ST-A"},
    {"return_id":"RET005","device_serial":"SN005","return_time":"2025-05-03T20:00:00","return_station":"ST-C"},
    {"return_id":"RET006","device_serial":"SN006","return_time":"2025-05-01T18:30:00","return_station":"ST-D"}
  ]')
IMPORTED_RET=$(jq_val "$RETURNS" 'd["imported"]')
assert_eq "导入归还数" "5" "$IMPORTED_RET"

echo ""
echo "── 场景1: ORD001 按时归还 → MATCHED"
R1=$(curl -s "$BASE/api/arbitration/result?order_id=ORD001")
S1=$(jq_val "$R1" 'd["result"]["deposit_status"]')
assert_eq "ORD001 状态" "MATCHED" "$S1"
RF1=$(jq_val "$R1" 'd["result"]["refund_amount"]')
assert_eq "ORD001 退款" "99.0" "$RF1"

echo ""
echo "── 场景2: ORD002 归还延迟16小时 → DELAYED_RETURN"
R2=$(curl -s "$BASE/api/arbitration/result?order_id=ORD002")
S2=$(jq_val "$R2" 'd["result"]["deposit_status"]')
assert_eq "ORD002 状态" "DELAYED_RETURN" "$S2"
RF2=$(jq_val "$R2" 'd["result"]["refund_amount"]')
assert_eq "ORD002 退款(99-29.7=69.3)" "69.3" "$RF2"
assert_contains "ORD002 延迟因子" "return_delay" "$R2"

echo ""
echo "── 场景3: ORD003 设备串码不一致(SN099≠SN003) → SERIAL_MISMATCH"
R3=$(curl -s "$BASE/api/arbitration/result?order_id=ORD003")
S3=$(jq_val "$R3" 'd["result"]["deposit_status"]')
assert_eq "ORD003 状态" "SERIAL_MISMATCH" "$S3"
RF3=$(jq_val "$R3" 'd["result"]["refund_amount"]')
assert_eq "ORD003 退款0" "0" "$RF3"
assert_contains "ORD003 串码因子" "serial_mismatch" "$R3"

echo ""
echo "── 场景4: ORD004 无归还记录 → NOT_RETURNED"
R4=$(curl -s "$BASE/api/arbitration/result?order_id=ORD004")
S4=$(jq_val "$R4" 'd["result"]["deposit_status"]')
assert_eq "ORD004 状态" "NOT_RETURNED" "$S4"
RF4=$(jq_val "$R4" 'd["result"]["refund_amount"]')
assert_eq "ORD004 退款0" "0" "$RF4"

echo ""
echo "── 场景5: ORD005 归还延迟50小时 → DELAYED_RETURN，扣罚50%"
R5=$(curl -s "$BASE/api/arbitration/result?order_id=ORD005")
S5=$(jq_val "$R5" 'd["result"]["deposit_status"]')
assert_eq "ORD005 状态" "DELAYED_RETURN" "$S5"
RF5=$(jq_val "$R5" 'd["result"]["refund_amount"]')
assert_eq "ORD005 退款(99-49.5=49.5)" "49.5" "$RF5"

echo ""
echo "── 场景6: ORD006 归还延迟0.5小时 → DELAYED_RETURN，低扣罚"
R6=$(curl -s "$BASE/api/arbitration/result?order_id=ORD006")
S6=$(jq_val "$R6" 'd["result"]["deposit_status"]')
assert_eq "ORD006 状态" "DELAYED_RETURN" "$S6"
RF6=$(jq_val "$R6" 'd["result"]["refund_amount"]')
assert_eq "ORD006 退款(99-9.9=89.1)" "89.1" "$RF6"

###############################################################################
echo ""
echo "═══ 客服复核 ═══"

echo ""
echo "▶ ORD003 串码不一致 → 客服部分批准退款49.5元"
REVIEW3=$(curl -s -X POST "$BASE/api/arbitration/review" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ORD003","action":"partial","amount":49.5}')
RS3=$(jq_val "$REVIEW3" 'd["result"]["review_status"]')
assert_eq "ORD003 复核" "partial_approved" "$RS3"
RR3=$(jq_val "$REVIEW3" 'd["result"]["refund_amount"]')
assert_eq "ORD003 部分退款" "49.5" "$RR3"

echo ""
echo "▶ ORD004 未归还 → 客服驳回"
REVIEW4=$(curl -s -X POST "$BASE/api/arbitration/review" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ORD004","action":"reject"}')
RS4=$(jq_val "$REVIEW4" 'd["result"]["review_status"]')
assert_eq "ORD004 复核驳回" "rejected" "$RS4"
RB4=$(jq_val "$REVIEW4" 'd["result"]["refund_blocked"]')
assert_eq "ORD004 退款拦截" "True" "$RB4"

###############################################################################
echo ""
echo "═══ 重复退款拦截 ═══"

echo ""
echo "▶ 对ORD001发起第一次退款"
REF1=$(curl -s -X POST "$BASE/api/refund/attempt" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ORD001","amount":99.0}')
assert_contains "ORD001 首次退款" "processed" "$REF1"

echo ""
echo "▶ 对ORD001发起第二次相同退款 → 拦截"
REF2=$(curl -s -X POST "$BASE/api/refund/attempt" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ORD001","amount":99.0}')
assert_contains "ORD001 重复退款拦截" "duplicate" "$REF2"

echo ""
echo "▶ 检查仲裁记录中标记了重复退款"
R1B=$(curl -s "$BASE/api/arbitration/result?order_id=ORD001")
assert_contains "ORD001 重复退款因子" "duplicate_refund" "$R1B"
RB1B=$(jq_val "$R1B" 'd["result"]["refund_blocked"]')
assert_eq "ORD001 退款拦截标记" "True" "$RB1B"

###############################################################################
echo ""
echo "═══ 幂等性验证：重复导入订单+归还 ═══"

echo ""
echo "▶ 再次导入相同订单（幂等）"
ORDERS2=$(curl -s -X POST "$BASE/api/import/rental-orders" \
  -H "Content-Type: application/json" \
  -d '[
    {"order_id":"ORD001","user_id":"U001","device_serial":"SN001","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD002","user_id":"U002","device_serial":"SN002","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"}
  ]')

echo "▶ 验证ORD001状态仍含duplicate_refund因子（因之前退款尝试已记录）"
R1C=$(curl -s "$BASE/api/arbitration/result?order_id=ORD001")
assert_contains "幂等-ORD001重复退款因子" "duplicate_refund" "$R1C"

echo "▶ 验证ORD002延迟退款金额不变"
R2C=$(curl -s "$BASE/api/arbitration/result?order_id=ORD002")
RF2C=$(jq_val "$R2C" 'd["result"]["refund_amount"]')
assert_eq "幂等-ORD002退款不变" "69.3" "$RF2C"

###############################################################################
echo ""
echo "═══ 导出验证 ═══"

EXPORT=$(curl -s "$BASE/api/arbitration/export")
TOTAL_ORDERS=$(jq_val "$EXPORT" 'd["summary"]["total_orders"]')
assert_eq "导出总订单数" "6" "$TOTAL_ORDERS"
WA_COUNT=$(echo "$EXPORT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['summary']['warehouse_affected']))")
assert_eq "仓库影响数(此时应为0)" "0" "$WA_COUNT"

###############################################################################
echo ""
echo "═══ 第二阶段：补录仓库盘点 ═══"

echo ""
echo "▶ 导入仓库盘点（SN003在库→影响ORD003，SN004在库→影响ORD004）"
WH=$(curl -s -X POST "$BASE/api/import/warehouse-inventory" \
  -H "Content-Type: application/json" \
  -d '[
    {"record_id":"WH001","device_serial":"SN003","device_status":"in_stock","check_time":"2025-05-05T10:00:00","location":"仓库A"},
    {"record_id":"WH002","device_serial":"SN004","device_status":"in_stock","check_time":"2025-05-05T10:00:00","location":"仓库B"}
  ]')
WH_IMPORTED=$(jq_val "$WH" 'd["imported"]')
assert_eq "仓库盘点导入数" "2" "$WH_IMPORTED"

echo ""
echo "── ORD003: 串码不一致 + 仓库确认SN003在库 → REVIEW_REQUIRED"
R3W=$(curl -s "$BASE/api/arbitration/result?order_id=ORD003")
S3W=$(jq_val "$R3W" 'd["result"]["deposit_status"]')
assert_eq "ORD003 仓库补录后状态" "REVIEW_REQUIRED" "$S3W"
RF3W=$(jq_val "$R3W" 'd["result"]["refund_amount"]')
assert_eq "ORD003 仓库补录后退款(99*0.5=49.5)" "49.5" "$RF3W"
WI3=$(jq_val "$R3W" 'd["result"]["warehouse_impact"]["affected"]')
assert_eq "ORD003 仓库影响标记" "True" "$WI3"
assert_contains "ORD003 仓库影响描述含状态变更" "SERIAL_MISMATCH" "$R3W"
assert_contains "ORD003 含warehouse_confirmed因子" "warehouse_confirmed" "$R3W"

echo ""
echo "── ORD003 客服复核状态应仍为之前的部分批准"
RS3W=$(jq_val "$R3W" 'd["result"]["review_status"]')
assert_eq "ORD003 复核状态保持" "partial_approved" "$RS3W"

echo ""
echo "── ORD004: 未归还 + 仓库确认SN004在库 → WAREHOUSE_CONFIRMED"
R4W=$(curl -s "$BASE/api/arbitration/result?order_id=ORD004")
S4W=$(jq_val "$R4W" 'd["result"]["deposit_status"]')
assert_eq "ORD004 仓库补录后状态" "WAREHOUSE_CONFIRMED" "$S4W"
RF4W=$(jq_val "$R4W" 'd["result"]["refund_amount"]')
assert_eq "ORD004 仓库补录后退款(99*0.5=49.5)" "49.5" "$RF4W"
WI4=$(jq_val "$R4W" 'd["result"]["warehouse_impact"]["affected"]')
assert_eq "ORD004 仓库影响标记" "True" "$WI4"
assert_contains "ORD004 仓库影响描述含状态变更" "NOT_RETURNED" "$R4W"
assert_contains "ORD004 含warehouse_confirmed因子" "warehouse_confirmed" "$R4W"

echo ""
echo "── ORD004 退款拦截因状态变化需要重新复核"
RS4W=$(jq_val "$R4W" 'd["result"]["review_status"]')
assert_eq "ORD004 复核状态保持rejected" "rejected" "$RS4W"
RB4W=$(jq_val "$R4W" 'd["result"]["refund_blocked"]')
assert_eq "ORD004 退款仍拦截" "True" "$RB4W"

echo ""
echo "── ORD001/ORD002 不受仓库盘点影响"
R1W=$(curl -s "$BASE/api/arbitration/result?order_id=ORD001")
WI1=$(jq_val "$R1W" 'd["result"]["warehouse_impact"]')
assert_eq "ORD001 无仓库影响" "None" "$WI1"

R2W=$(curl -s "$BASE/api/arbitration/result?order_id=ORD002")
WI2=$(jq_val "$R2W" 'd["result"]["warehouse_impact"]')
assert_eq "ORD002 无仓库影响" "None" "$WI2"

echo ""
echo "── 导出验证：仓库影响明细"
EXPORT2=$(curl -s "$BASE/api/arbitration/export")
WA2=$(echo "$EXPORT2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['summary']['warehouse_affected']))")
assert_eq "仓库影响订单数" "2" "$WA2"
WA_DETAILS=$(echo "$EXPORT2" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for item in d['summary']['warehouse_affected']:
  print(f\"  订单{item['order_id']}: {', '.join(item['changes'])}\")
")
echo "$WA_DETAILS"

###############################################################################
echo ""
echo "═══ 第二遍全量重跑：幂等一致性验证 ═══"

echo ""
echo "▶ 重跑仲裁"
RERUN=$(curl -s -X POST "$BASE/api/arbitration/run" \
  -H "Content-Type: application/json" \
  -d '{"phase":"warehouse_update"}')

echo "▶ 逐一对比状态"
for OID in ORD001 ORD002 ORD003 ORD004 ORD005 ORD006; do
  R=$(curl -s "$BASE/api/arbitration/result?order_id=$OID")
  STATUS=$(jq_val "$R" 'd["result"]["deposit_status"]')
  REFUND=$(jq_val "$R" 'd["result"]["refund_amount"]')
  echo "  $OID: status=$STATUS refund=$REFUND"
done

echo ""
echo "▶ 对比第二遍与第一遍结果"
R3R=$(curl -s "$BASE/api/arbitration/result?order_id=ORD003")
S3R=$(jq_val "$R3R" 'd["result"]["deposit_status"]')
assert_eq "第二遍-ORD003状态" "REVIEW_REQUIRED" "$S3R"

R4R=$(curl -s "$BASE/api/arbitration/result?order_id=ORD004")
S4R=$(jq_val "$R4R" 'd["result"]["deposit_status"]')
assert_eq "第二遍-ORD004状态" "WAREHOUSE_CONFIRMED" "$S4R"

R5R=$(curl -s "$BASE/api/arbitration/result?order_id=ORD005")
S5R=$(jq_val "$R5R" 'd["result"]["deposit_status"]')
assert_eq "第二遍-ORD005状态" "DELAYED_RETURN" "$S5R"

R1R=$(curl -s "$BASE/api/arbitration/result?order_id=ORD001")
assert_contains "第二遍-ORD001重复退款" "duplicate_refund" "$R1R"

###############################################################################
echo ""
echo "═══ 完整重置后全量重跑：结果应与前序一致 ═══"

echo ""
echo "▶ 重置并重新导入全部数据"
curl -s -X POST "$BASE/api/reset" > /dev/null

curl -s -X POST "$BASE/api/import/rental-orders" \
  -H "Content-Type: application/json" \
  -d '[
    {"order_id":"ORD001","user_id":"U001","device_serial":"SN001","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD002","user_id":"U002","device_serial":"SN002","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD003","user_id":"U003","device_serial":"SN003","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD004","user_id":"U004","device_serial":"SN004","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD005","user_id":"U005","device_serial":"SN005","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"},
    {"order_id":"ORD006","user_id":"U006","device_serial":"SN006","deposit_amount":99,"rent_time":"2025-05-01T10:00:00","expected_return_time":"2025-05-01T18:00:00"}
  ]' > /dev/null

curl -s -X POST "$BASE/api/import/device-returns" \
  -H "Content-Type: application/json" \
  -d '[
    {"return_id":"RET001","device_serial":"SN001","return_time":"2025-05-01T17:00:00","return_station":"ST-A"},
    {"return_id":"RET002","device_serial":"SN002","return_time":"2025-05-02T10:00:00","return_station":"ST-B"},
    {"return_id":"RET003","device_serial":"SN099","return_time":"2025-05-01T17:00:00","return_station":"ST-A"},
    {"return_id":"RET005","device_serial":"SN005","return_time":"2025-05-03T20:00:00","return_station":"ST-C"},
    {"return_id":"RET006","device_serial":"SN006","return_time":"2025-05-01T18:30:00","return_station":"ST-D"}
  ]' > /dev/null

echo "▶ 验证重置后阶段一结果"
FRESH_R1=$(curl -s "$BASE/api/arbitration/result?order_id=ORD001")
FRESH_S1=$(jq_val "$FRESH_R1" 'd["result"]["deposit_status"]')
assert_eq "重置后-ORD001" "MATCHED" "$FRESH_S1"

FRESH_R3=$(curl -s "$BASE/api/arbitration/result?order_id=ORD003")
FRESH_S3=$(jq_val "$FRESH_R3" 'd["result"]["deposit_status"]')
assert_eq "重置后-ORD003" "SERIAL_MISMATCH" "$FRESH_S3"

FRESH_R4=$(curl -s "$BASE/api/arbitration/result?order_id=ORD004")
FRESH_S4=$(jq_val "$FRESH_R4" 'd["result"]["deposit_status"]')
assert_eq "重置后-ORD004" "NOT_RETURNED" "$FRESH_S4"

echo "▶ 导入仓库盘点（第二阶段）"
curl -s -X POST "$BASE/api/import/warehouse-inventory" \
  -H "Content-Type: application/json" \
  -d '[
    {"record_id":"WH001","device_serial":"SN003","device_status":"in_stock","check_time":"2025-05-05T10:00:00","location":"仓库A"},
    {"record_id":"WH002","device_serial":"SN004","device_status":"in_stock","check_time":"2025-05-05T10:00:00","location":"仓库B"}
  ]' > /dev/null

echo "▶ 验证仓库补录后结果与前面一致"
FRESH_R3W=$(curl -s "$BASE/api/arbitration/result?order_id=ORD003")
FRESH_S3W=$(jq_val "$FRESH_R3W" 'd["result"]["deposit_status"]')
assert_eq "重置重跑-ORD003仓库后" "REVIEW_REQUIRED" "$FRESH_S3W"

FRESH_R4W=$(curl -s "$BASE/api/arbitration/result?order_id=ORD004")
FRESH_S4W=$(jq_val "$FRESH_R4W" 'd["result"]["deposit_status"]')
assert_eq "重置重跑-ORD004仓库后" "WAREHOUSE_CONFIRMED" "$FRESH_S4W"

###############################################################################
echo ""
echo "========================================"
echo "  验收结果: 通过 $PASS / 总计 $TOTAL"
if [ "$FAIL" -eq 0 ]; then
  echo "  🎉 全部通过！"
else
  echo "  ⚠️  失败 $FAIL 项"
fi
echo "========================================"

exit $FAIL
