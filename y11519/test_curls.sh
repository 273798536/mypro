#!/bin/bash

BASE_URL="http://localhost:8000"

echo "========================================="
echo "水务抢修材料权限追责台账 API - 测试脚本"
echo "========================================="

echo ""
echo "=== 1. 健康检查 ==="
curl -s "$BASE_URL/api/health" | python3 -m json.tool
sleep 1

echo ""
echo "=== 2. 创建用户角色 ==="
echo ""
echo "创建站点负责人:"
curl -s -X POST "$BASE_URL/api/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "site_manager_01",
    "role": "站点负责人",
    "site_name": "东湖水厂"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "创建操作员:"
curl -s -X POST "$BASE_URL/api/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "operator_01",
    "role": "操作员"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "=== 3. 创建草稿台账 ==="
echo ""
echo "创建夜间抢修材料记录（负库存）:"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/ledgers/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH-20240524-001",
    "material_name": "DN100阀门",
    "material_code": "VALVE-DN100-001",
    "quantity": -5,
    "unit": "个",
    "source": "派工单",
    "work_order_no": "WO-20240524-001",
    "site_name": "东湖水厂",
    "is_negative_inventory": true,
    "repair_time": "2024-05-24T02:30:00",
    "photo_urls": ["photo1.jpg", "photo2.jpg"],
    "sms_content": "紧急抢修，先领用5个DN100阀门",
    "remark": "夜间抢修先用料后补录",
    "sensitive_fields": {"sms_content": true, "remark": false},
    "created_by": "operator_01",
    "operator": "operator_01"
  }')
echo "$RESPONSE" | python3 -m json.tool
LEDGER_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "台账ID: $LEDGER_ID"
sleep 1

echo ""
echo "=== 4. 提交审核 ==="
curl -s -X POST "$BASE_URL/api/ledgers/status-transition" \
  -H "Content-Type: application/json" \
  -d "{
    \"ledger_id\": $LEDGER_ID,
    \"to_status\": \"已提交\",
    \"operator\": \"operator_01\",
    \"role\": \"操作员\",
    \"reason\": \"夜间抢修记录提交审核\"
  }" | python3 -m json.tool
sleep 1

echo ""
echo "=== 5. 驳回 ==="
curl -s -X POST "$BASE_URL/api/ledgers/status-transition" \
  -H "Content-Type: application/json" \
  -d "{
    \"ledger_id\": $LEDGER_ID,
    \"to_status\": \"已驳回\",
    \"operator\": \"site_manager_01\",
    \"role\": \"站点负责人\",
    \"reason\": \"缺少现场照片，请补充\"
  }" | python3 -m json.tool
sleep 1

echo ""
echo "=== 6. 更新台账（补充照片） ==="
curl -s -X PUT "$BASE_URL/api/ledgers/$LEDGER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "photo_urls": ["photo1.jpg", "photo2.jpg", "photo3_abnormal.jpg"],
    "source": "异常照片",
    "operator": "operator_01",
    "change_reason": "补充异常现场照片"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "=== 7. 二次确认 ==="
curl -s -X POST "$BASE_URL/api/ledgers/status-transition" \
  -H "Content-Type: application/json" \
  -d "{
    \"ledger_id\": $LEDGER_ID,
    \"to_status\": \"二次确认\",
    \"operator\": \"site_manager_01\",
    \"role\": \"站点负责人\",
    \"reason\": \"材料信息确认无误，负库存记录已核实\"
  }" | python3 -m json.tool
sleep 1

echo ""
echo "=== 8. 标记为只读审计 ==="
curl -s -X POST "$BASE_URL/api/ledgers/status-transition" \
  -H "Content-Type: application/json" \
  -d "{
    \"ledger_id\": $LEDGER_ID,
    \"to_status\": \"只读审计\",
    \"operator\": \"site_manager_01\",
    \"role\": \"站点负责人\",
    \"reason\": \"审计归档\"
  }" | python3 -m json.tool
sleep 1

echo ""
echo "=== 9. 查看状态流转历史 ==="
curl -s "$BASE_URL/api/ledgers/$LEDGER_ID/status-history" | python3 -m json.tool
sleep 1

echo ""
echo "=== 10. 查看变更历史 ==="
curl -s "$BASE_URL/api/ledgers/$LEDGER_ID/change-history" | python3 -m json.tool
sleep 1

echo ""
echo "=== 11. 批次同步（追加策略） ==="
curl -s -X POST "$BASE_URL/api/batch/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH-20240524-002",
    "materials": [
      {
        "material_name": "密封圈",
        "material_code": "SEAL-001",
        "quantity": 10,
        "unit": "个",
        "source": "阀门库存",
        "work_order_no": "WO-20240524-001",
        "site_name": "东湖水厂",
        "created_by": "operator_01",
        "operator": "operator_01"
      },
      {
        "material_name": "螺栓",
        "material_code": "BOLT-M10",
        "quantity": 20,
        "unit": "套",
        "source": "短信截图",
        "work_order_no": "WO-20240524-001",
        "site_name": "东湖水厂",
        "sms_content": "补充20套M10螺栓",
        "sensitive_fields": {"sms_content": true},
        "created_by": "operator_01",
        "operator": "operator_01"
      }
    ],
    "sync_strategy": "追加",
    "operator": "operator_01"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "=== 12. 批次同步（覆盖策略） ==="
curl -s -X POST "$BASE_URL/api/batch/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH-20240524-002",
    "materials": [
      {
        "material_name": "密封圈（更新）",
        "material_code": "SEAL-001",
        "quantity": 15,
        "unit": "个",
        "source": "阀门库存",
        "work_order_no": "WO-20240524-001",
        "site_name": "东湖水厂",
        "created_by": "operator_01",
        "operator": "operator_01"
      }
    ],
    "sync_strategy": "覆盖",
    "operator": "operator_01"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "=== 13. 查看失败任务清单 ==="
curl -s "$BASE_URL/api/tasks/failed/summary" | python3 -m json.tool
sleep 1

echo ""
echo "=== 14. 站点负责人角色视图 ==="
curl -s -X POST "$BASE_URL/api/role-view/" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "站点负责人",
    "site_name": "东湖水厂",
    "username": "site_manager_01"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "=== 15. 脱敏导出 ==="
curl -s -X POST "$BASE_URL/api/export/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH-20240524-002",
    "desensitize": true,
    "operator": "site_manager_01"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "========================================="
echo "测试完成！请检查以上输出是否符合预期"
echo "========================================="
