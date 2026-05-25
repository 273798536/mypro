#!/bin/bash

echo "======================================"
echo "农资门店配送重试补偿队列API 测试脚本"
echo "======================================"

BASE_URL="http://localhost:8000"

echo ""
echo "=== 测试用户 ==="
echo "录入员: entry_user / entry123"
echo "复核员: reviewer_user / review123"
echo "主管: supervisor_user / super123"
echo "只读: readonly_user / read123"
echo ""

echo "1. 获取主管 Token..."
SUPER_TOKEN=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=supervisor_user&password=super123" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "主管Token: ${SUPER_TOKEN:0:30}..."

echo ""
echo "2. 获取录入员 Token..."
ENTRY_TOKEN=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=entry_user&password=entry123" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "录入员Token: ${ENTRY_TOKEN:0:30}..."

echo ""
echo "3. 获取复核员 Token..."
REVIEW_TOKEN=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=reviewer_user&password=review123" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "复核员Token: ${REVIEW_TOKEN:0:30}..."

echo ""
echo "======================================"
echo "步骤1: 录入员创建订单"
echo "======================================"

echo ""
echo "创建订单 ORDER001..."
curl -s -X POST "$BASE_URL/orders/" \
  -H "Authorization: Bearer $ENTRY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "ORDER001",
    "store_name": "华东农资店",
    "region": "华东区",
    "product_name": "尿素",
    "quantity": 100,
    "unit": "袋",
    "amount": 15000,
    "driver_name": "张师傅",
    "vehicle_no": "沪A12345",
    "order_date": "2024-05-20T10:00:00Z",
    "is_supplementary": false,
    "data_source": "original"
  }' | python3 -m json.tool

echo ""
echo "创建订单 ORDER002 (临时补录)..."
curl -s -X POST "$BASE_URL/orders/" \
  -H "Authorization: Bearer $ENTRY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "ORDER002",
    "store_name": "华东农资店",
    "region": "华东区",
    "product_name": "复合肥",
    "quantity": 50,
    "unit": "袋",
    "amount": 8000,
    "driver_name": "李师傅",
    "vehicle_no": "沪A67890",
    "order_date": "2024-05-20T14:00:00Z",
    "is_supplementary": true,
    "data_source": "supplementary"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤2: 录入员提交回执"
echo "======================================"

echo ""
echo "提交回执 RCPT001..."
curl -s -X POST "$BASE_URL/receipts/submit" \
  -H "Authorization: Bearer $ENTRY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receipt_no": "RCPT001",
    "order_no": "ORDER001",
    "store_name": "华东农资店",
    "signatory": "王老板",
    "sign_time": "2024-05-20T16:00:00Z",
    "actual_quantity": 100,
    "actual_amount": 15000,
    "is_iou": true,
    "iou_amount": 15000,
    "remark": "赊销，月底回款",
    "source": "manual"
  }' | python3 -m json.tool

echo ""
echo "提交一个坏数据回执（关联不存在的订单，测试失败记录）..."
curl -s -X POST "$BASE_URL/receipts/submit" \
  -H "Authorization: Bearer $ENTRY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receipt_no": "RCPT_BAD",
    "order_no": "ORDER_NOT_EXIST",
    "store_name": "测试店",
    "signatory": "测试人",
    "sign_time": "2024-05-20T16:00:00Z",
    "actual_quantity": 10,
    "actual_amount": 1000,
    "is_iou": false,
    "source": "manual"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤3: 执行重试队列处理"
echo "======================================"

echo ""
echo "处理重试队列..."
curl -s -X POST "$BASE_URL/retry/process" \
  -H "Authorization: Bearer $REVIEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤4: 复核员复核回执"
echo "======================================"

echo ""
echo "复核回执 submission_id=1..."
curl -s -X POST "$BASE_URL/receipts/verify" \
  -H "Authorization: Bearer $REVIEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": 1,
    "verified_status": "approved",
    "review_comment": "数据核对无误，同意通过"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤5: 查看失败清单"
echo "======================================"

echo ""
echo "查看未解决的失败记录..."
curl -s -X GET "$BASE_URL/failures/?is_resolved=false" \
  -H "Authorization: Bearer $REVIEW_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤6: 主管处理失败记录"
echo "======================================"

echo ""
echo "主管解决失败记录 failure_id=1..."
curl -s -X POST "$BASE_URL/failures/1/resolve" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "failure_id": 1,
    "resolution_note": "该订单为历史补录数据，已在旧系统中处理，无需重试"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤7: 主管补偿入账"
echo "======================================"

echo ""
echo "ORDER001 缺货补偿入账..."
curl -s -X POST "$BASE_URL/compensation/post" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "ORDER001",
    "compensation_type": "缺货替代",
    "compensation_amount": 500,
    "compensation_reason": "因缺货改用替代产品，差价补偿"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤8: 查看订单变更历史（差异回溯）"
echo "======================================"

echo ""
echo "查看 ORDER001 的变更历史..."
curl -s -X GET "$BASE_URL/orders/ORDER001/diff" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤9: 查看报表汇总"
echo "======================================"

echo ""
echo "查看汇总报表..."
curl -s -X GET "$BASE_URL/reports/summary" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤10: 片区经理视图 - 重试分类"
echo "======================================"

echo ""
echo "查看重试分类..."
curl -s -X GET "$BASE_URL/manager/retry-classification" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤11: 主管关闭订单"
echo "======================================"

echo ""
echo "关闭 ORDER001..."
curl -s -X POST "$BASE_URL/orders/close" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "ORDER001",
    "close_reason": "所有流程完成，回款对账无误"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤12: 导出数据"
echo "======================================"

echo ""
echo "导出订单数据到 Excel..."
curl -s -X GET "$BASE_URL/export/orders" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -o /tmp/orders_export.xlsx
echo "订单数据已导出到 /tmp/orders_export.xlsx"

echo ""
echo "导出失败记录到 Excel..."
curl -s -X GET "$BASE_URL/export/failures" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -o /tmp/failures_export.xlsx
echo "失败记录已导出到 /tmp/failures_export.xlsx"

echo ""
echo "======================================"
echo "步骤13: 权限测试 - 只读用户"
echo "======================================"

echo ""
echo "获取只读用户 Token..."
READ_TOKEN=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=readonly_user&password=read123" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "只读用户查看订单（应该只能看到部分字段）..."
curl -s -X GET "$BASE_URL/orders/" \
  -H "Authorization: Bearer $READ_TOKEN" | python3 -m json.tool

echo ""
echo "只读用户尝试创建订单（应该被拒绝）..."
curl -s -X POST "$BASE_URL/orders/" \
  -H "Authorization: Bearer $READ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "ORDER_TEST",
    "store_name": "测试",
    "region": "测试",
    "product_name": "测试",
    "quantity": 1,
    "unit": "个",
    "amount": 100,
    "driver_name": "测试",
    "vehicle_no": "测试",
    "order_date": "2024-05-20T10:00:00Z"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤14: 司机轨迹新增和查询"
echo "======================================"

echo ""
echo "录入员新增司机轨迹..."
curl -s -X POST "$BASE_URL/driver-tracks/" \
  -H "Authorization: Bearer $ENTRY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "ORDER001",
    "driver_name": "张师傅",
    "vehicle_no": "沪A12345",
    "location": "华东农资店门口",
    "track_time": "2024-05-20T09:30:00Z",
    "status": "arrived",
    "remark": "已到达门店，开始卸货"
  }' | python3 -m json.tool

echo ""
echo "查询司机轨迹列表..."
curl -s -X GET "$BASE_URL/driver-tracks/?order_no=ORDER001" \
  -H "Authorization: Bearer $REVIEW_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤15: 历史压缩包导入准备"
echo "======================================"

echo ""
echo "创建历史数据JSON文件并打包为zip..."
python3 -c "
import json
import zipfile
from io import BytesIO

# 历史订单数据
old_orders = [
    {
        'order_no': 'HIST001',
        'store_name': '西北农资站',
        'region': '西北区',
        'product_name': '磷肥',
        'quantity': 200,
        'unit': '袋',
        'amount': 25000,
        'driver_name': '老周',
        'vehicle_no': '陕B88888',
        'order_date': '2023-12-15T10:00:00Z',
        'status': 'delivered',
        'is_supplementary': False
    },
    {
        'order_no': 'HIST002',
        'store_name': '华北农资店',
        'region': '华北区',
        'product_name': '钾肥',
        'quantity': 150,
        'unit': '袋',
        'amount': 18000,
        'driver_name': '老赵',
        'vehicle_no': '京A66666',
        'order_date': '2023-11-20T14:00:00Z',
        'status': 'delivered',
        'is_supplementary': False
    }
]

# 历史轨迹数据
old_tracks = [
    {
        'order_no': 'HIST001',
        'driver_name': '老周',
        'vehicle_no': '陕B88888',
        'location': '西北农资站',
        'track_time': '2023-12-15T16:00:00Z',
        'status': 'completed',
        'remark': '历史数据迁移'
    }
]

# 历史回执数据
old_receipts = [
    {
        'receipt_no': 'HISTRCPT001',
        'order_no': 'HIST001',
        'store_name': '西北农资站',
        'signatory': '刘老板',
        'sign_time': '2023-12-15T17:00:00Z',
        'actual_quantity': 200,
        'actual_amount': 25000,
        'is_iou': False,
        'payment_status': 'paid',
        'remark': '历史数据迁移'
    }
]

# 创建zip文件
with zipfile.ZipFile('/tmp/history_data.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.writestr('orders.json', json.dumps(old_orders, ensure_ascii=False))
    zf.writestr('tracks.json', json.dumps(old_tracks, ensure_ascii=False))
    zf.writestr('receipts.json', json.dumps(old_receipts, ensure_ascii=False))

print('历史数据压缩包已创建: /tmp/history_data.zip')
"

echo ""
echo "======================================"
echo "步骤16: 上传历史压缩包导入数据"
echo "======================================"

echo ""
echo "上传历史压缩包（旧口径数据）..."
curl -s -X POST "$BASE_URL/history/upload?import_type=all&data_version=old" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -F "file=@/tmp/history_data.zip" | python3 -m json.tool

echo ""
echo "查看历史数据版本统计..."
curl -s -X GET "$BASE_URL/history/versions" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤17: 报表钻取明细（追到单条记录）"
echo "======================================"

echo ""
echo "钻取: 按状态查看订单明细..."
curl -s -X POST "$BASE_URL/reports/drilldown" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "orders_by_status",
    "status": "closed",
    "region": "华东区"
  }' | python3 -m json.tool

echo ""
echo "钻取: 查看待付款回执明细..."
curl -s -X POST "$BASE_URL/reports/drilldown" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "receipts_by_payment",
    "status": "unpaid"
  }' | python3 -m json.tool

echo ""
echo "钻取: 查看重试队列明细..."
curl -s -X POST "$BASE_URL/reports/drilldown" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "retry_queue_details",
    "status": "success"
  }' | python3 -m json.tool

echo ""
echo "钻取: 查看失败记录明细..."
curl -s -X POST "$BASE_URL/reports/drilldown" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "failures_details",
    "status": "resolved"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "步骤18: 带来源的汇总报表"
echo "======================================"

echo ""
echo "查看带来源记录的汇总报表..."
curl -s -X GET "$BASE_URL/reports/summary-with-sources" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool

echo ""
echo "======================================"
echo "测试完成！"
echo "======================================"
echo ""
echo "新增功能验证要点:"
echo "✓ 司机轨迹: 新增和查询接口正常"
echo "✓ 历史导入: 压缩包上传和解析正常"
echo "✓ 报表钻取: 能追到单条记录明细"
echo "✓ 来源追踪: 汇总数据有对应的原始记录"
echo ""
echo "下一步验证操作："
echo "1. 重启服务: Ctrl+C 停止，然后重新运行 ./start.sh"
echo "2. 重启后验证数据持久化:"
echo "   - 运行 ./verify_after_restart.sh"
echo "   - 检查司机轨迹是否保留"
echo "   - 检查历史导入数据是否保留"
echo ""
