import sys, warnings, io
warnings.filterwarnings("ignore")
stderr_capture = io.StringIO()
old_stderr = sys.stderr
sys.stderr = stderr_capture

from app import app, db, ChartGenerator, QueueProcessor, ProcessingState
import os

PASS = 0
FAIL = 0
LOG = []

def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1; LOG.append(("  ✅ " + name, detail))
    else:
        FAIL += 1; LOG.append(("  ❌ " + name, detail))

with app.app_context():
    db.create_all()
    processor = QueueProcessor('test_session')
    test_data = [
        {'window_id': 'A-01', 'total_wait_time': 1250.5, 'queue_length': 25, 'service_count': 23, 'unit': 'seconds'},
        {'window_id': 'A-02', 'total_wait_time': 960.0,  'queue_length': 18, 'service_count': 18, 'unit': 'seconds'},
        {'window_id': 'A-03', 'total_wait_time': 2040.8, 'queue_length': 38, 'service_count': 35, 'unit': 'seconds'},
        {'window_id': 'B-01', 'total_wait_time': 744.0,  'queue_length': 12, 'service_count': 12, 'unit': 'seconds'},
        {'window_id': 'B-02', 'total_wait_time': 1520.3, 'queue_length': 31, 'service_count': 29, 'unit': 'seconds'},
        {'window_id': 'B-03', 'total_wait_time': 890.0,  'queue_length': 0,  'service_count': 0,  'unit': 'seconds'},
        {'window_id': 'C-02', 'total_wait_time': 450.0,  'queue_length': 0,  'service_count': 0,  'unit': 'seconds'},
    ]
    LOG.append(("【1/5】处理链：7条记录检测", ""))
    all_results = []
    for d in test_data:
        r = processor.process_record(d)
        all_results.append({
            'id': len(all_results)+1,
            'window_id': d['window_id'],
            'total_wait_time': d['total_wait_time'],
            'queue_length': d['queue_length'],
            'service_count': d['service_count'],
            'avg_wait_time': r['avg_wait_time'],
            'is_boundary': r['is_boundary'],
            'unit': d['unit']
        })
        check(f"{d['window_id']}: 排队{d['queue_length']}→边界{r['is_boundary']}",
              (r['is_boundary'] == (d['queue_length'] == 0)))

    LOG.append(("【2/5】数据筛选：正常图不能含边界，边界图不能含正常", ""))
    normal_records   = [r for r in all_results if not r['is_boundary']]
    boundary_records = [r for r in all_results if r['is_boundary']]
    check("正常图只传正常", len(normal_records) == 5 and not any(r['is_boundary'] for r in normal_records),
          f"窗口: {[r['window_id'] for r in normal_records]}")
    check("边界图只传边界", len(boundary_records) == 2 and all(r['is_boundary'] for r in boundary_records),
          f"窗口: {[r['window_id'] for r in boundary_records]}")
    check("正常图中无B-03", all(r['window_id'] != 'B-03' for r in normal_records))
    check("正常图中无C-02", all(r['window_id'] != 'C-02' for r in normal_records))
    check("边界图中无A/B系列正常窗", all(r['window_id'] in ('B-03','C-02') for r in boundary_records))

    LOG.append(("【3/5】图表生成：3张图全部正常输出", ""))
    chart_gen = ChartGenerator('test_session')
    try:
        img_n, fp_n = chart_gen.generate_comparison_chart(normal_records, title="正常")
        check("正常记录图生成成功", len(img_n) > 1000 and os.path.exists(fp_n) and os.path.getsize(fp_n) > 10000,
              f"{os.path.basename(fp_n)} = {os.path.getsize(fp_n)//1024}KB")
    except Exception as e:
        check("正常记录图生成", False, str(e))
    try:
        img_a, fp_a = chart_gen.generate_comparison_chart(all_results, title="全部")
        check("全部记录对照图生成成功", len(img_a) > 1000 and os.path.exists(fp_a) and os.path.getsize(fp_a) > 10000,
              f"{os.path.basename(fp_a)} = {os.path.getsize(fp_a)//1024}KB")
    except Exception as e:
        check("全部记录对照图生成", False, str(e))
    try:
        img_b, fp_b = chart_gen.generate_boundary_detail_chart(boundary_records)
        check("边界详情图生成成功", len(img_b) > 1000 and os.path.exists(fp_b) and os.path.getsize(fp_b) > 5000,
              f"{os.path.basename(fp_b)} = {os.path.getsize(fp_b)//1024}KB")
    except Exception as e:
        check("边界详情图生成", False, str(e))

    LOG.append(("【4/5】数据库record_ids严格对应，不能交叉", ""))
    ids_n = ','.join(str(r['id']) for r in normal_records)
    ids_a = ','.join(str(r['id']) for r in all_results)
    ids_b = ','.join(str(r['id']) for r in boundary_records)
    s_n = set(int(x) for x in ids_n.split(','))
    s_b = set(int(x) for x in ids_b.split(','))
    s_a = set(int(x) for x in ids_a.split(','))
    check("正常record_ids与边界无交集", s_n & s_b == set(), f"正常ID:{s_n} 边界ID:{s_b}")
    check("边界record_ids与正常无交集", s_b & s_n == set())
    check("全部record_ids = 正常∪边界", s_a == (s_n | s_b), f"全部:{s_a}")
    check("正常图描述数字对应", len(normal_records) == 5,
          f"描述里写5条正常，实际传入{len(normal_records)}条")
    check("边界图描述数字对应", len(boundary_records) == 2,
          f"描述里写2条边界，实际传入{len(boundary_records)}条")

    LOG.append(("【5/5】单位换算：秒→分钟 计算正确", ""))
    t = processor.process_record({'window_id': 'TEST', 'total_wait_time': 600, 'queue_length': 10, 'service_count': 10, 'unit': 'seconds'})
    check("600秒/10人 = 60秒 = 1.0分钟", abs(t['avg_wait_time'] - 1.0) < 0.0001,
          f"实际={t['avg_wait_time']:.6f} 期望=1.0")
    t2 = processor.process_record({'window_id': 'T2', 'total_wait_time': 3600, 'queue_length': 10, 'service_count': 10, 'unit': 'seconds'})
    check("3600秒/10人 = 360秒 = 6.0分钟", abs(t2['avg_wait_time'] - 6.0) < 0.0001,
          f"实际={t2['avg_wait_time']:.6f} 期望=6.0")

out = io.StringIO()
out.write("="*70 + "\n")
out.write("  修复验证：正常记录对比图严格排除除零边界\n")
out.write("="*70 + "\n")
for line, detail in LOG:
    if line.startswith("【"):
        out.write("\n" + line + "\n" + "-"*70 + "\n")
    else:
        out.write(line)
        if detail:
            out.write("  「" + detail + "」")
        out.write("\n")
out.write("\n" + "="*70 + "\n")
out.write(f"  总计：{PASS} 项通过 / {FAIL} 项失败\n")
if FAIL == 0:
    out.write("  🎉 修复验证全部通过！Bug已修复确认。\n")
else:
    out.write("  ⚠️  仍有失败项，请检查。\n")
out.write("="*70 + "\n")

sys.stderr = old_stderr
result = out.getvalue()
with open('/tmp/verify_result.txt', 'w', encoding='utf-8') as f:
    f.write(result)
print(result)
sys.exit(0 if FAIL == 0 else 1)
