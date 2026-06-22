#!/bin/bash
BASE_URL="http://localhost:3000"

echo "=========================================="
echo "  图论割点课堂验算 - 复核工具"
echo "=========================================="
echo ""
echo "用法: ./scripts/review.sh [记录ID]"
echo "  不带参数: 查看异常总览和待处理列表"
echo "  带记录ID: 查看该记录的完整复核信息"
echo ""

if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo "❌ 服务未启动，请先运行: npm start"
    exit 1
fi

REC_ID="$1"

if [ -z "$REC_ID" ]; then
    echo "=========================================="
    echo "  异常总览"
    echo "=========================================="
    curl -s "$BASE_URL/api/exceptions/summary" | python3 -m json.tool 2>/dev/null
    echo ""
    echo "=========================================="
    echo "  脏数据列表 (需要优先处理)"
    echo "=========================================="
    curl -s "$BASE_URL/api/records?status=dirty" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['count'] == 0:
    print('✅ 暂无脏数据')
else:
    print(f'共 {data[\"count\"]} 条脏数据:')
    for r in data['data']:
        print(f'  ID: {r[\"id\"]}')
        print(f'  小包: {r[\"package_no\"]}')
        print(f'  原因: {r[\"dirty_reason\"]}')
        print(f'  建议: {r[\"processing_suggestion\"]}')
        print(f'  创建: {r[\"created_at\"]}')
        print('  ---')
" 2>/dev/null
    echo ""
    echo "=========================================="
    echo "  待撤回人工判断列表"
    echo "=========================================="
    curl -s "$BASE_URL/api/records?status=withdraw_pending" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['count'] == 0:
    print('✅ 暂无待处理撤回申请')
else:
    print(f'共 {data[\"count\"]} 条撤回申请待人工判断:')
    for r in data['data']:
        print(f'  ID: {r[\"id\"]}')
        print(f'  小包: {r[\"package_no\"]}')
        print(f'  状态: {r[\"status\"]}')
        print(f'  创建: {r[\"created_at\"]}')
        print(f'  操作: curl -s \"$BASE_URL/api/records/{r['id']}/review-actions\"')
        print('  ---')
" 2>/dev/null
    echo ""
    echo "=========================================="
    echo "  所有记录列表"
    echo "=========================================="
    curl -s "$BASE_URL/api/records" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'共 {data['count']} 条记录:')
for r in data['data']:
    status_icon = {'pending':'⏳','reviewed':'✅','dirty':'❌','withdrawn':'↩️','withdraw_pending':'🤔'}.get(r['status'],'❓')
    dirty_marker = ' [脏数据]' if r['is_dirty'] else ''
    print(f'  {status_icon} {r[\"id\"]} | 小包:{r[\"package_no\"]} | 状态:{r[\"status\"]}{dirty_marker}')
" 2>/dev/null
else
    echo "=========================================="
    echo "  记录详情: $REC_ID"
    echo "=========================================="
    curl -s "$BASE_URL/api/records/$REC_ID" | python3 -m json.tool 2>/dev/null
    echo ""
    echo "=========================================="
    echo "  状态变更历史"
    echo "=========================================="
    curl -s "$BASE_URL/api/records/$REC_ID/history" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for h in data['data']:
    print(f'  [{h[\"created_at\"]}] {h[\"from_status\"]} -> {h[\"to_status\"]}')
    print(f'    操作人: {h[\"operator\"]}')
    if h['reason']:
        print(f'    原因: {h[\"reason\"]}')
" 2>/dev/null
    echo ""
    echo "=========================================="
    echo "  参数版本追溯"
    echo "=========================================="
    curl -s "$BASE_URL/api/records/$REC_ID/parameters" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data['data']:
    print(f'  版本 {p[\"version\"]} | 参数: {p[\"param_name\"]}')
    print(f'    [{p[\"created_at\"]}] 操作人: {p[\"operator\"]}')
    if p['old_value']:
        print(f'    变更: {p[\"old_value\"]}{p[\"old_unit\"] or \"\"} -> {p[\"new_value\"]}{p[\"new_unit\"] or \"\"}')
    else:
        print(f'    初始值: {p[\"new_value\"]}{p[\"new_unit\"] or \"\"}')
    if p['conversion_factor']:
        print(f'    换算因子: {p[\"conversion_factor\"]}')
    if p['threshold_old'] is not None:
        print(f'    阈值: {p[\"threshold_old\"]} -> {p[\"threshold_new\"]}')
    if p['change_reason']:
        print(f'    原因: {p[\"change_reason\"]}')
    print('  ---')
" 2>/dev/null
    echo ""
    echo "=========================================="
    echo "  异常记录 (不只是警告)"
    echo "=========================================="
    curl -s "$BASE_URL/api/records/$REC_ID/exceptions" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data['data']:
    print('✅ 无异常记录')
else:
    for e in data['data']:
        sev = {'error':'🔴 ERROR','warning':'🟡 WARNING','info':'🔵 INFO'}.get(e['severity'], e['severity'])
        print(f'  {sev} [{e[\"created_at\"]}] {e[\"exception_type\"]}')
        print(f'    详情: {e[\"detail\"]}')
        if e['original_value'] is not None:
            print(f'    原始值: {e[\"original_value\"]}')
        if e['suggested_value'] is not None:
            print(f'    建议值: {e[\"suggested_value\"]}')
        if e['suggestion']:
            print(f'    处理建议: {e[\"suggestion\"]}')
        print('  ---')
" 2>/dev/null
    echo ""
    echo "=========================================="
    echo "  复核动作记录"
    echo "=========================================="
    curl -s "$BASE_URL/api/records/$REC_ID/review-actions" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for a in data['data']:
    human = '🤔 需要人工判断' if a['needs_human_judgment'] else '✅ 自动复核'
    result = a['human_judgment_result'] or '⏳ 待判断'
    print(f'  [{a[\"created_at\"]}] {a[\"action_type\"]} | {human} | 结果: {result}')
    if a['judgment_note']:
        print(f'    备注: {a[\"judgment_note\"]}')
    if a['operator']:
        print(f'    操作人: {a[\"operator\"]}')
    print('  ---')
" 2>/dev/null
fi
echo ""
echo "=========================================="
echo "  常用复核命令"
echo "=========================================="
echo ""
echo "# 批准撤回申请"
echo 'curl -s -X POST "http://localhost:3000/api/records/<ID>/withdraw/judge" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"action_id": 1, "approved": true, "judgment_note": "同意撤回"}'"'"
echo ""
echo "# 驳回撤回申请"
echo 'curl -s -X POST "http://localhost:3000/api/records/<ID>/withdraw/judge" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"action_id": 1, "approved": false, "judgment_note": "数据无误，不予撤回"}'"'"
echo ""
echo "# 复核通过"
echo 'curl -s -X POST "http://localhost:3000/api/records/<ID>/review" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"reviewer": "老王", "comment": "验算正确"}'"'"
echo ""
