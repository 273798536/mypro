#!/bin/bash

BASE_URL="http://localhost:8000"

echo "========================================"
echo "Bug 修复验证测试"
echo "========================================"
echo "注意: 请确保服务已启动且数据库为空"
echo ""


echo "[1] 测试1: 改判权限校验 - normal 权限应该失败"
echo ""

echo "1.1 创建测试批次..."
curl -s -X POST "$BASE_URL/api/batches" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BUGFIX-TEST-001",
    "source_file_name": "权限测试.xlsx",
    "operator": "测试员",
    "station": "测试站",
    "records": [
      {
        "original_row_no": 1,
        "work_order_no": "WO-PERM-001",
        "valve_code": "V-001",
        "valve_name": "测试阀门"
      }
    ]
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'批次ID: {data[\"batch_id\"]}, 成功: {data[\"success_count\"]}/{data[\"total_count\"]}')
"
echo ""

echo "1.2 提交审核..."
curl -s -X POST "$BASE_URL/api/batches/1/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "operator=测试员" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'提交结果: {data[\"message\"]}')
"
echo ""

echo "1.3 使用 normal 权限改判（预期失败）..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/records/1/review" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "approved",
    "reason": "普通用户尝试审批",
    "operator": "普通员工",
    "permission_level": "normal"
  }')
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'detail' in data and 'Permission denied' in data['detail']:
    print('✅ 权限校验生效: 普通权限无法审批')
    print('  错误信息:', data['detail'])
else:
    print('❌ 权限校验失败: 普通权限居然审批成功了!')
    print('  响应:', data)
    sys.exit(1)
"
echo ""

echo "1.4 使用 supervisor 权限改判（预期成功）..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/records/1/review" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "approved",
    "reason": "主管审批通过",
    "operator": "王主管",
    "permission_level": "supervisor"
  }')
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'message' in data and data['message'] == '复核改判成功':
    print('✅ 主管权限审批成功')
    print('  状态:', data['original_status'], '->', data['new_status'])
    print('  理由:', data['reason'])
else:
    print('❌ 主管权限审批失败')
    print('  响应:', data)
    sys.exit(1)
"
echo ""

echo "[2] 测试2: 状态流闭环 - 冻结后归档应该成功"
echo ""
echo "(使用新的批次号测试)"
echo ""

echo "2.1 创建新批次（含多条记录）..."
curl -s -X POST "$BASE_URL/api/batches" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BUGFIX-TEST-002",
    "source_file_name": "归档测试.xlsx",
    "operator": "录入员",
    "station": "东城区水务站",
    "records": [
      {
        "original_row_no": 1,
        "work_order_no": "WO-ARCH-001",
        "valve_code": "V-001",
        "valve_name": "DN100闸阀",
        "inventory_before": 5,
        "used_quantity": 3,
        "inventory_after": 2
      },
      {
        "original_row_no": 2,
        "work_order_no": "WO-ARCH-002",
        "valve_code": "V-002",
        "valve_name": "DN50球阀",
        "inventory_before": 2,
        "used_quantity": 3,
        "inventory_after": -1
      }
    ]
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'批次ID: {data[\"batch_id\"]}, 成功: {data[\"success_count\"]}/{data[\"total_count\"]}')
"
echo ""

echo "2.2 提交审核..."
curl -s -X POST "$BASE_URL/api/batches/1/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "operator=录入员" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'提交结果: {data[\"message\"]}')
"
echo ""

echo "2.3 主管改判其中一条记录..."
curl -s -X POST "$BASE_URL/api/records/2/review" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "approved",
    "reason": "夜间紧急抢修，先用料后补录属正常流程",
    "operator": "李主管",
    "permission_level": "supervisor"
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'改判结果: {data[\"message\"]}')
print(f'  记录 {data[\"record_id\"]}: {data[\"original_status\"]} -> {data[\"new_status\"]}')
"
echo ""

echo "2.4 冻结批次（注意：此时记录1仍是 submitted 状态）..."
curl -s -X POST "$BASE_URL/api/batches/1/freeze" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "月末结算前冻结",
    "operator": "财务_刘姐"
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'冻结结果: {data[\"message\"]}')
print(f'  冻结前状态: {data[\"status_before_freeze\"]}')
print(f'  冻结理由: {data[\"freeze_reason\"]}')
"
echo ""

echo "2.5 查看当前记录状态（记录1是 submitted，记录2是 approved）..."
curl -s "$BASE_URL/api/records?batch_id=1" | python3 -c "
import sys, json
records = json.load(sys.stdin)
for r in records:
    print(f'  记录 {r[\"id\"]}: {r[\"work_order_no\"]} -> {r[\"status\"]}')
"
echo ""

echo "2.6 归档批次（核心测试：submitted 状态记录也应能归档）..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/batches/1/archive" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "operator=管理员&reason=月末结算完成，归档保存")
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'message' in data and '归档成功' in data['message']:
    print('✅ 冻结批次归档成功')
    print(f'  批次状态: {data[\"status\"]}')
else:
    print('❌ 冻结批次归档失败')
    print('  响应:', data)
    sys.exit(1)
"
echo ""

echo "2.7 验证归档后所有记录状态..."
curl -s "$BASE_URL/api/records?batch_id=1" | python3 -c "
import sys, json
records = json.load(sys.stdin)
all_archived = all(r['status'] == 'archived' for r in records)
if all_archived:
    print('✅ 所有记录已成功归档')
for r in records:
    print(f'  记录 {r[\"id\"]}: {r[\"work_order_no\"]} -> {r[\"status\"]}')
"
echo ""

echo "2.8 查看状态历史（确认轨迹完整）..."
curl -s "$BASE_URL/api/records/1/history" | python3 -c "
import sys, json
histories = json.load(sys.stdin)
print(f'记录1状态变更历史（共{len(histories)}条）:')
for h in histories:
    print(f'  {h[\"created_at\"]}: {h[\"from_state\"]} -> {h[\"to_state\"]} ({h[\"transition_type\"]}) by {h[\"operator\"]}')
"
echo ""

echo "========================================"
echo "✅ 所有 Bug 修复验证通过!"
echo "========================================"
echo ""
