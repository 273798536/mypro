#!/bin/bash
set -e

echo "========================================="
echo " 酸洗槽浓度补加质检系统 - 完整流程演示"
echo "========================================="

BASE_URL="http://localhost:8000/api"

echo ""
echo "📝 步骤 1: 创建新的称量单"
echo "-----------------------------------------"
WEIGHING_RESPONSE=$(curl -s -X POST "$BASE_URL/weighing-forms/" \
    -H "Content-Type: application/json" \
    -d '{
        "batch_no": "SX-DEMO-20260610-001",
        "tank_no": "酸洗槽#2",
        "reagent_name": "浓硝酸",
        "required_amount": 2000,
        "actual_amount": 1980,
        "unit": "mL",
        "weighing_operator": "李工",
        "weighing_date": "2026-06-10T09:00:00",
        "weighing_time": "09:00",
        "balance_no": "BL-002",
        "remarks": "演示流程测试数据"
    }')

FORM_ID=$(echo "$WEIGHING_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ 创建成功，称量单ID: $FORM_ID"
echo "$WEIGHING_RESPONSE" | python3 -m json.tool

echo ""
echo "📦 步骤 2: 录入试剂台账"
echo "-----------------------------------------"
LEDGER_RESPONSE=$(curl -s -X POST "$BASE_URL/reagent-ledgers/" \
    -H "Content-Type: application/json" \
    -d "{
        \"weighing_form_id\": $FORM_ID,
        \"reagent_batch_no\": \"HNO3-DEMO-20260520\",
        \"reagent_cas_no\": \"7697-37-2\",
        \"purity\": \"65-68%\",
        \"concentration\": \"65%\",
        \"concentration_value\": 65,
        \"concentration_unit\": \"%\",
        \"manufacturer\": \"国药集团化学试剂有限公司\",
        \"production_date\": \"2026-05-20T00:00:00\",
        \"expiry_date\": \"2027-05-19T00:00:00\",
        \"storage_condition\": \"阴凉通风处\",
        \"receiver\": \"王工\",
        \"receive_date\": \"2026-05-25T00:00:00\",
        \"usage_record\": \"首次使用\"
    }")
echo "✅ 试剂台账录入成功"
echo "$LEDGER_RESPONSE" | python3 -m json.tool

echo ""
echo "💡 步骤 3: 创建处理意见（初步判断）"
echo "-----------------------------------------"
OPINION_RESPONSE=$(curl -s -X POST "$BASE_URL/treatment-opinions/" \
    -H "Content-Type: application/json" \
    -d "{
        \"weighing_form_id\": $FORM_ID,
        \"inspector\": \"张工\",
        \"inspection_date\": \"2026-06-10T10:00:00\",
        \"original_concentration\": 125,
        \"target_concentration\": 150,
        \"calculated_supplement\": 2000,
        \"actual_supplement\": 1980,
        \"spectrum_peak_overlap\": true,
        \"overlap_material\": \"2026-06-09 批次 304不锈钢试样\",
        \"overlap_details\": \"谱图中Fe³+峰与Cr⁶+峰发生部分重叠，干扰区域在220-230nm波长处\",
        \"preliminary_judgment\": \"待复核\",
        \"final_judgment\": \"待复核\",
        \"processing_remarks\": \"谱峰重叠需要进一步确认\"
    }")
OPINION_ID=$(echo "$OPINION_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ 处理意见创建成功，处理意见ID: $OPINION_ID"
echo "$OPINION_RESPONSE" | python3 -m json.tool

echo ""
echo "🔄 步骤 4: 重复运行分析（模拟多次运行）"
echo "-----------------------------------------"
for i in 1 2 3; do
    echo "  第 $i 次运行..."
    RERUN_RESPONSE=$(curl -s -X POST "$BASE_URL/treatment-opinions/$OPINION_ID/rerun")
    RUN_COUNT=$(echo "$RERUN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['run_count'])")
    echo "  ✅ 运行完成，当前运行次数: $RUN_COUNT"
done

echo ""
echo "📝 步骤 5: 补录数据（模拟补录操作）"
echo "-----------------------------------------"
SUPPLEMENT_RESPONSE=$(curl -s -X POST \
    "$BASE_URL/weighing-forms/$FORM_ID/supplement?source=补录演示&remarks=补充原始记录扫描件，确认称量数据无误&operator=李工")
echo "✅ 补录成功"
echo "$SUPPLEMENT_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('  is_supplement:', d['is_supplement']); print('  supplement_remarks:', d['supplement_remarks'])"

echo ""
echo "✅ 步骤 6: 修改最终判断（模拟导出报告前变更）"
echo "-----------------------------------------"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/treatment-opinions/$OPINION_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "final_judgment": "合格",
        "judgment_changed": true,
        "change_reason": "谱峰重叠已通过差谱法扣除干扰，结果可信"
    }')
echo "✅ 判断更新成功"
echo "$UPDATE_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('  preliminary_judgment:', d['preliminary_judgment']); print('  final_judgment:', d['final_judgment']); print('  judgment_changed:', d['judgment_changed'])"

echo ""
echo "✅ 步骤 7: 人工确认"
echo "-----------------------------------------"
CONFIRM_RESPONSE=$(curl -s -X POST \
    "$BASE_URL/treatment-opinions/$OPINION_ID/manual-confirm?operator=张主管&remarks=同意合格结论，谱峰重叠处理正确")
echo "✅ 人工确认成功"
echo "$CONFIRM_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('  manual_confirm:', d['manual_confirm']); print('  confirmer:', d['confirmer'])"

echo ""
echo "📄 步骤 8: 导出报告"
echo "-----------------------------------------"
EXPORT_RESPONSE=$(curl -s -X POST "$BASE_URL/treatment-opinions/$OPINION_ID/export-report")
echo "✅ 报告导出成功"
echo "$EXPORT_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('  report_exported:', d['report_exported']); print('  report_version:', d['report_version'])"

echo ""
echo "📜 步骤 9: 查看批次追踪（验证判断前后差别）"
echo "-----------------------------------------"
TRACK_RESPONSE=$(curl -s "$BASE_URL/batch-tracks/?form_id=$FORM_ID")
echo "✅ 批次追踪记录:"
echo "$TRACK_RESPONSE" | python3 -m json.tool

echo ""
echo "📊 步骤 10: 查看谱峰重叠信息"
echo "-----------------------------------------"
OVERLAP_RESPONSE=$(curl -s "$BASE_URL/weighing-forms/$FORM_ID/spectrum-overlap")
echo "✅ 谱峰重叠信息:"
echo "$OVERLAP_RESPONSE" | python3 -m json.tool

echo ""
echo "📋 步骤 11: 查看完整详情（称量单+台账+处理意见+追踪）"
echo "-----------------------------------------"
DETAIL_RESPONSE=$(curl -s "$BASE_URL/weighing-forms/$FORM_ID/detail")
echo "✅ 完整详情:"
echo "$DETAIL_RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('  批次号:', d['batch_no'])
print('  槽号:', d['tank_no'])
print('  试剂:', d['reagent_name'])
print('  是否补录:', d['is_supplement'])
print('  试剂台账浓度:', d['reagent_ledger']['concentration'] if d['reagent_ledger'] else '无')
print('  初步判断:', d['treatment_opinion']['preliminary_judgment'] if d['treatment_opinion'] else '无')
print('  最终判断:', d['treatment_opinion']['final_judgment'] if d['treatment_opinion'] else '无')
print('  谱峰重叠:', d['treatment_opinion']['spectrum_peak_overlap'] if d['treatment_opinion'] else '无')
print('  重叠材料:', d['treatment_opinion']['overlap_material'] if d['treatment_opinion'] and d['treatment_opinion']['spectrum_peak_overlap'] else '无')
print('  运行次数:', d['treatment_opinion']['run_count'] if d['treatment_opinion'] else 0)
print('  人工确认:', d['treatment_opinion']['manual_confirm'] if d['treatment_opinion'] else False)
print('  报告版本:', d['treatment_opinion']['report_version'] if d['treatment_opinion'] else 1)
print('  追踪记录数:', len(d['batch_tracks']))
for t in d['batch_tracks']:
    print(f'    - {t[\"operation_type\"]}: {t[\"before_judgment\"]} -> {t[\"after_judgment\"]}')
"

echo ""
echo "========================================="
echo " 🎉 完整流程演示完成！"
echo "========================================="
echo ""
echo "访问前端界面查看: http://localhost:8000/static/index.html"
echo "查看 API 文档: http://localhost:8000/docs"
echo "查看该演示批次: 搜索 SX-DEMO-20260610-001"
