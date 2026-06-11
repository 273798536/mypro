#!/bin/bash
set -e

BASE="http://localhost:3001"
API="${BASE}/api"

echo "===== 【重复导入场景】演示 ====="
echo ""
echo "场景说明：系统会按 (细胞系 + 日期 + 类型 + 代次) 四字段自动检测重复，"
echo "          避免工具看上去能跑、实际越跑越乱。"
echo ""

TMPDIR=$(mktemp -d)
PAYLOAD_FILE="$TMPDIR/payload.json"
RESO_FILE="$TMPDIR/resolutions.json"
REQ_FILE="$TMPDIR/request.json"

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

echo "[步骤1] 准备待导入数据（3条：1条新增 + 1条完全重复 + 1条字段冲突）..."

REAGENT_ID=$(curl -sS "${API}/reagents/DMSO-2024-001/trace" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["batch"]["id"])')

EXISTING=$(curl -sS "${API}/records?limit=1&type=freeze" | python3 -c "
import json, sys
r = json.load(sys.stdin)['data'][0]
print(json.dumps(r, ensure_ascii=False))
")

EX_CELL=$(echo "$EXISTING" | python3 -c 'import json,sys; print(json.load(sys.stdin)["cell_line"])')
EX_DATE=$(echo "$EXISTING" | python3 -c 'import json,sys; print(json.load(sys.stdin)["date"])')
EX_TYPE=$(echo "$EXISTING" | python3 -c 'import json,sys; print(json.load(sys.stdin)["type"])')
EX_PASS=$(echo "$EXISTING" | python3 -c 'import json,sys; print(json.load(sys.stdin)["passage_number"])')

echo "  选用现有记录作为重复源: ${EX_CELL} ${EX_DATE} ${EX_TYPE} P${EX_PASS}"

python3 -c "
import json
records = [
  {
    'type': 'freeze', 'cell_line': 'Jurkat', 'passage_number': 8,
    'operator': '导入测试员', 'date': '2026-06-09',
    'freezing_medium': '90%FBS+10%DMSO', 'reagent_batch_id': '$REAGENT_ID',
    'storage_location': '新区-液氮罐5-架1-盒1'
  },
  {
    'type': '$EX_TYPE', 'cell_line': '$EX_CELL', 'passage_number': $EX_PASS,
    'operator': '导入重复', 'date': '$EX_DATE',
    'freezing_medium': '90%FBS+10%DMSO', 'reagent_batch_id': '$REAGENT_ID',
    'storage_location': '重复位置'
  },
  {
    'type': '$EX_TYPE', 'cell_line': '$EX_CELL', 'passage_number': $EX_PASS,
    'operator': '冲突修改', 'date': '$EX_DATE',
    'freezing_medium': '配方冲突', 'reagent_batch_id': '$REAGENT_ID',
    'storage_location': '冲突位置', 'notes': '故意修改配方和操作者，制造字段冲突'
  }
]
with open('$PAYLOAD_FILE', 'w') as f:
    json.dump(records, f, ensure_ascii=False)

resolutions = {'0': 'new', '1': 'skip', '2': 'overwrite'}
with open('$RESO_FILE', 'w') as f:
    json.dump(resolutions, f)

with open('$REQ_FILE', 'w') as f:
    json.dump({'records': records, 'resolutions': resolutions}, f, ensure_ascii=False)
"

echo ""
echo "[步骤2] 先调用 /import/check 预检测（不写入数据库）..."
curl -sS -X POST "${API}/import/check" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json; print(json.dumps({'records': json.load(open('$PAYLOAD_FILE'))}))")" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
print(f\"=== 检测结果 ===\")
print(f\"  新增记录: {d['new_count']} 条\")
print(f\"  完全重复: {d['duplicate_count']} 条\")
print(f\"  字段冲突: {d['conflict_count']} 条\")
if d.get('duplicates'):
    for dup in d['duplicates']:
        print(f\"  [重复] 匹配字段: {dup['match_field']}\")
        print(f\"        现有ID: {dup['existing_id']}\")
        print(f\"        入值细胞系: {dup['incoming']['cell_line']} 代次: P{dup['incoming']['passage_number']}\")
if d.get('conflicts'):
    for c in d['conflicts']:
        print(f\"  [冲突] 现有ID: {c['existing_id']}\")
        print(f\"        差异字段: {c['conflict_fields']}\")
print()
"

echo "[步骤3] 执行导入：第0条新增、第1条跳过、第2条覆盖..."
curl -sS -X POST "${API}/import" \
  -H "Content-Type: application/json" \
  -d "@$REQ_FILE" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
print(f\"=== 导入执行结果 ===\")
print(f\"  导入成功: {d['imported_count']} 条\")
print(f\"  跳过重复: {d['skipped_count']} 条\")
print(f\"  覆盖写入: {d['overwritten_count']} 条\")
print(f\"  新增异常: {d.get('new_anomaly_count', 0)} 条\")
if d.get('imported_ids'):
    print(f\"  新记录ID: {d['imported_ids']}\")
if d.get('anomaly_detected_ids'):
    print(f\"  新生成异常: {d['anomaly_detected_ids']}\")
"

echo ""
echo "[步骤4] 验证数据库：查看 Jurkat P8 2026-06-09 冻存记录是否存在..."
curl -sS "${API}/records?cell_line=Jurkat" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f\"  Jurkat 细胞记录数: {len(d['data'])}\")
for r in d['data']:
    print(f\"    [{r['type']}] P{r['passage_number']} {r['date']} 操作者={r['operator']} ID={r['id']}\")
"

echo ""
echo "[步骤5] 验证冲突覆盖：原记录的操作者和配方是否已更新..."
curl -sS "${API}/records?cell_line=${EX_CELL}&type=${EX_TYPE}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for r in d['data']:
    if r['date'] == '$EX_DATE' and r['passage_number'] == $EX_PASS:
        print(f\"  验证被覆盖记录: 细胞系={r['cell_line']} 日期={r['date']} 代次={r['passage_number']}\")
        print(f\"    操作者 (预期='冲突修改'): {r['operator']}\")
        print(f\"    冻存液配方 (预期='配方冲突'): {r['freezing_medium']}\")
        print(f\"    存储位置: {r['storage_location']}\")
        print(f\"    状态: {r['status']}\")
"

echo ""
echo "===== 重复导入场景演示完成！ ====="
echo "要点回顾："
echo "  1. /import/check 只检测不写入，防止越跑越乱"
echo "  2. 匹配规则：细胞系+日期+类型+代次，四字段完全一致判定为重复"
echo "  3. 部分字段不一致判定为冲突，显示差异字段供人工决策"
echo "  4. 每条记录可独立选择：跳过/覆盖/新增（通过resolutions字典）"
echo "  5. 导入后仍会触发异常检测，不会跳过风控环节"
