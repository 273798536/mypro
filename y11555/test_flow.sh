#!/bin/bash
# 农资门店配送异常回执状态机 API 测试流程

BASE_URL="http://localhost:8000"

echo "======================================"
echo "农资门店配送异常回执状态机 API 测试"
echo "======================================"
echo ""

# 1. 检查服务状态
echo "1. 检查服务状态..."
curl -s "$BASE_URL/" | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 2. 第一次批次导入（包含部分失败项）
echo "2. 第一次批次导入（近效期 + 赊销 + 错误数据）..."
curl -s -X POST "$BASE_URL/api/batch/import" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH20260524001",
    "source_file": "门店配送异常_20260524.xlsx",
    "source_type": "excel",
    "created_by": "driver_zhang",
    "remark": "农忙期第一批异常单",
    "items": [
      {
        "original_row_number": 1,
        "original_data": {"row": 1, "store": "城东门店", "product": "吡虫啉", "qty": 10, "remark": "近效期被退回"},
        "store_order": {"order_no": "ORD20260524001", "store_name": "城东门店", "product_name": "吡虫啉", "quantity": 10, "price": 25.5},
        "driver_track": {"track_no": "TRK20260524001", "driver_name": "张三", "vehicle_no": "鲁A12345", "status": "completed"},
        "sign_receipt": {"sign_no": "SIGN20260524001", "signer_name": "李店长", "is_iou": false},
        "abnormal_type": "near_expiry",
        "abnormal_description": "近效期药盒被调走，客户拒收",
        "abnormal_quantity": 10,
        "abnormal_amount": 255.00,
        "area": "华东区",
        "store_name": "城东门店",
        "product_name": "吡虫啉"
      },
      {
        "original_row_number": 2,
        "original_data": {"row": 2, "store": "城西门店", "product": "草甘膦", "qty": 5, "remark": "农忙赊销"},
        "store_order": {"order_no": "ORD20260524002", "store_name": "城西门店", "product_name": "草甘膦", "quantity": 5, "price": 80.0},
        "driver_track": {"track_no": "TRK20260524002", "driver_name": "张三", "vehicle_no": "鲁A12345", "status": "completed"},
        "sign_receipt": {"sign_no": "SIGN20260524002", "signer_name": "王店长", "is_iou": true, "iou_amount": 400.0},
        "abnormal_type": "credit_sale",
        "abnormal_description": "农忙时先拿货后付款，已打欠条",
        "abnormal_quantity": 5,
        "abnormal_amount": 400.00,
        "area": "华东区",
        "store_name": "城西门店",
        "product_name": "草甘膦"
      },
      {
        "original_row_number": 3,
        "original_data": {"row": 3, "store": "城南门店", "product": "代森锰锌", "qty": "ERROR", "remark": "数据错误"},
        "abnormal_type": "out_of_stock_substitute",
        "abnormal_description": "缺货替代，测试失败项",
        "area": "华东区",
        "store_name": "城南门店"
      }
    ]
  }' | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 3. 查看失败清单
echo "3. 查看失败清单..."
curl -s "$BASE_URL/api/batch/BATCH20260524001/failed" | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 4. 重提失败项
echo "4. 修正后重新提交失败项（第3行）..."
curl -s -X POST "$BASE_URL/api/batch/BATCH20260524001/resubmit/3" \
  -H "Content-Type: application/json" \
  -d '{
    "original_row_number": 3,
    "original_data": {"row": 3, "store": "城南门店", "product": "代森锰锌", "qty": 8, "remark": "缺货替代"},
    "store_order": {"order_no": "ORD20260524003", "store_name": "城南门店", "product_name": "代森锰锌", "quantity": 8, "price": 35.0},
    "driver_track": {"track_no": "TRK20260524003", "driver_name": "张三", "vehicle_no": "鲁A12345", "status": "completed"},
    "sign_receipt": {"sign_no": "SIGN20260524003", "signer_name": "赵店长", "is_iou": false},
    "abnormal_type": "out_of_stock_substitute",
    "abnormal_description": "原品缺货，用替代品种配送",
    "abnormal_quantity": 8,
    "abnormal_amount": 280.00,
    "area": "华东区",
    "store_name": "城南门店",
    "product_name": "代森锰锌"
  }' | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 5. 查询回执列表获取 receipt_no
echo "5. 查询回执列表获取回执编号..."
RECEIPT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/receipt/query" \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "page_size": 10}')
echo "$RECEIPT_RESPONSE" | python3 -m json.tool
echo ""

# 提取第一个回执编号用于后续操作
RCP_NO1=$(echo "$RECEIPT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['receipt_no'])")
RCP_NO2=$(echo "$RECEIPT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][1]['receipt_no'])")
RCP_NO3=$(echo "$RECEIPT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][2]['receipt_no'])")
echo "提取回执编号: $RCP_NO1, $RCP_NO2, $RCP_NO3"
echo ""
echo "--------------------------------------------------"

# 6. 异常确认（门店确认）
echo "6. 门店确认异常（$RCP_NO1）..."
curl -s -X POST "$BASE_URL/api/receipt/status/change" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO1\",
    \"target_status\": \"abnormal_confirmed\",
    \"changed_by\": \"store_manager_li\",
    \"operator_role\": \"store_manager\",
    \"change_reason\": \"门店确认近效期退回\"
  }" | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 7. 添加异常照片附件
echo "7. 添加异常照片附件（$RCP_NO1）..."
curl -s -X POST "$BASE_URL/api/attachment/add" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO1\",
    \"file_name\": \"近效期药盒照片.jpg\",
    \"file_path\": \"/attachments/$RCP_NO1/photo1.jpg\",
    \"file_type\": \"image/jpeg\",
    \"file_size\": 1024000,
    \"uploaded_by\": \"store_manager_li\",
    \"description\": \"近效期药盒实拍照片，批号20230101\"
  }" | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 8. 片区经理复核
echo "8. 片区经理复核（$RCP_NO1）..."
curl -s -X POST "$BASE_URL/api/receipt/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO1\",
    \"review_result\": \"approve\",
    \"review_reason\": \"情况属实，同意按异常处理，扣供应商货款\",
    \"reviewed_by\": \"area_manager_wang\",
    \"service_remark\": \"已联系供应商，下批次补货时扣除\"
  }" | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 9. 人工改判（第二个回执复核不通过）
echo "9. 人工改判 - 复核不通过需重新确认（$RCP_NO2）..."
curl -s -X POST "$BASE_URL/api/receipt/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO2\",
    \"review_result\": \"reject\",
    \"review_reason\": \"赊销欠条照片缺失，请补充附件后重新提交\",
    \"reviewed_by\": \"area_manager_wang\",
    \"service_remark\": \"欠条照片是必填凭证\"
  }" | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 10. 撤回（测试撤回后再提交流程）
echo "10. 管理员撤回第三个回执（$RCP_NO3）..."
curl -s -X POST "$BASE_URL/api/receipt/$RCP_NO3/revoke?operated_by=admin_zhang&reason=数据录入错误，需要重新核对" | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 11. 冻结结算
echo "11. 导出前冻结第一个回执（$RCP_NO1）..."
curl -s -X POST "$BASE_URL/api/receipt/freeze" \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_no\": \"$RCP_NO1\",
    \"frozen_reason\": \"月度结算冻结，待财务对账\",
    \"frozen_by\": \"area_manager_wang\"
  }" | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 12. 查看回执详情（验证冻结前后状态）
echo "12. 查看回执详情 - 冻结前后状态（$RCP_NO1）..."
curl -s "$BASE_URL/api/receipt/$RCP_NO1" | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 13. 导出汇总报表（片区经理视角）
echo "13. 导出汇总报表 - 片区经理视角..."
curl -s -X POST "$BASE_URL/api/export/summary" \
  -H "Content-Type: application/json" \
  -d '{
    "export_type": "summary",
    "filters": {"area": "华东区"},
    "exported_by": "area_manager_wang"
  }' | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 14. 解冻
echo "14. 解冻回执（$RCP_NO1）..."
curl -s -X POST "$BASE_URL/api/receipt/$RCP_NO1/unfreeze?operated_by=area_manager_wang" | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

# 15. 重复导入测试（幂等性验证）
echo "15. 重复导入同一批次 - 验证幂等性（更新而非新增）..."
curl -s -X POST "$BASE_URL/api/batch/import" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH20260524001",
    "source_file": "门店配送异常_20260524.xlsx",
    "source_type": "excel",
    "created_by": "driver_zhang",
    "remark": "重复导入测试",
    "items": [
      {
        "original_row_number": 1,
        "original_data": {"row": 1, "store": "城东门店", "product": "吡虫啉", "qty": 10, "remark": "更新备注"},
        "store_order": {"order_no": "ORD20260524001", "store_name": "城东门店", "product_name": "吡虫啉", "quantity": 10, "price": 25.5},
        "driver_track": {"track_no": "TRK20260524001", "driver_name": "张三", "vehicle_no": "鲁A12345", "status": "completed"},
        "sign_receipt": {"sign_no": "SIGN20260524001", "signer_name": "李店长", "is_iou": false},
        "abnormal_type": "near_expiry",
        "abnormal_description": "近效期药盒被调走，客户拒收（重复导入更新）",
        "abnormal_quantity": 10,
        "abnormal_amount": 255.00,
        "area": "华东区",
        "store_name": "城东门店",
        "product_name": "吡虫啉"
      }
    ]
  }' | python3 -m json.tool
echo ""
echo "--------------------------------------------------"

echo ""
echo "======================================"
echo "测试流程完成！"
echo "======================================"
echo "请检查："
echo "1. 失败清单是否正确显示第3行错误"
echo "2. 重提后失败项是否变为成功"
echo "3. 冻结前后状态字段是否正确记录"
echo "4. 人工改判理由是否保留"
echo "5. 导出汇总是否显示关键信息"
echo "6. 重复导入是否只更新不新增"
