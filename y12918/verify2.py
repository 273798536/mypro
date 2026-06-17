#!/usr/bin/env python3
import json, subprocess, sys, time

def curl(method, url, data=None):
    args = ['curl', '-s', '-X', method]
    if data:
        args += ['-H', 'Content-Type: application/json', '-d', json.dumps(data)]
    args.append(url)
    r = subprocess.run(args, capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except:
        return {'raw': r.stdout}

def step(title):
    print(f'\n{"="*60}\n  {title}\n{"="*60}')

# 步骤3：调用generate重新生成报告，验证结果与预置一致
step('步骤3：新建报告→调用generate自动计算，验证结果与预置一致')

# 先新建一份报告（与示例相同的评测集和词表）
ts = int(time.time())
print(f'  3.1 新建报告（相同评测集#1 + 词表#1，不同名） time={ts}')
resp = curl('POST', 'http://localhost:3000/api/reports', {
    'name': f'2024Q1金融领域词表覆盖报告-自动生成版-{ts}',
    'evaluation_set_id': 1,
    'vocabulary_id': 1,
    'created_by': '验证脚本'
})
new_report_id = resp['data']['id']
print(f'      新建报告ID: #{new_report_id}')
# 新创建的报告接口只返回id，查详情获取初始状态
detail = curl('GET', f'http://localhost:3000/api/reports/{new_report_id}')
initial_status = detail['data']['status'] if detail.get('data') else 'N/A'
print(f'      初始状态: {initial_status}')

# 生成报告
print(f'\n  3.2 调用 POST /api/reports/{new_report_id}/generate 自动计算覆盖')
resp = curl('POST', f'http://localhost:3000/api/reports/{new_report_id}/generate')
r = resp['data']
print(f'      生成后状态: {r["status"]}')
print(f'      总题数: {r["total_questions"]}')
print(f'      覆盖题数: {r["covered_questions"]}')
print(f'      覆盖率: {r["coverage_rate"]}%')
print(f'      命中词数: {r["hit_terms"]}')
print(f'      系统生成摘要: {r["summary"]}')

# 对比预置报告的统计
print(f'\n  3.3 对比预置报告#1 和 自动生成报告#{new_report_id}')
old_summary = curl('GET', 'http://localhost:3000/api/reports/1/summary')['data']
new_summary = curl('GET', f'http://localhost:3000/api/reports/{new_report_id}/summary')['data']
old = old_summary['report']
new = new_summary['report']

checks = [
    ('总题数相同', old['total_questions'] == new['total_questions'] == 8),
    ('覆盖题数相同(6)', old['covered_questions'] == new['covered_questions'] == 6),
    ('覆盖率相同(75%)', old['coverage_rate'] == new['coverage_rate'] == 75),
    ('命中词数相同(7)', old['hit_terms'] == new['hit_terms'] == 7),
    ('标注统计一致', old_summary['annotationStats'] == new_summary['annotationStats']),
    ('覆盖统计一致', old_summary['coverageStats'] == new_summary['coverageStats']),
]
all_ok = True
for name, ok in checks:
    mark = '✓' if ok else '✗'
    if not ok: all_ok = False
    print(f'      {mark} {name}')

# 逐条对比
print(f'\n  3.4 逐条命中对比')
old_items = curl('GET', f'http://localhost:3000/api/reports/1/items?pageSize=50')['data']['items']
new_items = curl('GET', f'http://localhost:3000/api/reports/{new_report_id}/items?pageSize=50')['data']['items']

all_match = True
for oi, ni in zip(sorted(old_items, key=lambda x: x['question_id']),
                  sorted(new_items, key=lambda x: x['question_id'])):
    assert oi['question_id'] == ni['question_id']
    qid = oi['question_id']
    oc = oi['is_covered']
    nc = ni['is_covered']
    oh = sorted(json.loads(oi['hit_terms']))
    nh = sorted(json.loads(ni['hit_terms']))
    match = (oc == nc and oh == nh)
    if not match: all_match = False
    mark = '✓' if match else '✗'
    print(f'      {mark} {qid}: 覆盖预置{oc}/生成{nc}  命中预置{oh}/生成{nh}')

print(f'\n  结果：')
print(f'    报告级一致: {"✓ 全部通过" if all_ok else "✗ 存在差异"}')
print(f'    条目级一致: {"✓ 全部一致" if all_match else "✗ 存在差异"}')

# 清理：因为状态是 pending_review，不需要清理
