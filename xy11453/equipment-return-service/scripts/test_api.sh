#!/bin/bash

BASE_URL="http://localhost:8001"
API_KEY="equipment-return-2024"

echo "=============================================="
echo "设备租赁归还验收API测试脚本"
echo "=============================================="
echo ""

echo "1. 健康检查"
curl -s "${BASE_URL}/health"
echo ""
echo ""

echo "2. 创建出库单"
curl -s -X POST "${BASE_URL}/api/v1/warehouse-orders/" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "order_no": "WH-TEST-001",
    "customer_id": "C001",
    "customer_name": "测试客户",
    "equipment_type": "升降机",
    "equipment_code": "SHENG-001",
    "quantity": 3,
    "deposit_amount": 15000,
    "daily_rental": 200,
    "rental_days": 15,
    "operator": "张工"
  }'
echo ""
echo ""

echo "3. 查询出库单"
curl -s "${BASE_URL}/api/v1/warehouse-orders/WH-TEST-001" \
  -H "X-API-Key: ${API_KEY}"
echo ""
echo ""

echo "4. 创建归还记录 (第一批)"
curl -s -X POST "${BASE_URL}/api/v1/returns/" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "return_no": "RT-TEST-001",
    "warehouse_order_id": 1,
    "customer_id": "C001",
    "return_quantity": 1,
    "returned_equipment_codes": "SHENG-001-A",
    "condition_status": "minor_damage",
    "damage_description": "外壳轻微划痕",
    "is_partial": true,
    "batch_number": 1,
    "operator": "李仓管"
  }'
echo ""
echo ""

echo "5. 创建归还记录 (第二批)"
curl -s -X POST "${BASE_URL}/api/v1/returns/" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "return_no": "RT-TEST-002",
    "warehouse_order_id": 1,
    "customer_id": "C001",
    "return_quantity": 1,
    "returned_equipment_codes": "SHENG-001-B",
    "condition_status": "good",
    "is_partial": true,
    "batch_number": 2,
    "operator": "李仓管"
  }'
echo ""
echo ""

echo "6. 创建维修估价单"
curl -s -X POST "${BASE_URL}/api/v1/repair-estimates/" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "estimate_no": "RE-TEST-001",
    "warehouse_order_id": 1,
    "return_record_id": 1,
    "equipment_code": "SHENG-001-A",
    "damage_type": "外观损坏",
    "damage_description": "外壳划痕需要喷漆修复",
    "estimate_amount": 800,
    "parts_cost": 300,
    "labor_cost": 500,
    "is_customer_liable": true,
    "status": "approved",
    "reviewer": "王工"
  }'
echo ""
echo ""

echo "7. 计算押金扣减"
curl -s -X POST "${BASE_URL}/api/v1/reconciliation/deduction/calculate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "warehouse_order_no": "WH-TEST-001",
    "return_record_ids": [1, 2],
    "operator": "财务小王"
  }'
echo ""
echo ""

echo "8. 导出对账数据"
curl -s -X POST "${BASE_URL}/api/v1/exports/?export_type=full_reconciliation&include_evidence=true" \
  -H "X-API-Key: ${API_KEY}"
echo ""
echo ""

echo "9. 查询扣减记录"
curl -s "${BASE_URL}/api/v1/reconciliation/deductions/" \
  -H "X-API-Key: ${API_KEY}"
echo ""
echo ""

echo "10. 测试权限拦截 (无API Key)"
curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/warehouse-orders/"
echo " (应该返回401)"
echo ""

echo "=============================================="
echo "API测试完成!"
echo "=============================================="
