"""快速演示脚本 - 完整走通异常复核链路"""
import sys
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))
os.chdir(str(PROJECT_ROOT))

print("=" * 70)
print("整数规划批量验算系统 - 完整异常复核链路演示")
print("=" * 70)
print()

print("[Step 1/5] 运行完整验算流水线 (pipeline.run_full_demo)")
print("-" * 70)
from src.ip_checker.pipeline import VerificationPipeline

examples_dir = PROJECT_ROOT / 'examples'
examples_dir.mkdir(exist_ok=True)

pipeline = VerificationPipeline(output_dir=str(examples_dir))
result_df, report_files = pipeline.run_full_demo()

print()
print("[Step 2/5] 查看生成的文件清单")
print("-" * 70)
for key, value in report_files.items():
    if isinstance(value, list):
        for v in value:
            p = Path(v)
            size = p.stat().st_size if p.exists() else 0
            print(f"  {key}: {p.name} ({size} bytes)")
    else:
        p = Path(value)
        size = p.stat().st_size if p.exists() else 0
        print(f"  {key}: {p.name} ({size} bytes)")

details_dir = examples_dir / 'details'
trace_files = sorted(details_dir.glob('*_trace.txt')) if details_dir.exists() else []
print(f"  details/_trace.txt: 共 {len(trace_files)} 条追溯文件")
print()

print("[Step 3/5] 列出所有异常记录（模拟用户点到异常的入口）")
print("-" * 70)
import json
results_json = examples_dir / 'verification_results.json'
anomalies_list = []
if results_json.exists():
    with open(results_json, 'r', encoding='utf-8') as f:
        saved = json.load(f)
    for r_data in saved.get('results', []):
        if r_data.get('anomaly_type') or r_data.get('result_status') in ('异常', '失败'):
            anomalies_list.append(r_data)

print(f"共发现 {len(anomalies_list)} 条异常/失败记录:")
print()
selected_anomalies = []
for i, a in enumerate(anomalies_list[:8], 1):
    rid = a.get('record_id')
    status = a.get('result_status')
    atype = a.get('anomaly_type') or status
    err = a.get('error_message', '')
    marker = "🔴" if status == '异常' else "⚠️"
    raw = a.get('raw_inputs', {})
    brief = []
    for k, v in raw.items():
        if not str(k).endswith('_converted') and v is not None and str(v).strip():
            brief.append(f"{k}={v}")
    brief_str = ' | '.join(brief[:4])

    print(f"{marker}  [{i}] 记录ID: {rid}")
    print(f"    状态: 【{status}】  异常类型: {atype}")
    if err:
        print(f"    错误: {err}")
    if brief_str:
        print(f"    原始输入: {brief_str}")
    print(f"    👉 追溯命令: python cli.py trace {rid}")
    print()
    selected_anomalies.append(rid)

print()
print("[Step 4/5] 选择 3 条代表性异常，展示计算草稿追溯内容")
print("-" * 70)

sample_ids = selected_anomalies[:3] if selected_anomalies else []

for idx, rid in enumerate(sample_ids, 1):
    trace_file = details_dir / f"{rid}_trace.txt"
    print(f"\n【异常追溯样本 {idx}】 {rid}")
    print("=" * 70)
    if trace_file.exists():
        with open(trace_file, 'r', encoding='utf-8') as f:
            content = f.read()
        lines = content.split('\n')
        for line in lines[:55]:
            print(line)
        if len(lines) > 55:
            print(f"... (共 {len(lines)} 行，已截断显示前55行)")
    else:
        print(f"⚠️ 追溯文件不存在: {trace_file}")
    print()

print("[Step 5/5] 查看小岑的操作历史（审计日志）")
print("-" * 70)
audit_report = None
for k, v in report_files.items():
    if k == 'audit_report':
        audit_report = Path(v)
        break

if audit_report and audit_report.exists():
    with open(audit_report, 'r', encoding='utf-8') as f:
        audit_lines = f.read().split('\n')
    for line in audit_lines[:60]:
        print(line)
    if len(audit_lines) > 60:
        print(f"... (共 {len(audit_lines)} 行，已截断显示前60行)")

print()
print("=" * 70)
print("✅ 完整异常复核链路演示完成！")
print("=" * 70)
print()
print("你可以继续手动执行以下命令进行体验:")
print()
print("  # 1. 查看所有异常记录列表")
print("  python cli.py anomalies")
print()
print("  # 2. 查看任意异常记录的完整计算草稿（选择上面的 record_id）")
if sample_ids:
    for rid in sample_ids:
        print(f"  python cli.py trace {rid}")
print()
print("  # 3. 查看完整审计历史（小岑改过的所有判断）")
print("  python cli.py audit")
print()
print("  # 4. 重新运行完整演示")
print("  python cli.py demo")
print()
print("关键链路：异常列表(cli anomalies) → 选record_id → 计算草稿追溯(cli trace)")
print("         同时可查看审计历史(cli audit)了解小岑临时修改的判断")
