#!/usr/bin/env python3
import json, subprocess

def curl_get(url):
    r = subprocess.run(['curl', '-s', url], capture_output=True, text=True)
    return json.loads(r.stdout)

def run_step(title):
    print(f'\n{"="*60}\n  {title}\n{"="*60}')

# 1. 逐条覆盖一致性
run_step('步骤1：逐条覆盖一致性检查')
items = curl_get('http://localhost:3000/api/reports/1/items?pageSize=50')['data']['items']
expected = {
    'FIN-001': (True, ['市盈率', '市净率']),
    'FIN-002': (True, ['净资产收益率']),
    'FIN-003': (True, ['毛利率']),
    'FIN-004': (True, ['资产负债率']),
    'FIN-005': (True, ['流动比率']),
    'FIN-006': (True, ['净利润']),
    'FIN-007': (False, []),
    'FIN-008': (False, []),
}
all_ok = True
for item in items:
    qid = item['question_id']
    hits = json.loads(item['hit_terms'])
    actual_covered = item['is_covered'] == 1
    exp_cov, exp_hits = expected[qid]
    cov_ok = actual_covered == exp_cov
    hit_ok = sorted(hits) == sorted(exp_hits)
    if not cov_ok or not hit_ok:
        all_ok = False
    status = '✓' if (cov_ok and hit_ok) else '✗'
    print(f'  {status} {qid}: 覆盖={actual_covered}(期望{exp_cov}) 命中词={hits}(期望{exp_hits})')
print(f'\n  结果：{"全部通过 ✓" if all_ok else "存在不一致 ✗"}')

# 2. 报告摘要 vs 实际统计
run_step('步骤2：报告摘要 vs 实际统计一致性')
summary = curl_get('http://localhost:3000/api/reports/1/summary')['data']
r = summary['report']
stats = summary['coverageStats']
ann = summary['annotationStats']
actual_covered = stats['covered']
actual_uncovered = stats['uncovered']
actual_total = actual_covered + actual_uncovered
actual_rate = round(actual_covered / actual_total * 100, 2) if actual_total else 0
actual_hit_count = len(set(h for item in items for h in json.loads(item['hit_terms'])))

checks = [
    ('总题数一致', r['total_questions'] == actual_total == 8),
    ('覆盖题数一致', r['covered_questions'] == actual_covered == 6),
    ('未覆盖题数一致', actual_uncovered == 2),
    ('覆盖率一致(75%)', r['coverage_rate'] == actual_rate == 75.0),
    ('命中词数一致(7)', r['hit_terms'] == actual_hit_count == 7),
    ('标注统计-未标注2', ann['none'] == 2),
    ('标注统计-部分1', ann['partial'] == 1),
    ('标注统计-已完成5', ann['full'] == 5),
    ('摘要文本正确', f'{r["total_questions"]}题，其中{r["covered_questions"]}题命中词表，覆盖率{r["coverage_rate"]}%' in r['summary']),
]

all_ok2 = True
for name, ok in checks:
    mark = '✓' if ok else '✗'
    if not ok:
        all_ok2 = False
    print(f'  {mark} {name}')
print(f'\n  结果：{"全部通过 ✓" if all_ok2 else "存在不一致 ✗"}')

print(f'\n  实际覆盖率统计：覆盖{actual_covered}题/总{actual_total}题 = {actual_rate}%')
print(f'  实际命中词数：{actual_hit_count}个不同词')
print(f'  报告存储：covered={r["covered_questions"]}, rate={r["coverage_rate"]}%, hit_terms={r["hit_terms"]}')
