#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
组合计数边界校验脚本
功能：读取批次数据，执行组合/排列计算校验，检测重复样本，识别边界情况，
     关联晚到附件问题，生成复核摘要页面。
"""

import csv
import math
import os
import json
from collections import defaultdict
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output')
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')

PARAM_VERSION = "v2.3.1"
THRESHOLD_LARGE = 1e15


def read_csv(filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def calc_combination(n, k):
    if k is None or n is None:
        return None
    if k < 0 or n < 0:
        return None
    if k > n:
        return 0
    return math.comb(n, k)


def calc_permutation(n, k):
    if k is None or n is None:
        return None
    if k < 0 or n < 0:
        return None
    if k > n:
        return 0
    return math.perm(n, k)


def calc_power(n):
    if n is None or n < 0:
        return None
    return 2 ** n


def parse_int(val):
    if val is None or val == '' or val.upper() == 'NA':
        return None
    try:
        return int(val)
    except ValueError:
        return None


def classify_boundary(n, k, calc_type):
    tags = []
    if n is not None and n == 0:
        tags.append('零值')
    if k is not None and k == 0:
        tags.append('空选')
    if k is not None and n is not None and k == n:
        tags.append('全选/全集')
    if k is not None and n is not None and k == 1:
        tags.append('单选')
    if k is not None and n is not None and k == n - 1:
        tags.append('近全集')
    if k is not None and n is not None and k > n:
        tags.append('越界(k>n)')
    if n is not None and n < 0:
        tags.append('负数n')
    if k is not None and k < 0:
        tags.append('负数k')
    if calc_type and '约束' in calc_type:
        tags.append('带约束')
    return tags


def verify_record(record):
    n = parse_int(record.get('n'))
    k = parse_int(record.get('k'))
    calc_type = record.get('计算类型', '')
    submitted_raw = record.get('提交结果', '').strip()
    submitted = parse_int(submitted_raw)

    expected = None
    status = '已处理'
    issues = []
    notes = []

    if '组合' in calc_type and '约束' not in calc_type:
        expected = calc_combination(n, k)
    elif '排列' in calc_type and '约束' not in calc_type:
        expected = calc_permutation(n, k)
    elif '2^n' in calc_type or '子集' in calc_type:
        expected = calc_power(n)
    elif '约束' in calc_type:
        status = '人工改判'
        notes.append('约束组合/排列需人工复核公式')
        expected = submitted
    else:
        status = '待补材料'
        issues.append('计算类型不明确')

    boundary_tags = classify_boundary(n, k, calc_type)

    if expected is not None and submitted is not None:
        if expected != submitted:
            issues.append(f'结果不符：提交{submitted}，应为{expected}')
            if status == '已处理':
                status = '已处理-异常'
        if expected > THRESHOLD_LARGE:
            notes.append('结果超过阈值，需确认大数处理方式')
    elif submitted is not None and '约束' not in calc_type:
        if status == '已处理':
            status = '待补材料'
        issues.append('无法计算期望值，参数缺失')

    return {
        'id': record.get('记录ID', ''),
        'desc': record.get('场景描述', ''),
        'n': n,
        'k': k,
        'calc_type': calc_type,
        'submitted': submitted,
        'expected': expected,
        'boundary_tags': boundary_tags,
        'status': status,
        'issues': issues,
        'notes': notes,
        'source_row': record.get('来源行号', ''),
        'data_source': record.get('数据来源', ''),
    }


def find_duplicates(records):
    groups = defaultdict(list)
    for r in records:
        key = (r['n'], r['k'], r['calc_type'], r['submitted'])
        groups[key].append(r)

    dup_groups = []
    for key, items in groups.items():
        if len(items) > 1:
            dup_groups.append({
                'key': key,
                'records': items,
                'source_rows': [item['source_row'] for item in items],
                'sources': [item['data_source'] for item in items],
                'impact_scope': len(items),
            })
    return dup_groups


def match_late_attachments(records, attachments):
    matched = []
    for att in attachments:
        if 'BATCH-12' in att.get('对应批次', ''):
            matched.append(att)
    return matched


def generate_summary_data(verified, duplicates, late_atts, historical, boundary_samples):
    status_counts = defaultdict(int)
    boundary_count = 0
    for r in verified:
        status_counts[r['status']] += 1
        if r['boundary_tags']:
            boundary_count += 1

    abnormal_points = [r for r in verified if r['issues']]

    return {
        'param_version': PARAM_VERSION,
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'total_count': len(verified),
        'status_counts': dict(status_counts),
        'boundary_count': boundary_count,
        'duplicate_groups': len(duplicates),
        'duplicate_records': sum(g['impact_scope'] for g in duplicates),
        'late_attachments_count': len(late_atts),
        'historical_count': len(historical),
        'boundary_samples_count': len(boundary_samples),
        'verified_records': verified,
        'duplicate_detail': duplicates,
        'late_attachments': late_atts,
        'abnormal_points': abnormal_points,
        'historical_samples': historical,
        'boundary_samples': boundary_samples,
    }


def render_html(data):
    template_path = os.path.join(TEMPLATE_DIR, 'review_template.html')
    css_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'style.css')

    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()

    with open(css_path, 'r', encoding='utf-8') as f:
        css = f.read()

    status_map = {
        '已处理': 'status-done',
        '已处理-异常': 'status-error',
        '待补材料': 'status-pending',
        '人工改判': 'status-manual',
    }

    status_label_map = {
        '已处理': '已处理',
        '已处理-异常': '已处理·异常',
        '待补材料': '待补材料',
        '人工改判': '人工改判',
    }

    rows_html = ''
    for r in data['verified_records']:
        css_class = status_map.get(r['status'], '')
        status_text = status_label_map.get(r['status'], r['status'])
        boundary_str = '、'.join(r['boundary_tags']) if r['boundary_tags'] else '-'
        issues_str = '；'.join(r['issues']) if r['issues'] else '-'
        notes_str = '；'.join(r['notes']) if r['notes'] else '-'
        expected_str = str(r['expected']) if r['expected'] is not None else 'N/A'
        n_str = str(r['n']) if r['n'] is not None else 'N/A'
        k_str = str(r['k']) if r['k'] is not None else 'N/A'

        rows_html += f'''        <tr class="{css_class}">
          <td>{r['id']}</td>
          <td>{r['desc']}</td>
          <td>{n_str}</td>
          <td>{k_str}</td>
          <td>{r['calc_type']}</td>
          <td>{r['submitted'] if r['submitted'] is not None else '-'}</td>
          <td>{expected_str}</td>
          <td class="boundary-tags">{boundary_str}</td>
          <td class="issues">{issues_str}</td>
          <td class="notes">{notes_str}</td>
          <td><span class="status-badge {css_class}">{status_text}</span></td>
        </tr>
'''

    dup_html = ''
    for idx, g in enumerate(data['duplicate_detail'], 1):
        records_html = '<br>'.join([
            f"{r['id']}（{r['source_row']} · {r['data_source']}）"
            for r in g['records']
        ])
        n_str = str(g['key'][0]) if g['key'][0] is not None else 'N/A'
        k_str = str(g['key'][1]) if g['key'][1] is not None else 'N/A'
        dup_html += f'''        <tr>
          <td>第{idx}组</td>
          <td>{g['impact_scope']}条</td>
          <td>{g['key'][2]}</td>
          <td>n={n_str}, k={k_str}</td>
          <td>{g['key'][3] if g['key'][3] is not None else '-'}</td>
          <td>{records_html}</td>
        </tr>
'''

    lat_html = ''
    for att in data['late_attachments']:
        issue_type_class = ''
        if att['问题类型'] == '公式不明确':
            issue_type_class = 'issue-formula'
        elif att['问题类型'] == '单位不统一':
            issue_type_class = 'issue-unit'
        elif att['问题类型'] == '阈值超界':
            issue_type_class = 'issue-threshold'
        lat_html += f'''        <tr>
          <td>{att['附件编号']}</td>
          <td>{att['提交时间']}</td>
          <td><span class="issue-tag {issue_type_class}">{att['问题类型']}</span></td>
          <td>{att['具体说明']}</td>
          <td>{att['当前状态']}</td>
          <td>{att['提交人']}</td>
          <td>{att['影响记录']}</td>
        </tr>
'''

    hist_html = ''
    for h in data['historical_samples'][:5]:
        hist_html += f'''        <tr>
          <td>{h['记录ID']}</td>
          <td>{h['场景名称']}</td>
          <td>{h['n值']}</td>
          <td>{h['k值']}</td>
          <td>{h['组合类型']}</td>
          <td>{h['计算结果']}</td>
          <td>{h['边界状态']}</td>
          <td>{h['校验结论']}</td>
          <td>{h['校验人']}</td>
        </tr>
'''

    bdy_html = ''
    for b in data['boundary_samples']:
        bdy_html += f'''        <tr>
          <td>{b['样本ID']}</td>
          <td>{b['描述']}</td>
          <td>{b['n']}</td>
          <td>{b['k']}</td>
          <td>{b['类型']}</td>
          <td>{b['预期结果']}</td>
          <td>{b['边界类型']}</td>
          <td>{b['数据来源']}</td>
          <td>{b['备注'] or '-'}</td>
        </tr>
'''

    abn_html = ''
    for r in data['abnormal_points']:
        issues_str = '；'.join(r['issues'])
        n_str = str(r['n']) if r['n'] is not None else 'N/A'
        k_str = str(r['k']) if r['k'] is not None else 'N/A'
        abn_html += f'''        <tr>
          <td>{r['id']}</td>
          <td>{r['desc']}</td>
          <td>{n_str}</td>
          <td>{k_str}</td>
          <td>{r['calc_type']}</td>
          <td>{issues_str}</td>
          <td>{r['source_row']}</td>
        </tr>
'''

    done_count = data['status_counts'].get('已处理', 0) + data['status_counts'].get('已处理-异常', 0)
    pending_count = data['status_counts'].get('待补材料', 0)
    manual_count = data['status_counts'].get('人工改判', 0)

    html = template
    html = html.replace('{{CSS_STYLE}}', css)
    html = html.replace('{{PARAM_VERSION}}', data['param_version'])
    html = html.replace('{{GENERATED_AT}}', data['generated_at'])
    html = html.replace('{{TOTAL_COUNT}}', str(data['total_count']))
    html = html.replace('{{DONE_COUNT}}', str(done_count))
    html = html.replace('{{PENDING_COUNT}}', str(pending_count))
    html = html.replace('{{MANUAL_COUNT}}', str(manual_count))
    html = html.replace('{{BOUNDARY_COUNT}}', str(data['boundary_count']))
    html = html.replace('{{DUP_GROUPS}}', str(data['duplicate_groups']))
    html = html.replace('{{LATE_ATT_COUNT}}', str(data['late_attachments_count']))
    html = html.replace('{{HIST_COUNT}}', str(data['historical_count']))
    html = html.replace('{{BDY_SAMPLE_COUNT}}', str(data['boundary_samples_count']))
    html = html.replace('{{ROWS_HTML}}', rows_html)
    html = html.replace('{{DUP_HTML}}', dup_html)
    html = html.replace('{{LATE_HTML}}', lat_html)
    html = html.replace('{{HIST_HTML}}', hist_html)
    html = html.replace('{{BDY_HTML}}', bdy_html)
    html = html.replace('{{ABN_HTML}}', abn_html)

    return html


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print('=== 组合计数边界校验 ===')
    print(f'参数版本: {PARAM_VERSION}')
    print(f'阈值: {THRESHOLD_LARGE}')
    print()

    print('读取数据文件...')
    current = read_csv('current_batch.csv')
    historical = read_csv('historical_answers.csv')
    boundary_samples = read_csv('boundary_samples.csv')
    late_atts = read_csv('late_attachments.csv')
    print(f'  当前批次: {len(current)} 条')
    print(f'  历史答案: {len(historical)} 条')
    print(f'  边界样本: {len(boundary_samples)} 条')
    print(f'  晚到附件: {len(late_atts)} 条')
    print()

    print('执行校验...')
    verified = [verify_record(r) for r in current]
    print(f'  已校验 {len(verified)} 条记录')
    print()

    print('检测重复样本...')
    duplicates = find_duplicates(verified)
    print(f'  发现 {len(duplicates)} 组重复样本')
    for g in duplicates:
        print(f'    - n={g["key"][0]}, k={g["key"][1]}, {g["key"][2]}: {g["impact_scope"]}条')
        print(f'      来源行: {", ".join(g["source_rows"])}')
    print()

    print('匹配晚到附件...')
    batch_late = match_late_attachments(verified, late_atts)
    print(f'  本批次相关晚到附件: {len(batch_late)} 条')
    for att in batch_late:
        print(f'    - [{att["问题类型"]}] {att["附件编号"]}: {att["具体说明"][:30]}...')
    print()

    print('生成摘要数据...')
    summary = generate_summary_data(verified, duplicates, batch_late, historical, boundary_samples)
    print(f'  状态统计: {summary["status_counts"]}')
    print()

    print('渲染复核页面...')
    html = render_html(summary)
    output_path = os.path.join(OUTPUT_DIR, 'review_summary.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'  页面已生成: {output_path}')
    print()

    json_path = os.path.join(OUTPUT_DIR, 'summary_data.json')
    summary_json = {
        'param_version': summary['param_version'],
        'generated_at': summary['generated_at'],
        'total_count': summary['total_count'],
        'status_counts': summary['status_counts'],
        'boundary_count': summary['boundary_count'],
        'duplicate_groups': summary['duplicate_groups'],
        'late_attachments_count': summary['late_attachments_count'],
        'abnormal_count': len(summary['abnormal_points']),
    }
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(summary_json, f, ensure_ascii=False, indent=2)
    print(f'  摘要数据已生成: {json_path}')
    print()

    print('=== 校验完成 ===')
    print()
    print('复核人请查看: output/review_summary.html')
    print('  - 已处理（含异常）: 在顶部汇总 + 详细表格')
    print('  - 待补材料: 晚到附件区域')
    print('  - 人工改判: 标记为"人工改判"的记录')


if __name__ == '__main__':
    main()
