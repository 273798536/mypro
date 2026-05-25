#!/bin/bash

BASE_URL="http://localhost:8000"

echo "========================================="
echo "水务抢修材料权限追责台账 API - 测试脚本"
echo "========================================="

echo ""
echo "=== 1. 健康检查（验证调度器状态） ==="
curl -s "$BASE_URL/api/health" | python3 -m json.tool
sleep 1

echo ""
echo "=== 2. 管理员登录并创建用户角色 ==="
echo ""
echo "管理员登录:"
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login?username=admin")
echo "$ADMIN_LOGIN" | python3 -m json.tool
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
echo "管理员Token: $ADMIN_TOKEN"
sleep 1

echo ""
echo "创建站点负责人:"
curl -s -X POST "$BASE_URL/api/users/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
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
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "operator_01",
    "role": "操作员"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "创建审计员:"
curl -s -X POST "$BASE_URL/api/users/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "auditor_01",
    "role": "审计员"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "=== 3. 各角色登录获取Token ==="
echo ""
echo "操作员登录:"
OPERATOR_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login?username=operator_01")
echo "$OPERATOR_LOGIN" | python3 -m json.tool
OPERATOR_TOKEN=$(echo "$OPERATOR_LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
echo "操作员Token: $OPERATOR_TOKEN"
sleep 1

echo ""
echo "站点负责人登录:"
MANAGER_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login?username=site_manager_01")
echo "$MANAGER_LOGIN" | python3 -m json.tool
MANAGER_TOKEN=$(echo "$MANAGER_LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
echo "站点负责人Token: $MANAGER_TOKEN"
sleep 1

echo ""
echo "审计员登录:"
AUDITOR_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login?username=auditor_01")
echo "$AUDITOR_LOGIN" | python3 -m json.tool
AUDITOR_TOKEN=$(echo "$AUDITOR_LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
echo "审计员Token: $AUDITOR_TOKEN"
sleep 1

echo ""
echo "=== 4. 创建草稿台账（需操作员Token） ==="
echo ""
echo "创建夜间抢修材料记录（负库存）:"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/ledgers/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -d '{
    "batch_no": "BATCH-20240525-001",
    "material_name": "DN100阀门",
    "material_code": "VALVE-DN100-001",
    "quantity": -5,
    "unit": "个",
    "source": "派工单",
    "work_order_no": "WO-20240525-001",
    "site_name": "东湖水厂",
    "is_negative_inventory": true,
    "repair_time": "2024-05-25T02:30:00",
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
echo "=== 5. 提交审核 ==="
curl -s -X POST "$BASE_URL/api/ledgers/status-transition" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -d "{
    \"ledger_id\": $LEDGER_ID,
    \"to_status\": \"已提交\",
    \"operator\": \"operator_01\",
    \"role\": \"操作员\",
    \"reason\": \"夜间抢修记录提交审核\"
  }" | python3 -m json.tool
sleep 1

echo ""
echo "=== 6. 驳回（站点负责人） ==="
curl -s -X POST "$BASE_URL/api/ledgers/status-transition" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d "{
    \"ledger_id\": $LEDGER_ID,
    \"to_status\": \"已驳回\",
    \"operator\": \"site_manager_01\",
    \"role\": \"站点负责人\",
    \"reason\": \"缺少现场照片，请补充\"
  }" | python3 -m json.tool
sleep 1

echo ""
echo "=== 7. 更新台账（补充照片） ==="
curl -s -X PUT "$BASE_URL/api/ledgers/$LEDGER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -d '{
    "photo_urls": ["photo1.jpg", "photo2.jpg", "photo3_abnormal.jpg"],
    "source": "异常照片",
    "operator": "operator_01",
    "change_reason": "补充异常现场照片"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "=== 8. 二次确认 ==="
curl -s -X POST "$BASE_URL/api/ledgers/status-transition" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d "{
    \"ledger_id\": $LEDGER_ID,
    \"to_status\": \"二次确认\",
    \"operator\": \"site_manager_01\",
    \"role\": \"站点负责人\",
    \"reason\": \"材料信息确认无误，负库存记录已核实\"
  }" | python3 -m json.tool
sleep 1

echo ""
echo "=== 9. 标记为只读审计 ==="
curl -s -X POST "$BASE_URL/api/ledgers/status-transition" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d "{
    \"ledger_id\": $LEDGER_ID,
    \"to_status\": \"只读审计\",
    \"operator\": \"site_manager_01\",
    \"role\": \"站点负责人\",
    \"reason\": \"审计归档\"
  }" | python3 -m json.tool
sleep 1

echo ""
echo "=== 9.1 验证只读审计状态下不可修改 ==="
echo "操作员尝试修改只读台账（应返回403）:"
curl -s -X PUT "$BASE_URL/api/ledgers/$LEDGER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -d '{
    "material_name": "审计后仍可改",
    "operator": "operator_01",
    "change_reason": "测试只读状态"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "验证台账数据未被修改:"
curl -s "$BASE_URL/api/ledgers/$LEDGER_ID" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'材料名: {d[\"material_name\"]}, 状态: {d[\"status\"]}')"
sleep 1

echo ""
echo "=== 10. 查看状态流转历史 ==="
curl -s "$BASE_URL/api/ledgers/$LEDGER_ID/status-history" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" | python3 -m json.tool
sleep 1

echo ""
echo "=== 11. 查看变更历史 ==="
curl -s "$BASE_URL/api/ledgers/$LEDGER_ID/change-history" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" | python3 -m json.tool
sleep 1

echo ""
echo "=== 12. 批次同步（追加策略） ==="
curl -s -X POST "$BASE_URL/api/batch/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -d '{
    "batch_no": "BATCH-20240525-002",
    "materials": [
      {
        "material_name": "密封圈",
        "material_code": "SEAL-001",
        "quantity": 10,
        "unit": "个",
        "source": "阀门库存",
        "work_order_no": "WO-20240525-001",
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
        "work_order_no": "WO-20240525-001",
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
echo "=== 13. 批次同步（覆盖策略） ==="
curl -s -X POST "$BASE_URL/api/batch/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -d '{
    "batch_no": "BATCH-20240525-002",
    "materials": [
      {
        "material_name": "密封圈（更新）",
        "material_code": "SEAL-001",
        "quantity": 15,
        "unit": "个",
        "source": "阀门库存",
        "work_order_no": "WO-20240525-001",
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
echo "=== 14. 脱敏导出（审计员权限）- 验证导出状态链 ==="
echo ""
echo "导出前查看台账状态:"
curl -s "$BASE_URL/api/ledgers/$LEDGER_ID" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'状态: {d[\"status\"]}')"
sleep 1

echo ""
echo "执行导出:"
EXPORT_RESULT=$(curl -s -X POST "$BASE_URL/api/export/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" \
  -d "{
    \"ledger_ids\": [$LEDGER_ID],
    \"desensitize\": true,
    \"operator\": \"auditor_01\"
  }")
echo "$EXPORT_RESULT" | python3 -m json.tool
sleep 1

echo ""
echo "导出后查看台账状态（应为'已导出'）:"
curl -s "$BASE_URL/api/ledgers/$LEDGER_ID" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'状态: {d[\"status\"]}')"
sleep 1

echo ""
echo "导出后查看状态历史（应包含'已导出'记录）:"
curl -s "$BASE_URL/api/ledgers/$LEDGER_ID/status-history" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" | python3 -m json.tool
sleep 1

echo ""
echo "=== 14.1 验证已导出终态不可再流转 ==="
echo "尝试将已导出台账流转回'已提交'（应返回403）:"
curl -s -X POST "$BASE_URL/api/ledgers/status-transition" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" \
  -d "{
    \"ledger_id\": $LEDGER_ID,
    \"to_status\": \"已提交\",
    \"operator\": \"auditor_01\",
    \"role\": \"审计员\",
    \"reason\": \"测试终态流转\"
  }" | python3 -m json.tool
sleep 1

echo ""
echo "验证台账状态仍为'已导出':"
curl -s "$BASE_URL/api/ledgers/$LEDGER_ID" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'状态: {d[\"status\"]}')"
sleep 1

echo ""
echo "=== 15. 查看失败任务清单 ==="
curl -s "$BASE_URL/api/tasks/failed/summary" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" | python3 -m json.tool
sleep 1

echo ""
echo "=== 16. 创建一个会失败的异步任务（验证失败恢复） ==="
FAILED_TASK=$(curl -s -X POST "$BASE_URL/api/tasks/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -d '{
    "task_name": "测试失败任务",
    "task_type": "sync_batch",
    "batch_no": "BATCH-FAILED-001",
    "sync_strategy": "追加",
    "payload": {
      "batch_no": "BATCH-FAILED-001",
      "materials": [
        {
          "material_name": "测试失败材料",
          "material_code": "FAILED-001",
          "quantity": 10,
          "unit": "个",
          "source": "派工单",
          "created_by": "operator_01"
        }
      ],
      "sync_strategy": "追加"
    },
    "max_retries": 3
  }')
echo "$FAILED_TASK" | python3 -m json.tool
FAILED_TASK_ID=$(echo "$FAILED_TASK" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "失败任务ID: $FAILED_TASK_ID"
sleep 2

echo ""
echo "查看任务状态:"
curl -s "$BASE_URL/api/tasks/$FAILED_TASK_ID" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" | python3 -m json.tool
sleep 1

echo ""
echo "=== 17. 查看调度器状态 ==="
curl -s "$BASE_URL/api/health" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'调度器: {d[\"scheduler\"]}')"
sleep 1

echo ""
echo "=== 18. 站点负责人角色视图 ==="
curl -s -X POST "$BASE_URL/api/role-view/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d '{
    "role": "站点负责人",
    "site_name": "东湖水厂",
    "username": "site_manager_01"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "=== 19. 测试权限边界 - 站点负责人尝试修改其他站点数据 ==="
echo ""
echo "创建其他站点数据:"
OTHER_LEDGER=$(curl -s -X POST "$BASE_URL/api/ledgers/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -d '{
    "batch_no": "BATCH-OTHER-001",
    "material_name": "其他站点材料",
    "material_code": "OTHER-001",
    "quantity": 10,
    "unit": "个",
    "source": "派工单",
    "work_order_no": "WO-OTHER-001",
    "site_name": "西湖水厂",
    "created_by": "operator_01",
    "operator": "operator_01"
  }')
OTHER_LEDGER_ID=$(echo "$OTHER_LEDGER" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "其他站点台账ID: $OTHER_LEDGER_ID"
sleep 1

echo ""
echo "站点负责人查看其他站点数据（应返回403）:"
curl -s "$BASE_URL/api/ledgers/$OTHER_LEDGER_ID" \
  -H "Authorization: Bearer $MANAGER_TOKEN" | python3 -m json.tool
sleep 1

echo ""
echo "站点负责人更新其他站点数据（应返回403）:"
curl -s -X PUT "$BASE_URL/api/ledgers/$OTHER_LEDGER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d '{
    "material_name": "越权修改",
    "operator": "site_manager_01",
    "change_reason": "测试越权修改"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "站点负责人状态流转其他站点数据（应返回403）:"
curl -s -X POST "$BASE_URL/api/ledgers/status-transition" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d "{
    \"ledger_id\": $OTHER_LEDGER_ID,
    \"to_status\": \"已提交\",
    \"operator\": \"site_manager_01\",
    \"role\": \"站点负责人\",
    \"reason\": \"测试越权流转\"
  }" | python3 -m json.tool
sleep 1

echo ""
echo "验证其他站点台账数据未被修改（用操作员Token查看）:"
curl -s "$BASE_URL/api/ledgers/$OTHER_LEDGER_ID" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'材料名: {d[\"material_name\"]}, 状态: {d[\"status\"]}')"
sleep 1

echo ""
echo "=== 20. 测试无Token访问（验证鉴权） ==="
echo ""
echo "无Token创建台账（应返回401）:"
curl -s -X POST "$BASE_URL/api/ledgers/" \
  -H "Content-Type: application/json" \
  -d '{
    "material_name": "测试材料",
    "created_by": "test",
    "operator": "test"
  }' | python3 -m json.tool
sleep 1

echo ""
echo "========================================="
echo "测试完成！请检查以上输出是否符合预期"
echo "========================================="
echo ""
echo "核心验证点:"
echo "1. 导出后台账状态是否变为'已导出'"
echo "2. 导出后状态历史是否包含导出记录"
echo "3. 失败任务是否被正确处理"
echo "4. 调度器是否正常运行"
echo "5. 权限边界是否生效（查看/更新/流转均返回403）"
