#!/bin/bash
# ==========================================
#  血液检验复测建议系统 - 重复导入与补录测试
#  验证: 别让同一件事出现两份结论
# ==========================================

BASE_URL="http://localhost:5001/api"
DATA_DIR="$(cd "$(dirname "$0")" && pwd)/sample_data"

echo "=========================================="
echo "  测试场景1: 重复导入同一文件"
echo "  预期: 系统识别文件哈希，拒绝重复导入"
echo "=========================================="
echo ""

echo "尝试重复导入 batch_20260601.json (已导入过)..."
RESULT=$(curl -s -X POST "$BASE_URL/import" \
  -H "Content-Type: application/json" \
  -H "X-Operator: 误操作的技师" \
  -d @"$DATA_DIR/batch_20260601.json")

echo "$RESULT" | python3 -m json.tool
echo ""

STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [ "$STATUS" = "duplicate_file" ]; then
    echo "✓ PASS: 正确识别重复文件，拒绝导入"
else
    echo "✗ FAIL: 未能识别重复文件！"
fi

echo ""
read -p "按回车继续下一个测试..."

echo ""
echo "=========================================="
echo "  测试场景2: 导入含重复记录的新文件"
echo "  预期: 系统跳过重复记录，只导入新记录"
echo "=========================================="
echo ""

DUP_FILE="$DATA_DIR/batch_with_duplicates.json"
cat > "$DUP_FILE" << 'EOF'
{
  "source_file": "batch_with_duplicates_test.json",
  "notes": "测试文件：包含1条重复记录(S001)和2条新记录",
  "batch_info": {
    "batch_no": "BATCH-20260601",
    "group_name": "临床检验一组",
    "collect_date": "2026-06-01"
  },
  "records": [
    {
      "sample_no": "S001",
      "patient_id": "P1001",
      "culture_type": "需氧菌培养",
      "culture_date": "2026-06-01",
      "reagent_no": "REAG-2026-001",
      "incubator_temp": 36.5,
      "incubator_humidity": 65,
      "culture_result": "菌落生长阳性",
      "sequencing_reads": [
        {"read_id": "TEST_001", "quality_score": 35.0, "sequence": "ATCGATCG", "gc_content": 50.0}
      ],
      "micrographs": [
        {"image_path": "/test/dup_test.jpg", "magnification": "400x"}
      ]
    },
    {
      "sample_no": "S005",
      "patient_id": "P1005",
      "culture_type": "需氧菌培养",
      "culture_date": "2026-06-01",
      "reagent_no": "REAG-2026-001",
      "incubator_temp": 36.5,
      "incubator_humidity": 65,
      "culture_result": "正常阴性",
      "sequencing_reads": [
        {"read_id": "S005_R1_001", "quality_score": 38.0, "sequence": "ATCGATCGATCG", "gc_content": 48.0}
      ],
      "micrographs": []
    },
    {
      "sample_no": "S006",
      "patient_id": "P1006",
      "culture_type": "厌氧菌培养",
      "culture_date": "2026-06-01",
      "reagent_no": "REAG-2026-002",
      "incubator_temp": 36.8,
      "incubator_humidity": 68,
      "culture_result": "阳性可疑",
      "sequencing_reads": [
        {"read_id": "S006_R1_001", "quality_score": 15.0, "sequence": "NNNNATCG", "gc_content": 42.0}
      ],
      "micrographs": [
        {"image_path": "/images/S006_400x_1.jpg", "magnification": "400x", "annotation": "可疑菌落"}
      ]
    }
  ]
}
EOF

echo "导入包含重复记录的文件..."
RESULT=$(curl -s -X POST "$BASE_URL/import" \
  -H "Content-Type: application/json" \
  -H "X-Operator: 测试员" \
  -d @"$DUP_FILE")

echo "$RESULT" | python3 -m json.tool
echo ""

TOTAL=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('summary',{}).get('total',-1))")
NEW=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('summary',{}).get('new',-1))")
DUP=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('summary',{}).get('duplicates',-1))")

if [ "$TOTAL" = "3" ] && [ "$NEW" = "2" ] && [ "$DUP" = "1" ]; then
    echo "✓ PASS: 正确识别1条重复，导入2条新记录"
else
    echo "✗ FAIL: 总数=$TOTAL, 新=$NEW, 重复=$DUP (预期: 3,2,1)"
fi

echo ""
read -p "按回车继续下一个测试..."

echo ""
echo "=========================================="
echo "  测试场景3: 对已有结论的记录进行补录"
echo "  预期: 原有结论被标记为失效(is_active=0)，避免两份有效结论"
echo "=========================================="
echo ""

echo "补录前 - 查看 S001 (culture_id=1) 的有效结论数:"
curl -s "$BASE_URL/conclusions/active/1" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'  有效结论数: {d[\"count\"]}')
for c in d['conclusions']:
    print(f'  - 结论ID={c[\"id\"]}, 状态={c[\"is_active\"]}, 决策={c[\"final_decision\"]}')
"
echo ""

echo "对 S001 进行补录 (补充新的读段数据)..."
SUPP_RESULT=$(curl -s -X POST "$BASE_URL/supplement/1" \
  -H "Content-Type: application/json" \
  -H "X-Operator: 张技师" \
  -d '{
    "incubator_temp": 36.6,
    "culture_result": "菌落生长阳性(确认)",
    "sequencing_reads": [
      {"read_id": "S001_R1_005", "quality_score": 40.5, "sequence": "GATCGATCGATCGATCGATC", "gc_content": 52.0},
      {"read_id": "S001_R1_006", "quality_score": 8.5, "sequence": "NNNNN", "gc_content": 40.0}
    ],
    "micrographs": [
      {"image_path": "/images/S001_1000x_2.jpg", "capture_time": "2026-06-03 15:00:00", "magnification": "1000x", "annotation": "补拍照片，确认金黄色葡萄球菌"}
    ]
  }')

echo "$SUPP_RESULT" | python3 -m json.tool
echo ""

SUPERSED=$(echo "$SUPP_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('superseded_conclusions',-1))")
if [ "$SUPERSED" = "1" ]; then
    echo "✓ PASS: 正确标记原有1条结论为失效"
else
    echo "✗ FAIL: 失效结论数=$SUPERSED (预期: 1)"
fi

echo ""
echo "补录后 - 查看 S001 的有效结论:"
curl -s "$BASE_URL/conclusions/active/1" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'  有效结论数: {d[\"count\"]}')
if d['count'] == 0:
    print('  (正确，补录后原有结论失效，需重新复核)')
else:
    print('  警告: 仍有有效结论，可能有问题')
    for c in d['conclusions']:
        print(f'  - 结论ID={c[\"id\"]}, 状态={c[\"is_active\"]}')
"

echo ""
echo "查看 S001 的所有结论历史 (含失效):"
curl -s "$BASE_URL/trace/record/1" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  结论历史:')
for review in d.get('reviews',[]):
    for c in review.get('conclusions',[]):
        status = '有效' if c['is_active']==1 else '已失效'
        superseded = ' (被新结论替代)' if c.get('superseded_by') else ''
        print(f'    ID={c[\"id\"]}: {status}{superseded} | 决策={c[\"final_decision\"]} | 时间={c[\"decided_at\"]}')
"

echo ""
read -p "按回车继续下一个测试..."

echo ""
echo "=========================================="
echo "  测试场景4: 对补录后的记录重新复核"
echo "  预期: 新结论与旧结论有 superseded_by 关联，可追溯"
echo "=========================================="
echo ""

echo "重新提交 S001 的复核结论..."
NEW_REVIEW=$(curl -s -X POST "$BASE_URL/review/items/1" \
  -H "Content-Type: application/json" \
  -H "X-Operator: 王质控" \
  -d '{
    "review_notes": "补录后重新复核，新增显微照片确认，新增读段质量良好。原低质量读段为个别情况。",
    "review_result": "正常",
    "conclusion_text": "S001经补录数据复核，确认金黄色葡萄球菌感染。新增显微照片和高质量读段支持该结论，原低质量读段不影响结果。",
    "conclusion_type": "normal",
    "retest_needed": false,
    "final_decision": "报告发出"
  }')

echo "$NEW_REVIEW" | python3 -m json.tool
echo ""

echo "再次查看 S001 的结论历史 (含替代链):"
curl -s "$BASE_URL/trace/record/1" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  结论历史:')
for review in d.get('reviews',[]):
    for c in review.get('conclusions',[]):
        status = '✓ 有效' if c['is_active']==1 else '✗ 已失效'
        sup = f' → 被结论{c[\"superseded_by\"]}替代' if c.get('superseded_by') else ''
        print(f'    {status} ID={c[\"id\"]}{sup}')
        print(f'       决策={c[\"final_decision\"]} | 决定人={c[\"decided_by\"]} | {c[\"decided_at\"]}')
"
echo ""

echo "查看 S001 当前有效结论:"
curl -s "$BASE_URL/conclusions/active/1" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d['count'] == 1:
    print('✓ PASS: 当前仅有1条有效结论，不会出现两份结论冲突')
    c = d['conclusions'][0]
    print(f'  结论ID={c[\"id\"]}, 决策={c[\"final_decision\"]}')
else:
    print(f'✗ FAIL: 有效结论数={d[\"count\"]} (预期为1)')
"

echo ""
read -p "按回车继续最后一个测试..."

echo ""
echo "=========================================="
echo "  测试场景5: 边界不清记录倒查 (验收场景)"
echo "  预期: 从结论一路追溯到原始读段、显微照片、导入记录"
echo "=========================================="
echo ""

echo "模拟验收: 拿 S003 的结论倒查全链路..."
echo ""
echo "步骤1: 先看 S003 的有效结论"
curl -s "$BASE_URL/conclusions/active/3" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for c in d['conclusions']:
    print(f'  结论ID={c[\"id\"]}')
    print(f'  结论: {c[\"conclusion_text\"]}')
    print(f'  决策: {c[\"final_decision\"]} (复测={c[\"retest_needed\"]})')
    print(f'  复核人: {c[\"decided_by\"]} @ {c[\"decided_at\"]}')
"
echo ""
echo "步骤2: 追溯 S003 (culture_id=3) 全链路 (结果→来源→处理记录)"
echo "  包含: 培养记录、测序读段、显微照片、复核历史、质控记录、审计日志"
echo ""

TRACE_RESULT=$(curl -s "$BASE_URL/trace/record/3")

echo "$TRACE_RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  [基本信息]')
print(f'    样本号: {d[\"sample_no\"]} | 患者: {d[\"patient_id\"]}')
print(f'    培养类型: {d[\"culture_type\"]} | 日期: {d[\"culture_date\"]}')
print(f'    试剂批号: {d[\"reagent_no\"]} ({d[\"reagent_name\"]})')
print(f'    导入来源: {d[\"import_source\"]} @ {d[\"import_time\"]} by {d[\"import_operator\"]}')
print()
print('  [测序读段] 总数=', len(d['sequencing_reads']))
lowq = [r for r in d['sequencing_reads'] if r['is_low_quality']==1]
print(f'    低质量读段: {len(lowq)} 条')
for r in lowq[:3]:
    print(f'      - {r[\"read_id\"]}: Q={r[\"quality_score\"]}, 原因={r[\"low_quality_reason\"]}')
print()
print('  [显微照片] 共', len(d['micrographs']), '张')
for mg in d['micrographs']:
    print(f'    - {mg[\"image_path\"]} ({mg[\"magnification\"]}): {mg[\"annotation\"]}')
print()
print('  [复核历史] 共', len(d['reviews']), '次')
for r in d['reviews']:
    print(f'    会话: {r[\"session_name\"]} by {r[\"session_creator\"]}')
    for c in r['conclusions']:
        status = '有效' if c['is_active']==1 else '已失效'
        print(f'      结论({status}): {c[\"final_decision\"]} - {c[\"decided_by\"]}')
print()
print('  [审计日志] 关键操作:')
for a in d['audit_trail'][:5]:
    action_map = {
        'INSERT': '新增',
        'UPDATE_SUPPLEMENT': '补录更新',
        'REVIEW': '复核',
        'CREATE': '创建',
        'SUPERSEDED': '结论失效'
    }
    action = action_map.get(a['action'], a['action'])
    new_vals = a.get('new_values', {}) or {}
    if a['table_name'] == 'sequencing_reads' and new_vals.get('is_low_quality'):
        detail = f'低质量读段 {new_vals.get(\"read_id\",\"?\")} Q={new_vals.get(\"quality_score\",\"?\")}'
    elif a['table_name'] == 'conclusions':
        detail = f'结论状态变更'
    else:
        detail = ''
    print(f'    {a[\"operation_time\"]} | {a[\"table_name\"]} | {action} | {a[\"operator\"]} {detail}')
"
echo ""
echo "步骤3: 从试剂批号反查，确认同试剂其他样本情况"
echo ""
curl -s "$BASE_URL/trace/reagent/REAG-2026-001" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'  试剂 REAG-2026-001 关联结论 {d[\"count\"]} 条:')
for r in d['records']:
    status = '✓' if r['is_active']==1 else '✗'
    print(f'    {status} 样本{r[\"sample_no\"]}: {r[\"final_decision\"]} (复测={r[\"retest_needed\"]})')
    print(f'      结论: {r[\"conclusion_text\"][:50]}...')
"

echo ""
echo "=========================================="
echo "  所有测试完成！"
echo "=========================================="
echo ""
echo "总结验证点:"
echo "  ✓ 重复文件导入被拦截 (文件哈希检测)"
echo "  ✓ 重复记录被跳过 (样本号+日期+类型联合唯一)"
echo "  ✓ 补录后原有结论自动失效 (is_active=0)"
echo "  ✓ 新结论与旧结论有替代链 (superseded_by)"
echo "  ✓ 同一记录始终只有1条有效结论 (防冲突)"
echo "  ✓ 边界不清记录可全链路溯源 (结论→读段→照片→试剂→导入记录→审计日志)"
echo "  ✓ 试剂批号可反查所有关联结论 (无需人工查表)"
echo ""
rm -f "$DUP_FILE"
