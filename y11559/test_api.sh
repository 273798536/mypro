#!/bin/bash

BASE_URL="http://localhost:8001"

echo "=== 农资门店配送权限追责台账 API 测试脚本 ==="
echo ""

echo "1. 检查服务状态"
curl -s "$BASE_URL/api/health/" | python3 -m json.tool
echo ""

echo "2. 查看系统用户"
curl -s "$BASE_URL/api/users/" | python3 -m json.tool
echo ""

BATCH_NO="BATCH-$(date +%Y%m%d)-001"
echo "使用批次号: $BATCH_NO"
echo ""

echo "3. 创建门店订单（农忙赊销+缺货替代）"
curl -s -X POST "$BASE_URL/api/orders/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "'"$BATCH_NO"'",
    "order_no": "ORDER-2024-001",
    "store_name": "南京栖霞农资店",
    "store_address": "南京市栖霞区某某路123号",
    "store_manager": "陈老板",
    "store_phone": "13812345678",
    "product_name": "尿素",
    "quantity": 500,
    "unit": "公斤",
    "unit_price": 2.5,
    "total_amount": 1250,
    "is_credit": true,
    "credit_amount": 1250,
    "is_out_of_stock": false,
    "payment_status": "unpaid",
    "remark": "农忙季节赊销，月底回款",
    "created_by": 3,
    "change_reason": "农忙紧急订单",
    "duplicate_strategy": "ignore"
  }' | python3 -m json.tool
echo ""

echo "4. 同一订单号再次提交（测试忽略策略）"
curl -s -X POST "$BASE_URL/api/orders/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "'"$BATCH_NO"'",
    "order_no": "ORDER-2024-001",
    "store_name": "南京栖霞农资店",
    "product_name": "尿素",
    "quantity": 600,
    "unit": "公斤",
    "created_by": 3,
    "duplicate_strategy": "ignore"
  }' | python3 -m json.tool
echo ""

echo "5. 同一订单号使用覆盖策略"
curl -s -X POST "$BASE_URL/api/orders/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "'"$BATCH_NO"'",
    "order_no": "ORDER-2024-001",
    "store_name": "南京栖霞农资店",
    "product_name": "复合肥",
    "quantity": 500,
    "unit": "公斤",
    "unit_price": 3.0,
    "total_amount": 1500,
    "is_out_of_stock": true,
    "substitute_product": "尿素缺货，改用复合肥",
    "created_by": 3,
    "change_reason": "尿素缺货，替换产品",
    "duplicate_strategy": "overwrite"
  }' | python3 -m json.tool
echo ""

echo "6. 创建第二笔订单"
curl -s -X POST "$BASE_URL/api/orders/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "'"$BATCH_NO"'",
    "order_no": "ORDER-2024-002",
    "store_name": "南京江宁农资店",
    "store_address": "南京市江宁区某某路456号",
    "store_manager": "王店长",
    "store_phone": "13987654321",
    "product_name": "农药-杀虫剂",
    "quantity": 50,
    "unit": "瓶",
    "unit_price": 25,
    "total_amount": 1250,
    "is_credit": false,
    "created_by": 3,
    "duplicate_strategy": "ignore"
  }' | python3 -m json.tool
echo ""

echo "7. 提交订单工作流（草稿 -> 提交）"
curl -s -X POST "$BASE_URL/api/orders/1/workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit",
    "operator_id": 3,
    "change_reason": "门店确认，提交审核"
  }' | python3 -m json.tool
echo ""

echo "8. 驳回订单（提交 -> 驳回）"
curl -s -X POST "$BASE_URL/api/orders/1/workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reject",
    "operator_id": 2,
    "change_reason": "回款对不上，请核对金额"
  }' | python3 -m json.tool
echo ""

echo "9. 修改订单信息"
curl -s -X PUT "$BASE_URL/api/orders/1?operator_id=3" \
  -H "Content-Type: application/json" \
  -d '{
    "total_amount": 1350,
    "credit_amount": 1350,
    "change_reason": "修正计算错误，每公斤2.7元"
  }' | python3 -m json.tool
echo ""

echo "10. 二次确认订单"
curl -s -X POST "$BASE_URL/api/orders/1/workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "second_confirm",
    "operator_id": 2,
    "change_reason": "金额核对无误，二次确认通过"
  }' | python3 -m json.tool
echo ""

echo "11. 创建司机轨迹"
curl -s -X POST "$BASE_URL/api/trajectories/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "'"$BATCH_NO"'",
    "trajectory_no": "TRAJ-2024-001",
    "order_id": 1,
    "driver_name": "王司机",
    "driver_phone": "13600136000",
    "vehicle_no": "苏A-12345",
    "start_point": "南京仓库",
    "end_point": "南京栖霞农资店",
    "current_location": "南京市玄武区",
    "latitude": 32.06,
    "longitude": 118.80,
    "created_by": 4
  }' | python3 -m json.tool
echo ""

echo "12. 创建签收欠条"
curl -s -X POST "$BASE_URL/api/receipts/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "'"$BATCH_NO"'",
    "receipt_no": "RECP-2024-001",
    "order_id": 1,
    "store_name": "南京栖霞农资店",
    "receiver_name": "陈老板",
    "receiver_phone": "13812345678",
    "receiver_id_card": "320101198001011234",
    "product_name": "复合肥",
    "quantity": 500,
    "unit": "公斤",
    "is_iou": true,
    "iou_amount": 1350,
    "remark": "签收确认，欠款月底结清",
    "created_by": 4
  }' | python3 -m json.tool
echo ""

echo "13. 创建门店交接纸"
curl -s -X POST "$BASE_URL/api/handovers/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "'"$BATCH_NO"'",
    "handover_no": "HAND-2024-001",
    "order_id": 1,
    "store_name": "南京栖霞农资店",
    "handover_from": "王司机",
    "handover_to": "陈老板",
    "product_list": [{"name": "复合肥", "qty": 500}],
    "total_quantity": 500,
    "total_amount": 1350,
    "is_credit_handover": true,
    "credit_amount": 1350,
    "handover_remark": "货物交接完成，款项待结",
    "created_by": 3
  }' | python3 -m json.tool
echo ""

echo "14. 创建客服备注"
curl -s -X POST "$BASE_URL/api/remarks/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "'"$BATCH_NO"'",
    "remark_no": "REM-2024-001",
    "order_id": 1,
    "cs_staff_name": "赵客服",
    "remark_type": "客户投诉",
    "content": "客户反映送货延迟1天，要求下次提前通知",
    "is_sensitive": false,
    "created_by": 5
  }' | python3 -m json.tool
echo ""

echo "15. 查看审计日志（按批次）"
curl -s "$BASE_URL/api/audit-logs/?batch_no=$BATCH_NO" | python3 -m json.tool
echo ""

echo "16. 查看变更历史（按批次）"
curl -s "$BASE_URL/api/change-histories/?batch_no=$BATCH_NO" | python3 -m json.tool
echo ""

echo "17. 创建模拟失败的异步任务 (001-003)"
for i in 1 2 3; do
  curl -s -X POST "$BASE_URL/api/async-tasks/" \
    -H "Content-Type: application/json" \
    -d "{
      \"task_id\": \"TASK-EXPORT-00${i}\",
      \"task_type\": \"data_export\",
      \"batch_no\": \"'$BATCH_NO'\",
      \"payload\": {\"format\": \"excel\"},
      \"max_retries\": 3,
      \"created_by\": 2
    }" > /dev/null
done
echo "已创建 TASK-EXPORT-001、TASK-EXPORT-002、TASK-EXPORT-003 三个任务"
curl -s "$BASE_URL/api/async-tasks/failed/" | python3 -m json.tool
echo ""

echo "18. 查看片区经理角色视图"
curl -s "$BASE_URL/api/views/area-manager/?batch_no=$BATCH_NO" | python3 -m json.tool
echo ""

echo "19. 脱敏导出数据（店员角色）"
curl -s -X POST "$BASE_URL/api/export/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "'"$BATCH_NO"'",
    "export_format": "json",
    "desensitize": true,
    "role": "store_clerk"
  }' | python3 -m json.tool
echo ""

echo "20. 查看订单详情（关联所有数据）"
curl -s "$BASE_URL/api/orders/1" | python3 -m json.tool
echo ""

echo "=== 修复验证测试 ==="
echo ""

echo "21. 测试 append 策略（同订单号追加）"
curl -s -X POST "$BASE_URL/api/orders/" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "'"$BATCH_NO"'",
    "order_no": "ORDER-2024-001",
    "store_name": "南京栖霞农资店",
    "product_name": "尿素",
    "quantity": 300,
    "unit": "公斤",
    "unit_price": 2.5,
    "total_amount": 750,
    "is_credit": true,
    "credit_amount": 750,
    "remark": "追加补货订单",
    "created_by": 3,
    "change_reason": "追加送货，农忙补货",
    "duplicate_strategy": "append"
  }' | python3 -m json.tool
echo ""

echo "22. 测试敏感字段脱敏（店员角色查询）"
curl -s "$BASE_URL/api/orders/1?role=store_clerk" | python3 -c "
import json, sys
data = json.load(sys.stdin)
phone = data.get('store_phone', 'N/A')
print(f'原始手机号: 13812345678')
print(f'脱敏后手机号: {phone}')
if phone and '*' in phone:
    print('✓ 脱敏成功: 手机号包含星号掩码')
else:
    print('✗ 脱敏失败: 手机号未正确掩码')
"
echo ""

echo "23. 测试异步任务 - 标记 wait_retry"
curl -s -X PUT "$BASE_URL/api/async-tasks/TASK-EXPORT-001/mark-wait-retry" \
  -H "Content-Type: application/json" \
  -d '{"error_message": "数据库连接超时，可重试"}' | python3 -m json.tool
echo ""

echo "24. 测试异步任务 - 标记 wait_manual"
curl -s -X PUT "$BASE_URL/api/async-tasks/TASK-EXPORT-002/mark-wait-manual" \
  -H "Content-Type: application/json" \
  -d '{"error_message": "数据格式异常，需人工核对"}' | python3 -m json.tool
echo ""

echo "25. 测试异步任务 - 标记 permanent_failed"
curl -s -X PUT "$BASE_URL/api/async-tasks/TASK-EXPORT-003/mark-permanent-failed" \
  -H "Content-Type: application/json" \
  -d '{"error_message": "文件已损坏，无法恢复"}' | python3 -m json.tool
echo ""

echo "26. 查看失败任务清单（验证三种失败状态）"
curl -s "$BASE_URL/api/async-tasks/failed/" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'失败任务总数: {len(data)}')
statuses = set()
for t in data:
    statuses.add(t.get('status'))
    print(f'  - {t.get(\"task_id\")}: {t.get(\"status\")} | 重试次数: {t.get(\"retry_count\")}')
print()
print('状态检查:')
expected = {'wait_retry', 'wait_manual', 'permanent_failed'}
if expected.issubset(statuses):
    print('✓ 所有三种失败状态都已记录')
else:
    print(f'✗ 缺少状态: {expected - statuses}')
"
echo ""

echo "=== 测试完成 ==="
echo ""
echo "=== 核心修复验证清单 ==="
echo "1. 重复数据处理 (ignore/overwrite/append):"
echo "   curl -X POST $BASE_URL/api/orders/ -d '{...\"duplicate_strategy\":\"append\"}'"
echo ""
echo "2. 敏感字段脱敏:"
echo "   curl '$BASE_URL/api/orders/1?role=store_clerk'"
echo "   期望: 手机号 138****5678 (含星号掩码)"
echo ""
echo "3. 异步任务失败状态:"
echo "   # 查看所有失败任务"
echo "   curl $BASE_URL/api/async-tasks/failed/"
echo ""
echo "   # 标记为等待重试"
echo "   curl -X PUT $BASE_URL/api/async-tasks/{task_id}/mark-wait-retry \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"error_message\": \"数据库连接超时\"}'"
echo ""
echo "   # 标记为等待人工"
echo "   curl -X PUT $BASE_URL/api/async-tasks/{task_id}/mark-wait-manual"
echo ""
echo "   # 标记为永久失败"
echo "   curl -X PUT $BASE_URL/api/async-tasks/{task_id}/mark-permanent-failed"
echo ""
echo "4. 片区经理视图:"
echo "   curl '$BASE_URL/api/views/area-manager/?batch_no=$BATCH_NO'"
echo ""
echo "查看Swagger文档:"
echo "  打开浏览器访问 $BASE_URL/docs"
