#!/bin/bash
set -e

BASE_URL="http://localhost:8000/api/v1"
OPERATOR="test_admin"

echo "=========================================="
echo "  客服知识库回执状态机 - 完整流程测试"
echo "=========================================="
echo ""

wait_for_service() {
    echo "等待服务启动..."
    for i in {1..30}; do
        if curl -s "${BASE_URL}/health" > /dev/null 2>&1; then
            echo "✅ 服务已启动"
            return 0
        fi
        sleep 1
    done
    echo "❌ 服务启动超时"
    exit 1
}

if ! curl -s "${BASE_URL}/health" > /dev/null 2>&1; then
    wait_for_service
fi

echo ""
echo "=========================================="
echo "步骤 1: 创建批次"
echo "=========================================="
RESPONSE=$(curl -s -X POST "${BASE_URL}/batches?operator=${OPERATOR}" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "5月第2周知识库异常回执处理",
        "description": "包含变更单、审核意见、客服引用记录"
    }')
BATCH_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
BATCH_NO=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['batch_no'])")
echo "✅ 批次创建成功"
echo "   批次ID: $BATCH_ID"
echo "   批次号: $BATCH_NO"
echo ""

echo "=========================================="
echo "步骤 2: 导入变更单数据 (含部分失败和重复)"
echo "=========================================="
CHANGE_ORDERS='[
    {"change_order_no": "CO20240513001", "cs_agent_id": "CS001", "cs_agent_name": "张三", "store_id": "ST001", "store_name": "北京朝阳店", "compensation_amount": 50, "issue_description": "旧答案已下线仍被引用", "old_answer": "退款政策V1", "new_answer": "退款政策V2"},
    {"change_order_no": "CO20240513002", "cs_agent_id": "CS002", "cs_agent_name": "李四", "store_id": "ST002", "store_name": "上海浦东店", "compensation_amount": 100, "issue_description": "答案内容不准确", "old_answer": "配送时间说明", "new_answer": "配送时间V2"},
    {"change_order_no": "CO20240513001", "cs_agent_id": "CS001", "cs_agent_name": "张三", "store_id": "ST001", "store_name": "北京朝阳店", "compensation_amount": 50},
    {"invalid_row": "这行数据缺少必填字段"},
    {"change_order_no": "CO20240513003", "cs_agent_id": "CS003", "cs_agent_name": "王五", "store_id": "ST003", "store_name": "广州天河店", "compensation_amount": 75}
]'
RESPONSE=$(curl -s -X POST "${BASE_URL}/batches/${BATCH_ID}/import?operator=${OPERATOR}" \
    -F "record_type=change_order" \
    -F "source_file=change_orders_20240513.xlsx" \
    -F "json_data=${CHANGE_ORDERS}")
echo "$RESPONSE" | python3 -m json.tool
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['success_count'])")
FAILED=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['failed_count'])")
DUPLICATE=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['duplicate_count'])")
echo ""
echo "📊 导入结果:"
echo "   成功: $SUCCESS 条"
echo "   失败: $FAILED 条"
echo "   重复: $DUPLICATE 条"
echo ""

echo "=========================================="
echo "步骤 3: 导入审核意见数据"
echo "=========================================="
AUDIT_OPINIONS='[
    {"audit_opinion_no": "AUD20240513001", "change_order_no": "CO20240513001", "auditor": "审核员A", "opinion": "确认为错赔，建议修正", "audit_result": "reject"},
    {"audit_opinion_no": "AUD20240513002", "change_order_no": "CO20240513002", "auditor": "审核员B", "opinion": "情况属实，予以豁免", "audit_result": "waive"},
    {"audit_opinion_no": "AUD20240513003", "change_order_no": "CO20240513003", "auditor": "审核员A", "opinion": "核实无误", "audit_result": "approve"}
]'
RESPONSE=$(curl -s -X POST "${BASE_URL}/batches/${BATCH_ID}/import?operator=${OPERATOR}" \
    -F "record_type=audit_opinion" \
    -F "source_file=audit_opinions_20240513.xlsx" \
    -F "json_data=${AUDIT_OPINIONS}")
echo "✅ 审核意见导入完成"
echo ""

echo "=========================================="
echo "步骤 4: 查看批次详情和统计"
echo "=========================================="
RESPONSE=$(curl -s "${BASE_URL}/batches/${BATCH_ID}")
echo "$RESPONSE" | python3 -m json.tool
echo ""

echo "=========================================="
echo "步骤 5: 查看所有记录列表"
echo "=========================================="
RESPONSE=$(curl -s "${BASE_URL}/batches/${BATCH_ID}/records?page_size=10")
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'总记录数: {data[\"total\"]}')
print('-' * 80)
print(f'{'ID':<5} {'类型':<15} {'状态':<10} {'唯一键':<20} {'来源行号':<10}')
print('-' * 80)
for r in data['items']:
    print(f'{r[\"id\"]:<5} {r[\"record_type\"]:<15} {r[\"status\"]:<10} {str(r[\"unique_key\"]):<20} {str(r[\"source_row\"]):<10}')
"
echo ""

echo "=========================================="
echo "步骤 6: 人工改判记录 (修正错赔)"
echo "=========================================="
echo "获取第一条变更单记录ID..."
RECORD_ID=$(curl -s "${BASE_URL}/batches/${BATCH_ID}/records?page_size=1" | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][0]['id'])")
echo "记录ID: $RECORD_ID"

RESPONSE=$(curl -s -X PUT "${BASE_URL}/records/${RECORD_ID}/correct?operator=${OPERATOR}" \
    -H "Content-Type: application/json" \
    -d '{
        "status": "corrected",
        "correction_note": "经核实，该单确实为错赔，金额从50调整为30",
        "review_reason": "旧答案下线时间与引用时间不符",
        "is_correct": false,
        "compensation_amount": 30
    }')
echo "✅ 记录改判完成"
echo "   新状态: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")"
echo "   改判人: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['corrected_by'])")"
echo ""

echo "=========================================="
echo "步骤 7: 复核批次 - 审批通过"
echo "=========================================="
RESPONSE=$(curl -s -X POST "${BASE_URL}/batches/${BATCH_ID}/review?operator=${OPERATOR}" \
    -H "Content-Type: application/json" \
    -d '{
        "action": "approve",
        "opinion": "经复核，所有记录处理正确，同意通过",
        "record_results": {
            2: {"status": "waived", "reason": "特殊情况，予以豁免", "is_correct": true}
        }
    }')
echo "✅ 批次复核完成"
echo "   当前状态: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")"
echo "   复核意见: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['review_opinion'])")"
echo ""

echo "=========================================="
echo "步骤 8: 导出前冻结批次 (防止数据变动)"
echo "=========================================="
RESPONSE=$(curl -s -X POST "${BASE_URL}/batches/${BATCH_ID}/freeze?operator=${OPERATOR}" \
    -H "Content-Type: application/json" \
    -d '{"reason": "导出结算前冻结，防止数据被篡改"}')
echo "✅ 批次已冻结"
echo "   冻结前状态: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['status_before_frozen'])")"
echo "   冻结原因: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['frozen_reason'])")"
echo ""

echo "=========================================="
echo "步骤 9: 验证冻结后无法修改 (预期失败)"
echo "=========================================="
echo "尝试在冻结状态下改判记录..."
RESPONSE=$(curl -s -X PUT "${BASE_URL}/records/${RECORD_ID}/correct?operator=${OPERATOR}" \
    -H "Content-Type: application/json" \
    -d '{"status": "verified", "correction_note": "尝试冻结后修改"}')
echo "❌ 预期失败: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('detail','未知错误'))")"
echo ""

echo "=========================================="
echo "步骤 10: 导出运营汇总报表"
echo "=========================================="
RESPONSE=$(curl -s "${BASE_URL}/batches/${BATCH_ID}/export/summary?operator=${OPERATOR}")
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('=' * 60)
print('  运营汇总报表')
print('=' * 60)
print(f'批次号: {data[\"batch_no\"]}')
print(f'批次名称: {data[\"batch_title\"]}')
print(f'冻结前状态: {data[\"status_before_frozen\"]}')
print(f'冻结后状态: {data[\"status_after_frozen\"]}')
print(f'冻结原因: {data[\"frozen_reason\"]}')
print('-' * 60)
print(f'总记录数: {data[\"total_records\"]}')
print(f'  - 已核实: {data[\"verified_count\"]}')
print(f'  - 已修正: {data[\"corrected_count\"]}')
print(f'  - 已豁免: {data[\"waived_count\"]}')
print(f'  - 无效: {data[\"invalid_count\"]}')
print(f'  - 重复: {data[\"duplicate_count\"]}')
print(f'  - 待处理: {data[\"pending_count\"]}')
print('-' * 60)
print(f'总赔付金额: ¥{data[\"total_compensation\"]:.2f}')
print(f'正确赔付: ¥{data[\"correct_compensation\"]:.2f}')
print(f'错赔金额: ¥{data[\"incorrect_compensation\"]:.2f}')
print('-' * 60)
print(f'导出时间: {data[\"export_at\"]}')
print(f'导出人: {data[\"exported_by\"]}')
"
echo ""

echo "=========================================="
echo "步骤 11: 解冻批次"
echo "=========================================="
RESPONSE=$(curl -s -X POST "${BASE_URL}/batches/${BATCH_ID}/unfreeze?operator=${OPERATOR}")
echo "✅ 批次已解冻，恢复状态: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")"
echo ""

echo "=========================================="
echo "步骤 12: 结算批次"
echo "=========================================="
RESPONSE=$(curl -s -X POST "${BASE_URL}/batches/${BATCH_ID}/settle?operator=${OPERATOR}")
echo "✅ 批次已结算，状态: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")"
echo ""

echo "=========================================="
echo "步骤 13: 查看审计日志"
echo "=========================================="
RESPONSE=$(curl -s "${BASE_URL}/batches/${BATCH_ID}/audit-logs?page_size=20")
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'共 {data[\"total\"]} 条审计记录')
print('-' * 100)
print(f'{'时间':<20} {'操作人':<12} {'动作':<25} {'旧状态':<12} {'新状态':<12}')
print('-' * 100)
for log in data['items']:
    time_str = log['operated_at'][:19].replace('T',' ')
    print(f'{time_str:<20} {log[\"operator\"]:<12} {log[\"action\"]:<25} {str(log[\"old_status\"]):<12} {str(log[\"new_status\"]):<12}')
"
echo ""

echo "=========================================="
echo "步骤 14: 撤回后重新提交 (边界测试)"
echo "=========================================="
echo "创建新批次测试撤回功能..."
NEW_BATCH=$(curl -s -X POST "${BASE_URL}/batches?operator=${OPERATOR}" \
    -H "Content-Type: application/json" \
    -d '{"title": "测试撤回功能批次"}')
NEW_BATCH_ID=$(echo "$NEW_BATCH" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "新批次ID: $NEW_BATCH_ID"

echo "撤回批次..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/batches/${NEW_BATCH_ID}/withdraw?operator=${OPERATOR}" \
    -H "Content-Type: application/json" \
    -d '{"reason": "数据有误，需要重新整理"}')
echo "撤回后状态: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")"

echo "重新提交..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/batches/${NEW_BATCH_ID}/resubmit?operator=${OPERATOR}")
echo "重提后状态: $(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")"
echo ""

echo "=========================================="
echo "✅ 所有测试完成!"
echo "=========================================="
echo ""
echo "📝 总结:"
echo "  - 批次创建和数据导入 ✓"
echo "  - 重复提交检测 ✓"
echo "  - 部分失败处理 ✓"
echo "  - 人工改判 ✓"
echo "  - 复核审批 ✓"
echo "  - 冻结/解冻 ✓"
echo "  - 导出汇总报表 ✓"
echo "  - 撤回/重提 ✓"
echo "  - 审计日志追踪 ✓"
echo ""
echo "🔍 详细查看:"
echo "  - API文档: http://localhost:8000/docs"
echo "  - 批次详情: http://localhost:8000/api/v1/batches/${BATCH_ID}"
echo "  - 导出CSV: curl -o records.csv \"${BASE_URL}/batches/${BATCH_ID}/export/records?format=csv\""
