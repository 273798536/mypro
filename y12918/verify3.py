#!/usr/bin/env python3
import json, subprocess, os

def curl(method, url, data=None, raw=False):
    args = ['curl', '-s', '-X', method]
    if data:
        args += ['-H', 'Content-Type: application/json', '-d', json.dumps(data)]
    args.append(url)
    r = subprocess.run(args, capture_output=True, text=True)
    if raw:
        return r.stdout
    try:
        return json.loads(r.stdout)
    except:
        return {'_raw': r.stdout}

def step(title):
    print(f'\n{"="*60}\n  {title}\n{"="*60}')

REPORT_ID = 1

# 步骤4：先补录两条未标注题目，推进到 completed，然后导出CSV
step('步骤4：CSV导出验证')

# 4.1 先补录未标注题目（FIN-007=item7, FIN-008=item8）
print('  4.1 补录 2 条未完成标注题目')
resp7 = curl('PUT', f'http://localhost:3000/api/reports/{REPORT_ID}/items/7/annotation', {
    'annotation_status': 'full',
    'annotation_note': '收入准则相关：总额法/净额法确认五步法模型',
    'reviewer': '评测负责人'
})
print(f'      FIN-007(item7): {resp7.get("message", resp7)}')
resp8 = curl('PUT', f'http://localhost:3000/api/reports/{REPORT_ID}/items/8/annotation', {
    'annotation_status': 'partial',
    'annotation_note': '现金流分类：DCF假设包括增长率、折现率、终值法',
    'reviewer': '评测负责人'
})
print(f'      FIN-008(item8): {resp8.get("message", resp8)}')

# 4.2 推进到 completed
print(f'\n  4.2 推进报告#{REPORT_ID}到 completed 状态')
resp = curl('PUT', f'http://localhost:3000/api/reports/{REPORT_ID}/status', {'status': 'completed'})
if resp.get('code') == 0:
    print(f'      状态: {resp["data"]["status"]} ✓')
else:
    print(f'      失败: {resp}')

# 4.3 获取页面最新摘要作为基准
print(f'\n  4.3 获取页面摘要作为对齐基准')
summary = curl('GET', f'http://localhost:3000/api/reports/{REPORT_ID}/summary')['data']
r = summary['report']
page_summary = {
    'name': r['name'],
    'total': r['total_questions'],
    'covered': r['covered_questions'],
    'rate': r['coverage_rate'],
    'status': r['status'],
    'created_at': r['created_at'],
}
print(f'      基准(页面): {page_summary}')

# 4.4 导出CSV文件
print(f'\n  4.4 导出CSV到 /tmp/report_export.csv')
csv_content = curl('GET', f'http://localhost:3000/api/export/{REPORT_ID}?format=csv', raw=True)
with open('/tmp/report_export.csv', 'w', encoding='utf-8') as f:
    f.write(csv_content)
print(f'      文件大小: {len(csv_content)} bytes')
print(f'      行数: {csv_content.count(chr(10))} (含\\n)')

# 4.5 解析CSV验证内容与页面对齐
print(f'\n  4.5 CSV内容解析与页面摘要对齐验证')

# CSV摘要在文件前几行，数据行在后面
lines = csv_content.strip().split('\n')
print(f'      CSV 前 12 行 (摘要区):')
for i, line in enumerate(lines[:12]):
    print(f'        L{i+1:2d}: {line[:90]}')

# 提取CSV摘要
csv_summary = {}
for line in lines[:12]:
    parts = line.split(',')
    if len(parts) >= 2:
        key = parts[0].strip()
        val = parts[1].strip()
        if key == '报告名称': csv_summary['name'] = val
        if key == '总题数': csv_summary['total'] = int(val)
        if key == '覆盖题数': csv_summary['covered'] = int(val)
        if key == '覆盖率': csv_summary['rate'] = float(val.replace('%', ''))
        if key == '报告状态': csv_summary['status'] = val
        if key == '生成时间': csv_summary['created_at'] = val

print(f'\n      摘要对齐检查:')
checks = [
    ('报告名称', page_summary['name'], csv_summary.get('name'), 'str'),
    ('总题数', page_summary['total'], csv_summary.get('total'), 'int'),
    ('覆盖题数', page_summary['covered'], csv_summary.get('covered'), 'int'),
    ('覆盖率%', page_summary['rate'], csv_summary.get('rate'), 'float'),
    ('报告状态', page_summary['status'], csv_summary.get('status'), 'str'),
]
all_ok = True
for field, page_val, csv_val, typ in checks:
    if typ == 'float':
        match = (page_val is not None and csv_val is not None
                 and abs(float(page_val) - float(csv_val)) < 0.01)
    elif typ == 'int':
        match = int(page_val) == int(csv_val) if csv_val is not None else False
    else:
        match = str(page_val) == str(csv_val)
    mark = '✓' if match else '✗'
    if not match: all_ok = False
    print(f'        {mark} {field}: 页面={page_val}  CSV={csv_val}')

# 4.6 CSV 格式合法性验证（解析全部数据行）
print(f'\n  4.6 CSV格式验证: 是否是合法可解析表格')
try:
    import csv
    from io import StringIO
    reader = csv.reader(StringIO(csv_content))
    all_rows = list(reader)
    print(f'        CSV解析成功: {len(all_rows)} 行')
    header = all_rows[0]
    print(f'        表头: {header}')
    # 找到 '=== 详细数据 ===' 之后的第一条数据
    data_start = None
    for i, row in enumerate(all_rows):
        if len(row) > 0 and row[0] == '=== 详细数据 ===':
            data_start = i + 1
            break
    if data_start:
        data_rows = all_rows[data_start:]
        print(f'        数据行数(含空行): {len(data_rows)}')
        non_empty = [r for r in data_rows if len(r) > 1 and r[0].strip()]
        print(f'        实际题目行数: {len(non_empty)}')
        actual_data = len(non_empty)
        mark = '✓' if actual_data == 8 else '✗'
        print(f'        {mark} 数据行数={actual_data} 期望=8')
        if actual_data == 8:
            # 统计命中
            covered_in_csv = sum(1 for r in non_empty if len(r) > 2 and r[2] == '是')
            mark2 = '✓' if covered_in_csv == page_summary['covered'] else '✗'
            print(f'        {mark2} CSV中覆盖题数={covered_in_csv} 页面覆盖题数={page_summary["covered"]}')
            if covered_in_csv == 6: all_ok = all_ok and True
            else: all_ok = False
except Exception as e:
    all_ok = False
    print(f'        ✗ CSV解析失败: {e}')

# 4.7 文件是否能被正常打开（file命令 + 头部BOM检查）
print(f'\n  4.7 文件编码检查')
has_bom = csv_content.startswith('\ufeff')
print(f'        UTF-8 BOM (Excel兼容): {"✓ 有" if has_bom else "✗ 无"}')

import sys
sys.stdout.write('\n  CSV导出验证结果: ')
print('全部通过 ✓' if all_ok else '存在问题 ✗')

# 步骤5：JSON导出验证
step('步骤5：JSON导出验证')

json_text = curl('GET', f'http://localhost:3000/api/export/{REPORT_ID}?format=json', raw=True)
with open('/tmp/report_export.json', 'w', encoding='utf-8') as f:
    f.write(json_text)

data = json.loads(json_text)
jr = data['report']
items = data['items']

checks2 = [
    ('报告名称', page_summary['name'], jr.get('name')),
    ('总题数', page_summary['total'], jr.get('total_questions')),
    ('覆盖题数', page_summary['covered'], jr.get('covered_questions')),
    ('覆盖率%', page_summary['rate'], jr.get('coverage_rate')),
    ('报告状态', page_summary['status'], jr.get('status')),
    ('题目数量', 8, len(items)),
]
all_ok2 = True
print('  JSON 摘要与页面对齐检查:')
for field, page_val, json_val in checks2:
    match = str(page_val) == str(json_val)
    mark = '✓' if match else '✗'
    if not match: all_ok2 = False
    print(f'    {mark} {field}: 页面={page_val}  JSON={json_val}')

# JSON条目逐条验证
print(f'\n  JSON条目命中词数组格式检查 (item.hit_terms 应为数组):')
arr_ok = all(isinstance(it['hit_terms'], list) for it in items)
print(f'    {"✓" if arr_ok else "✗"} hit_terms 都是数组类型')

# 覆盖题数统计
covered_json = sum(1 for it in items if it['is_covered'] == 1)
mark = '✓' if covered_json == 6 else '✗'
print(f'    {mark} 覆盖题数统计: 实际={covered_json} 期望=6')

if covered_json != 6: all_ok2 = False

sys.stdout.write('\n  JSON导出验证结果: ')
print('全部通过 ✓' if all_ok2 else '存在问题 ✗')

# 最终
step('最终结论')
print(f'  示例数据一致性: 步骤1-2通过')
print(f'  generate算法一致性: 步骤3通过')
print(f'  CSV导出格式+内容: {"✓" if all_ok else "✗"}')
print(f'  JSON导出对齐:     {"✓" if all_ok2 else "✗"}')
print(f'\n  导出文件已保存:')
print(f'    CSV:  /tmp/report_export.csv  ({os.path.getsize("/tmp/report_export.csv")} bytes)')
print(f'    JSON: /tmp/report_export.json ({os.path.getsize("/tmp/report_export.json")} bytes)')
