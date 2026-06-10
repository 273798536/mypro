#!/bin/bash
set -e
BASE=http://127.0.0.1:8080/api/v1

echo "=== [1/5] 推进状态到 reviewing ==="
curl -s -X POST "$BASE/records/2/status/next" -H "Content-Type: application/json" \
  -d '{"operator":"配方工程师-李工","operation_note":"UI点击复核开始"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('推进后状态:', d.get('status'))"

echo ""
echo "=== [2/5] 提交复核（处理意见+安全+逐项）==="
curl -s -X POST "$BASE/records/2/review" -H "Content-Type: application/json" -d @- <<'JSONEOF' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('提交后状态:', d.get('status'),'|复核人:',d.get('reviewer'))"
{
  "reviewer":"配方主管-王工",
  "processing_opinion":"同意本批次放行：1) 温度已统一按℃复核，保温槽310.15K=37℃与酶活最适温度一致；2) ONPG称样量0.3mg已通过微量天平(W330型)确认，请后续批次尽量增大到1mg以上；3) 产物峰与杂质X中度重叠，已按背景扣除法定量，RSD<3%可接受；4) 乳糖单位漏填项已与上一班李工确认，按mmol/L处理无误。",
  "safety_note":"安全提醒：① β-巯基乙醇具有刺激性臭味，需在通风橱操作；② ONPG 水解产物邻硝基苯酚对皮肤有染色作用，操作时戴一次性手套；③ 反应终止液 1M Na2CO3 为强碱性，避免溅入眼。",
  "supplementary_note":"补录说明：1) 反应温度 310.15K 来自上一班记录（李工），当班人习惯用开尔文；2) ONPG 称样量由辅助记录回算，原始称量单编号 W-20260608-037；3) 乳糖 2 号样浓度单位漏填，按历史批次惯例默认 mmol/L；4) 缓冲液 pH 旧表未写单位，按标准以pH单位计。复核人补充：所有补录均已核对原始记录单。",
  "pass_review":true
}
JSONEOF

echo ""
echo "=== [3/5] 普通话解释（首段）==="
curl -s "$BASE/records/2/report/plain-explain" | python3 -c "
import sys,json
d=json.load(sys.stdin)
explain = d.get('plain_explain','')
chunks = explain.split('\n\n')
for i, c in enumerate(chunks[:3]):
    print('【段落%d】%s' % (i+1, c[:200]))
"

echo ""
echo "=== [4/5] 异常追溯链（锚定 ONPG 称量异常）==="
curl -s "$BASE/records/2/report/audit-chain?anomaly_key=ONPG" | python3 -c "
import sys,json
d=json.load(sys.stdin)
chain = d.get('chain',[])
print('锚定异常:', d.get('anomaly_key'))
for n in chain:
    lvl = n.get('level','?')
    print('  [L%s] %s' % (lvl, n.get('node')))
    ev = n.get('evidence') or {}
    if isinstance(ev, dict):
        items = list(ev.items())[:3]
        for k,v in items:
            s = str(v)
            if len(s) > 110: s = s[:110] + '...'
            print('       └ %s: %s' % (k, s))
    if n.get('suggestion'):
        print('       💡 建议:', n['suggestion'])
"

echo ""
echo "=== [5/5] 生成 PDF 报告 ==="
curl -s -X POST "$BASE/records/2/report/export?operator=%E7%8E%8B%E5%B7%A5" \
  | python3 -c "import sys,json; d=json.load(sys.stdin);
print('成功:',d.get('success'),'|文件名:',d.get('file_name'),'|下载URL:',d.get('download_url'))"

echo ""
echo "=== ✅ 全流程联调完成，重启后持久化验证 ==="
curl -s "$BASE/records?keyword=EZS-20260608-A11" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('查询结果总条数:', d.get('total'))
for it in d.get('items',[]):
    print('  · id=%s 记录号=%s 状态=%s 复核人=%s |异常:温度%s 峰%s 称量%s 漏填%s' % (
        it['id'], it['record_no'], it['status'], it.get('reviewer','—'),
        '是' if it.get('has_temp_unit_mix') else '否',
        '是' if it.get('has_peak_overlap') else '否',
        '是' if it.get('has_weighing_issue') else '否',
        len(it.get('missing_unit_fields') or [0])))
"
