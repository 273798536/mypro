#!/bin/bash

BASE_URL="http://localhost:8000"

echo "=== 1. 健康检查 ==="
curl -s "$BASE_URL/api/health" | python3 -m json.tool

echo ""
echo "=== 2. 导入外协送货单 (含脏数据: 缺字段、改名、数量负数) ==="
curl -s -X POST "$BASE_URL/api/delivery/import" \
  -H "Content-Type: application/json" \
  -d '[
    {"order_no": "DEL20240501001", "batch_no": "BATCH001", "product_name": "铝合金外壳", "product_code": "ALU-001", "quantity": 1000, "unit": "件", "delivery_date": "2024-05-01", "supplier": "宏达加工厂"},
    {"order_no": "DEL20240501002", "batch_no": "BATCH002", "product_name": "不锈钢支架", "product_code": "SS-002", "quantity": 500, "unit": "件", "delivery_date": "2024-05-02", "supplier": "精工五金"},
    {"order_no": null, "batch_no": "BATCH003", "product_name": null, "product_code": "PL-003", "quantity": null, "delivery_date": null, "supplier": "诚信塑料"},
    {"order_no": "DEL20240501005", "batch_no": "BATCH001", "product_name": "铝壳改了名字", "product_code": "ALU-001", "quantity": 200, "delivery_date": "2024-05-04", "supplier": "宏达加工厂"}
  ]' | python3 -m json.tool

echo ""
echo "=== 3. 重复导入测试 (幂等性) ==="
curl -s -X POST "$BASE_URL/api/delivery/import" \
  -H "Content-Type: application/json" \
  -d '[{"order_no": "DEL20240501001", "batch_no": "BATCH001", "product_name": "铝合金外壳", "product_code": "ALU-001", "quantity": 1000, "unit": "件", "delivery_date": "2024-05-01", "supplier": "宏达加工厂"}]' | python3 -m json.tool

echo ""
echo "=== 4. 导入返修记录 ==="
curl -s -X POST "$BASE_URL/api/repair/import" \
  -H "Content-Type: application/json" \
  -d '[
    {"repair_no": "REP20240505001", "batch_no": "BATCH001", "product_name": "铝合金外壳", "repair_quantity": 100, "return_quantity": 95, "repair_date": "2024-05-05", "supplier": "宏达加工厂"},
    {"repair_no": "REP20240507001", "batch_no": "BATCH001", "product_name": "铝合金外壳", "repair_quantity": 50, "return_quantity": 48, "repair_date": "2024-05-07", "supplier": "宏达加工厂"}
  ]' | python3 -m json.tool

echo ""
echo "=== 5. 导入扣款明细 ==="
curl -s -X POST "$BASE_URL/api/deduction/import" \
  -H "Content-Type: application/json" \
  -d '[
    {"deduction_no": "DED20240506001", "batch_no": "BATCH001", "deduction_type": "返修扣款", "quantity": 100, "unit_price": 10, "amount": 1000, "deduction_date": "2024-05-06", "supplier": "宏达加工厂"},
    {"deduction_no": "DED20240510001", "batch_no": "BATCH001", "deduction_type": "返修扣款", "quantity": 50, "unit_price": 10, "amount": 600, "deduction_date": "2024-05-10", "supplier": "宏达加工厂"}
  ]' | python3 -m json.tool

echo ""
echo "=== 6. 查看脏记录清单 ==="
curl -s "$BASE_URL/api/dirty/list" | python3 -m json.tool

echo ""
echo "=== 7. 冻结批次 ==="
curl -s -X POST "$BASE_URL/api/batch/freeze" \
  -H "Content-Type: application/json" \
  -d '{"batch_no": "BATCH002", "freeze_reason": "对账锁定", "operator": "admin"}' | python3 -m json.tool

echo ""
echo "=== 8. 尝试向冻结批次导入数据 ==="
curl -s -X POST "$BASE_URL/api/delivery/import" \
  -H "Content-Type: application/json" \
  -d '[{"order_no": "DEL-TEST-FROZEN", "batch_no": "BATCH002", "quantity": 100, "delivery_date": "2024-05-15", "supplier": "测试供应商"}]' | python3 -m json.tool

echo ""
echo "=== 9. 执行对账 ==="
curl -s -X POST "$BASE_URL/api/reconcile" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

echo ""
echo "=== 10. 对账结果列表 ==="
curl -s "$BASE_URL/api/reconciliation/list" | python3 -m json.tool

echo ""
echo "=== 11. 添加补偿记录 ==="
curl -s -X POST "$BASE_URL/api/compensation/add" \
  -H "Content-Type: application/json" \
  -d '{"batch_no": "BATCH001", "amount": 200, "reason": "多扣款补偿", "operator": "admin"}' | python3 -m json.tool

echo ""
echo "=== 12. 重新对账 ==="
curl -s -X POST "$BASE_URL/api/reconcile" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

echo ""
echo "=== 13. 操作日志 ==="
curl -s "$BASE_URL/api/logs" | python3 -m json.tool
