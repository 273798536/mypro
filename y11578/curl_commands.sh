#!/bin/bash

BASE_URL="http://localhost:8000"

echo "=========================================="
echo "外协加工对账验收回放链路服务 - curl命令集"
echo "=========================================="

echo ""
echo "【1】健康检查"
echo "curl $BASE_URL/api/health"
curl -s "$BASE_URL/api/health" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/health"

echo ""
echo "=========================================="
echo "【2】导入外协送货单"
echo "=========================================="
cat > /tmp/delivery.json << 'EOF'
[
    {
        "order_no": "DEL20240501001",
        "batch_no": "BATCH001",
        "product_name": "铝合金外壳",
        "product_code": "ALU-001",
        "quantity": 1000,
        "unit": "件",
        "delivery_date": "2024-05-01",
        "supplier": "宏达加工厂",
        "workshop": "机加工车间",
        "receiver": "张三",
        "remark": "首批送货"
    },
    {
        "order_no": "DEL20240501003",
        "batch_no": "BATCH001",
        "product_name": "铝合金外壳",
        "product_code": "ALU-001",
        "quantity": -50,
        "unit": "件",
        "delivery_date": "2024-05-03",
        "supplier": "宏达加工厂",
        "workshop": "机加工车间",
        "receiver": "张三",
        "remark": "数量负数异常"
    }
]
EOF
curl -s -X POST "$BASE_URL/api/delivery/import" \
    -H "Content-Type: application/json" \
    -d @/tmp/delivery.json | python3 -m json.tool

echo ""
echo "=========================================="
echo "【3】导入返修记录"
echo "=========================================="
cat > /tmp/repair.json << 'EOF'
[
    {
        "repair_no": "REP20240505001",
        "batch_no": "BATCH001",
        "product_name": "铝合金外壳",
        "product_code": "ALU-001",
        "repair_type": "尺寸偏差",
        "repair_quantity": 100,
        "return_quantity": 95,
        "unit": "件",
        "repair_date": "2024-05-05",
        "return_date": "2024-05-06",
        "supplier": "宏达加工厂",
        "defect_reason": "加工尺寸偏大",
        "responsible_party": "供应商"
    },
    {
        "repair_no": "REP20240507001",
        "batch_no": "BATCH001",
        "product_name": "铝合金外壳",
        "product_code": "ALU-001",
        "repair_type": "表面划痕",
        "repair_quantity": 50,
        "return_quantity": 48,
        "unit": "件",
        "repair_date": "2024-05-07",
        "return_date": "2024-05-08",
        "supplier": "宏达加工厂",
        "defect_reason": "运输过程划伤",
        "responsible_party": "物流"
    }
]
EOF
curl -s -X POST "$BASE_URL/api/repair/import" \
    -H "Content-Type: application/json" \
    -d @/tmp/repair.json | python3 -m json.tool

echo ""
echo "=========================================="
echo "【4】导入扣款明细"
echo "=========================================="
cat > /tmp/deduction.json << 'EOF'
[
    {
        "deduction_no": "DED20240506001",
        "batch_no": "BATCH001",
        "product_name": "铝合金外壳",
        "product_code": "ALU-001",
        "deduction_type": "返修扣款",
        "quantity": 100,
        "unit_price": 10,
        "amount": 1000,
        "deduction_date": "2024-05-06",
        "supplier": "宏达加工厂",
        "reason": "尺寸偏差返修",
        "related_order": "REP20240505001"
    },
    {
        "deduction_no": "DED20240510001",
        "batch_no": "BATCH001",
        "product_name": "铝合金外壳",
        "product_code": "ALU-001",
        "deduction_type": "返修扣款",
        "quantity": 50,
        "unit_price": 10,
        "amount": 600,
        "deduction_date": "2024-05-10",
        "supplier": "宏达加工厂",
        "reason": "表面划痕返修-金额错误",
        "related_order": "REP20240507001"
    }
]
EOF
curl -s -X POST "$BASE_URL/api/deduction/import" \
    -H "Content-Type: application/json" \
    -d @/tmp/deduction.json | python3 -m json.tool

echo ""
echo "=========================================="
echo "【5】导入退款流水"
echo "=========================================="
cat > /tmp/refund.json << 'EOF'
[
    {
        "refund_no": "REF20240510001",
        "batch_no": "BATCH001",
        "related_deduction": "DED20240506001",
        "amount": 200,
        "refund_date": "2024-05-10",
        "supplier": "宏达加工厂",
        "reason": "协商退款部分",
        "payment_method": "银行转账"
    }
]
EOF
curl -s -X POST "$BASE_URL/api/refund/import" \
    -H "Content-Type: application/json" \
    -d @/tmp/refund.json | python3 -m json.tool

echo ""
echo "=========================================="
echo "【6】查看脏记录列表"
echo "=========================================="
curl -s "$BASE_URL/api/dirty/list" | python3 -m json.tool

echo ""
echo "=========================================="
echo "【7】执行对账"
echo "=========================================="
curl -s -X POST "$BASE_URL/api/reconcile" \
    -H "Content-Type: application/json" \
    -d '{}' | python3 -m json.tool

echo ""
echo "=========================================="
echo "【8】查看对账结果列表"
echo "=========================================="
curl -s "$BASE_URL/api/reconciliation/list" | python3 -m json.tool

echo ""
echo "=========================================="
echo "【9】修正脏记录示例 (需替换实际ID)"
echo "=========================================="
echo 'curl -s -X POST "$BASE_URL/api/record/fix" \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{
    "id": 3,
    "table_name": "delivery_orders",
    "updates": {"quantity": 50},
    "operator": "admin"
}'"'"' | python3 -m json.tool'

echo ""
echo "=========================================="
echo "【10】导出对账结果 (需替换实际recon_no)"
echo "=========================================="
echo 'curl -s "$BASE_URL/api/export/RECONXXXXXX" -o recon_report.csv'

echo ""
echo "=========================================="
echo "【11】查看操作日志"
echo "=========================================="
curl -s "$BASE_URL/api/logs" | python3 -m json.tool

echo ""
echo "=========================================="
echo "命令执行完成!"
echo "=========================================="
