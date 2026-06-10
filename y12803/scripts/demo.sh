#!/bin/bash
# 植物表型生长曲线 - 完整流程示例脚本
# 从空目录开始，一步步跑通整个流程

set -e

BASE_URL="http://localhost:3001"

echo "========================================"
echo "  植物表型生长曲线 - 完整流程演示"
echo "========================================"
echo ""

echo "1. 检查示例数据状态"
curl -s "$BASE_URL/api/seed/status" | python3 -m json.tool
echo ""

echo "2. 初始化示例数据（首次启动时）"
curl -s -X POST "$BASE_URL/api/seed" | python3 -m json.tool
echo ""

echo "3. 查看所有实验分组"
curl -s "$BASE_URL/api/groups" | python3 -m json.tool
echo ""

echo "4. 查看第一个实验组的详情"
GROUP_ID=$(curl -s "$BASE_URL/api/groups" | python3 -c "import sys,json; data=json.load(sys.stdin); print(data['data'][0]['id'])" 2>/dev/null)
if [ -n "$GROUP_ID" ]; then
  echo "   实验组ID: $GROUP_ID"
  curl -s "$BASE_URL/api/groups/$GROUP_ID" | python3 -m json.tool
fi
echo ""

echo "5. 查看生长曲线数据"
if [ -n "$GROUP_ID" ]; then
  curl -s "$BASE_URL/api/groups/$GROUP_ID/curves" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    curves = data['data']['curves']
    print(f'   共 {len(curves)} 株植物的曲线数据')
    for c in curves[:3]:
        print(f'   - {c[\"plant_code\"]}: {len(c[\"measurements\"])} 个测量点')
"
fi
echo ""

echo "6. 查看实验组结论（导师查看末页）"
if [ -n "$GROUP_ID" ]; then
  curl -s "$BASE_URL/api/groups/$GROUP_ID/conclusion" | python3 -m json.tool
fi
echo ""

echo "7. 查看培养记录（前10条）"
curl -s "$BASE_URL/api/records" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    records = data['data'][:10]
    print(f'   共 {len(data[\"data\"])} 条记录，展示前10条:')
    for r in records:
        supp = ' [补录]' if r.get('is_supplementary') else ''
        print(f'   - {r[\"plant_code\"]} | 批号: {r[\"batch_no\"]} | {r[\"measured_at\"][:10]} | {r[\"temperature\"]}°C{supp}')
"
echo ""

echo "8. 按试剂批号追溯"
curl -s "$BASE_URL/api/records/batch/RGT-2025-001" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    d = data['data']
    print(f'   批号: {d[\"batchNo\"]}')
    print(f'   培养记录: {len(d[\"records\"])} 条')
    print(f'   测量数据: {len(d[\"measurements\"])} 条')
    for c in d.get('conclusions', []):
        print(f'   结论: {c[\"name\"]} - {c[\"conclusion_status\"]} - {c.get(\"conclusion\", \"无\")}')
"
echo ""

echo "9. 查看质控摘要"
curl -s "$BASE_URL/api/qc/summary" | python3 -m json.tool
echo ""

echo "10. 测试重复导入检测"
curl -s -X POST "$BASE_URL/api/import/check-duplicates" \
  -H "Content-Type: application/json" \
  -d '[{
    "group_id": "test-group",
    "plant_id": "test-plant",
    "batch_no": "RGT-2025-001",
    "recorded_at": "2025-03-01T08:00:00Z",
    "measured_at": "2025-03-01T08:00:00Z"
  }]' | python3 -m json.tool
echo ""

echo "11. 导入新数据（JSON格式）"
curl -s -X POST "$BASE_URL/api/import/json" \
  -H "Content-Type: application/json" \
  -d '[{
    "group_id": "'$GROUP_ID'",
    "plant_id": "import-test-001",
    "batch_no": "RGT-2025-TEST",
    "recorded_at": "2025-04-01T08:00:00Z",
    "measured_at": "2025-04-01T08:00:00Z",
    "temperature": 24.5,
    "humidity": 65.0,
    "light_intensity": 5200,
    "nutrient_solution": "MS基础培养基",
    "is_supplementary": false,
    "note": "curl导入测试"
  }]' | python3 -m json.tool
echo ""

echo "12. 尝试重复导入同一条记录（应检测到冲突）"
curl -s -X POST "$BASE_URL/api/import/json" \
  -H "Content-Type: application/json" \
  -d '[{
    "group_id": "'$GROUP_ID'",
    "plant_id": "import-test-001",
    "batch_no": "RGT-2025-TEST",
    "recorded_at": "2025-04-01T08:00:00Z",
    "measured_at": "2025-04-01T08:00:00Z",
    "temperature": 25.0,
    "humidity": 70.0,
    "light_intensity": 5500,
    "nutrient_solution": "MS基础培养基",
    "is_supplementary": false,
    "note": "重复导入测试"
  }]' | python3 -m json.tool
echo ""

echo "13. 新增培养记录（补录）"
PLANT_ID=$(curl -s "$BASE_URL/api/groups/$GROUP_ID/curves" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['curves'][0]['plant_id'])" 2>/dev/null)
if [ -n "$PLANT_ID" ]; then
  curl -s -X POST "$BASE_URL/api/records" \
    -H "Content-Type: application/json" \
    -d "{
      \"group_id\": \"$GROUP_ID\",
      \"plant_id\": \"$PLANT_ID\",
      \"batch_no\": \"RGT-2025-003\",
      \"recorded_at\": \"2025-04-15T10:00:00Z\",
      \"measured_at\": \"2025-04-15T10:00:00Z\",
      \"temperature\": 23.0,
      \"humidity\": 58.0,
      \"light_intensity\": 4800,
      \"nutrient_solution\": \"1/2 MS\",
      \"is_supplementary\": true,
      \"supplementary_to\": null,
      \"note\": \"补录测试\"
    }" | python3 -m json.tool
fi
echo ""

echo "========================================"
echo "  流程演示完成！"
echo "========================================"
echo ""
echo "常用 curl 命令速查:"
echo "  获取分组列表:     curl $BASE_URL/api/groups"
echo "  获取生长曲线:     curl $BASE_URL/api/groups/<组ID>/curves"
echo "  获取结论:         curl $BASE_URL/api/groups/<组ID>/conclusion"
echo "  获取培养记录:     curl $BASE_URL/api/records"
echo "  按批号追溯:       curl $BASE_URL/api/records/batch/<批号>"
echo "  质控摘要:         curl $BASE_URL/api/qc/summary"
echo "  初始化示例数据:   curl -X POST $BASE_URL/api/seed"
echo "  检查种子状态:     curl $BASE_URL/api/seed/status"
