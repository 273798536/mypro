#!/bin/bash
set -e

BASE="http://localhost:3001"
API="${BASE}/api"

echo "===== 细胞冻存复苏台账 - 从零跑通完整流程 ====="
echo ""

echo "[1/9] 检查服务是否启动..."
curl -sS -o /dev/null -w "  HTTP %{http_code}\n" "${BASE}/api/health" || {
  echo "  服务未启动！请先运行：npm run dev"
  exit 1
}

echo ""
echo "[2/9] 查看台账总览统计..."
echo "--- 分组统计汇总 ---"
curl -sS "${API}/statistics" | python3 -m json.tool | head -20

echo ""
echo "[3/9] 查询所有培养记录..."
echo "--- 培养记录列表（前5条）---"
curl -sS "${API}/records?limit=5" | python3 -c "
import json, sys
d = json.load(sys.stdin)
records = d['data']
print(f'总共 {d[\"pagination\"][\"total\"]} 条记录')
for r in records:
    print(f\"  [{r['type']}] {r['cell_line']} P{r['passage_number']}  {r['date']}  状态:{r['status']}  存活率:{r['viability_rate']}  ID:{r['id']}\")
"

echo ""
echo "[4/9] 查询试剂批号信息（DMSO-2024-001 -> 所有关联记录和结论）..."
echo "--- 试剂批号追溯链路 ---"
curl -sS "${API}/reagents/DMSO-2024-001/trace" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
b = d['batch']
print(f\"批号: {b['batch_number']}  试剂: {b['reagent_name']}  供应商: {b['supplier']}  有效期: {b['expiry_date']}\")
s = d['conclusion_summary']
print(f\"结论汇总: 成功 {s['success']} 失败 {s['failed']} 待定 {s['pending']}\")
for r in d['linked_records']:
    rec = r['record']
    print(f\"  -> [{rec['type']}] {rec['cell_line']} P{rec['passage_number']} {rec['date']} 结论:{rec['conclusion']} 状态:{rec['status']} 照片数:{len(r['photos'])}\")
"

echo ""
echo "[5/9] 谱系追踪 - 查看 CHO-K1 细胞传代链路..."
PARENT_ID=$(curl -sS "${API}/records?cell_line=CHO-K1&type=freeze" | python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['id'])")
echo "根冻存记录 ID: ${PARENT_ID}"
echo "--- 谱系树 ---"
curl -sS "${API}/lineage/${PARENT_ID}" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
def walk(node, depth=0):
    r = node['record'] if 'record' in node else node
    children = node['children'] if 'children' in node else d.get('children', [])
    indent = '  ' * depth
    marker = '└─ ' if depth > 0 else ''
    print(f\"{indent}{marker}[{r['type']}] {r['cell_line']} P{r['passage_number']} {r['date']} 状态:{r['status']} ID:{r['id']}\")
    for c in children:
        walk(c, depth+1)
root = d['root']
print(f\"[根节点] {root['type']} {root['cell_line']} P{root['passage_number']}\")
for c in d.get('children', []):
    walk(c, 1)
"

echo ""
echo "[6/9] 查看所有异常记录与可操作提示..."
echo "--- 异常列表（含中文可操作提示）---"
curl -sS "${API}/anomalies?review_status=pending" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
print(f\"待处理异常 {len(d)} 条\")
for a in d:
    print(f\"  [{a['anomaly_type']}] {a['description']}\")
    print(f\"     操作建议: {a['actionable_hint']}\")
    print(f\"     关联记录ID: {a['record_id']}\")
    if a.get('source_material_ids'):
        print(f\"     来源材料ID: {a['source_material_ids']}\")
    print()
"

echo ""
echo "[7/9] 新建冻存记录（自动触发异常检测）..."
REAGENT_ID=$(curl -sS "${API}/reagents/DMSO-2024-001/trace" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["batch"]["id"])')
NEW_ID=$(curl -sS -X POST "${API}/records" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"freeze\",
    \"cell_line\": \"NIH3T3\",
    \"passage_number\": 15,
    \"operator\": \"测试员\",
    \"date\": \"2026-06-11\",
    \"freezing_medium\": \"90%FBS+10%DMSO\",
    \"reagent_batch_id\": \"${REAGENT_ID}\",
    \"storage_location\": \"A区-液氮罐1-架3-盒7\",
    \"notes\": \"测试新建记录\"
  }" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('创建结果:')
print(f\"  记录ID: {d['data']['record']['id']}\")
print(f\"  自动状态: {d['data']['record']['status']}\")
if d['data'].get('warnings'):
    print(f\"  系统警告: {d['data']['warnings']}\")
if d['data'].get('anomaly_ids'):
    print(f\"  自动生成异常: {d['data']['anomaly_ids']}\")
print(d['data']['record']['id'])
" | tail -1)

echo "  新建记录ID: ${NEW_ID}"

echo ""
echo "[8/9] 复核刚才创建记录的异常（因缺少冻存前照片而被自动标记待复核）..."
ANOMALY_ID=$(curl -sS "${API}/anomalies" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
for a in d:
    if a['anomaly_type'] == 'missing_photo' and a['review_status'] == 'pending':
        print(a['id'])
        break
")
echo "  待复核异常ID: ${ANOMALY_ID}"
if [ -n "$ANOMALY_ID" ] && [ "$ANOMALY_ID" != "None" ]; then
curl -sS -X PUT "${API}/anomalies/${ANOMALY_ID}/review" \
  -H "Content-Type: application/json" \
  -d "{
    \"review_status\": \"approved\",
    \"reviewer\": \"实验室技师\",
    \"review_comment\": \"照片已补充，符合冻存标准\"
  }" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f\"  复核结果: 状态={d['data']['review_status']}  复核人={d['data']['reviewer']}  意见={d['data']['review_comment']}\")
"
fi

echo ""
echo "[9/9] 复查记录状态（复核后已更新）..."
if [ -n "$NEW_ID" ] && [ "$NEW_ID" != "None" ]; then
curl -sS "${API}/records/${NEW_ID}" | python3 -c "
import json, sys
r = json.load(sys.stdin)['data']
print(f\"  记录ID: {r['id']}\")
print(f\"  最新状态: {r['status']}\")
print(f\"  细胞系: {r['cell_line']} 代次: P{r['passage_number']}\")
print(f\"  关联试剂批号ID: {r['reagent_batch_id']}\")
"
fi

echo ""
echo "===== 基础流程跑完！下面演示【重复导入场景】====="
echo ""
