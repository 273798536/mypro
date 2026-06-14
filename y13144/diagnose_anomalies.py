"""诊断异常分类问题"""
import sys
from pathlib import Path
import json
import pandas as pd

workspace = Path("/Users/mac/pro/solo/workspaces/y13144")
sys.path.insert(0, str(workspace))
import os
os.chdir(str(workspace))

# 1. 读取 boundary_cases.csv 检查原始数据
print("=" * 60)
print("1. 检查 boundary_cases.csv 原始数据")
print("=" * 60)
df = pd.read_csv("data/boundary_cases.csv")
print(df[["项目编码", "项目名称", "工程量", "单价", "合价", "备注"]].to_string())
print()
print("数据类型:")
print(df[["工程量", "单价", "合价"]].dtypes)
print()
print("空值检查:")
for col in ["工程量", "单价", "合价"]:
    print(f"  {col}: isna={df[col].isna().sum()}, empty_str={(df[col].astype(str).str.strip()=='').sum()}")
print()
print("BN005(工程量空值)和BN006(单价空值)专项检查:")
for idx, row in df.iterrows():
    code = row.get("项目编码", "")
    if code in ["BN005", "BN006"]:
        qty = row["工程量"]
        price = row["单价"]
        total = row["合价"]
        qty_null = pd.isna(qty) or (isinstance(qty, str) and qty.strip() == "")
        price_null = pd.isna(price) or (isinstance(price, str) and price.strip() == "")
        print(f"  {code}: 项目名称={row['项目名称']}")
        print(f"    工程量={qty} (空值={qty_null}), 单价={price} (空值={price_null}), 合价={total}")
        if code == "BN005" and qty_null:
            print(f"    ✅ BN005工程量空值识别正确")
        if code == "BN006" and price_null:
            print(f"    ✅ BN006单价空值识别正确")
print()

# 2. 单条测试除零和空值
print("=" * 60)
print("2. 单条测试边界处理器")
print("=" * 60)
from src.ip_checker.verification_engine import BoundaryCaseHandler

handler = BoundaryCaseHandler()
tests = [
    ("除零检测-分母为0", handler.check_division_by_zero(0, 0)),
    ("除零检测-分母为0.0", handler.check_division_by_zero(100, 0.0)),
    ("除零检测-正常", handler.check_division_by_zero(100, 10)),
    ("空值检测-NaN", handler.check_null_value(pd.NA, "qty")),
    ("空值检测-None", handler.check_null_value(None, "qty")),
    ("空值检测-空字符串", handler.check_null_value("", "qty")),
    ("空值检测-空格", handler.check_null_value("  ", "qty")),
    ("空值检测-数字0", handler.check_null_value(0, "qty")),
    ("空值检测-数字", handler.check_null_value(100, "qty")),
    ("负值检测-负数", handler.check_negative_value(-10, "quantity")),
    ("负值检测-0", handler.check_negative_value(0, "quantity")),
    ("负值检测-正数", handler.check_negative_value(100, "quantity")),
    ("格式检测-非数字INVALID", handler.check_numeric_format("INVALID", "quantity")),
    ("格式检测-非数字N/A", handler.check_numeric_format("N/A", "quantity")),
    ("格式检测-数字字符串", handler.check_numeric_format("123.45", "quantity")),
    ("格式检测-正常数字", handler.check_numeric_format(123.45, "quantity")),
]
for name, (is_issue, msg) in tests:
    status = "✅触发" if is_issue else "   通过"
    print(f"  {status} - {name}: {msg}")
print()

# 3. 运行完整流水线并打印异常详情
print("=" * 60)
print("3. 运行完整流水线并收集异常记录")
print("=" * 60)
from src.ip_checker.pipeline import VerificationPipeline

examples_dir = workspace / 'examples'
if examples_dir.exists():
    import shutil
    shutil.rmtree(examples_dir)
examples_dir.mkdir()

audit_log = workspace / 'data' / 'audit_log.json'
if audit_log.exists():
    audit_log.unlink()

pipeline = VerificationPipeline(output_dir=str(examples_dir))
result_df, report_files = pipeline.run_full_demo()

print()
print("=" * 60)
print("4. anomaly_type 分布统计（来自 JSON）")
print("=" * 60)
json_path = examples_dir / 'verification_results.json'
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

anomaly_types = {}
result_statuses = {}
for r in data['results']:
    atype = r.get('anomaly_type') or '(无)'
    status = r.get('result_status')
    anomaly_types[atype] = anomaly_types.get(atype, 0) + 1
    result_statuses[status] = result_statuses.get(status, 0) + 1

print("状态分布:")
for s, c in sorted(result_statuses.items()):
    print(f"  {s}: {c}")
print()
print("异常类型分布:")
target_types = ["除零异常", "空值异常", "负值异常", "数值偏差", "公式计算异常"]
for t, c in sorted(anomaly_types.items()):
    marker = ""
    if t in target_types:
        marker = " ✅目标类型"
    print(f"  {t}: {c}{marker}")
missing = [tt for tt in target_types if tt not in anomaly_types]
if missing:
    print(f"  ⚠️  缺失的目标异常类型: {missing}")
else:
    print(f"  ✅ 所有5种目标异常类型均已覆盖！")
print()

print("=" * 60)
print("5. 检查 boundary_cases 对应的记录")
print("=" * 60)
bn_records = []
for r in data['results']:
    raw = r.get('raw_inputs', {})
    # 边界案例来自手动录入，BN开头的项目编码在 raw_inputs 中没有直接存
    # 但我们可以通过 raw_inputs 的值来判断
    if raw.get('quantity') == 0 and '除零' in str(raw):
        bn_records.append(r)
    if raw.get('quantity') in ['', None, None] and pd.isna(raw.get('quantity')):
        bn_records.append(r)

# 直接找异常类型包含目标的记录
target_anomalies = []
target_check_types = ["除零异常", "空值异常", "负值异常", "数值偏差", "公式计算异常"]
for r in data['results']:
    at = r.get('anomaly_type') or ''
    if at in target_check_types:
        target_anomalies.append(r)

target_type_counts = {}
for atype in target_check_types:
    target_type_counts[atype] = 0
for r in target_anomalies:
    at = r.get('anomaly_type') or ''
    if at in target_type_counts:
        target_type_counts[at] += 1

print(f"找到目标异常记录: {len(target_anomalies)} 条")
print("各目标异常类型统计:")
for at, cnt in target_type_counts.items():
    status = "✅出现" if cnt > 0 else "⚠️ 未出现"
    print(f"  {at}: {cnt} 条 {status}")
print()
print("目标异常记录样例 (前10条):")
for r in target_anomalies[:10]:
    print(f"  {r['record_id']}: {r['result_status']} | {r.get('anomaly_type')} | raw={r.get('raw_inputs')}")
print()

# 找出 F004 记录（含qty=0的除零异常情况）
print("=" * 60)
print("6. 特殊查找：F004(单位成本)记录及除零异常情况")
print("=" * 60)
found = 0
found_zero_qty = 0
for r in data['results']:
    raw = r.get('raw_inputs', {})
    has_qty = 'quantity' in raw
    qty_val = raw.get('quantity') if has_qty else None
    has_total = 'total_price' in raw
    total_val = raw.get('total_price') if has_total else None
    # 修正：F004公式的步骤中action包含"执行公式 F004"，公式表达式含"/"
    steps = r.get('processing_steps', [])
    is_f004 = (has_qty and has_total and (
        any('执行公式 F004' in s.get('action', '') for s in steps) or
        any('unit_cost = total_price / quantity' in s.get('detail', '') for s in steps) or
        any('除零边界检查' in s.get('action', '') for s in steps)
    ))
    if is_f004:
        found += 1
        is_zero_qty = False
        try:
            if qty_val is not None and float(qty_val) == 0:
                is_zero_qty = True
                found_zero_qty += 1
        except (ValueError, TypeError):
            pass
        should_print = found <= 5 or is_zero_qty
        if should_print:
            status = r.get('result_status')
            atype = r.get('anomaly_type') or '(无)'
            err = r.get('error_message') or '(无)'
            qty_mark = " ⚠️ qty=0" if is_zero_qty else ""
            print(f"  [{found}] {r['record_id']}{qty_mark}")
            print(f"       qty={qty_val}, total={total_val}")
            print(f"       status={status}, anomaly={atype}")
            print(f"       err={err}")
            for step in steps:
                action = step.get('action', '')
                detail = step.get('detail', '')
                if ('除零' in detail or '除零' in action or 
                    '执行公式 F004' in action or '公式计算' in action):
                    print(f"       step: {step}")
            print()
print(f"共找到 {found} 条 F004 记录，其中 qty=0 的除零异常记录: {found_zero_qty} 条")
print()

# 额外检查：BN005和BN006空值识别
print("=" * 60)
print("7. 额外验证：BN005(工程量空值)和BN006(单价空值)识别")
print("=" * 60)
bn005_like = []
bn006_like = []
for r in data['results']:
    raw = r.get('raw_inputs', {})
    if r.get('anomaly_type') == '空值异常':
        qty_is_null = False
        price_is_null = False
        if 'quantity' in raw:
            qv = raw['quantity']
            qty_is_null = (qv is None or (isinstance(qv, float) and pd.isna(qv)) or 
                          (isinstance(qv, str) and qv.strip() == ''))
        if 'unit_price' in raw:
            pv = raw['unit_price']
            price_is_null = (pv is None or (isinstance(pv, float) and pd.isna(pv)) or
                            (isinstance(pv, str) and pv.strip() == ''))
        if qty_is_null:
            bn005_like.append(r)
        if price_is_null:
            bn006_like.append(r)
print(f"类似BN005(工程量空值)的记录: {len(bn005_like)} 条")
for r in bn005_like[:3]:
    print(f"  {r['record_id']}: {r.get('raw_inputs')}")
print(f"类似BN006(单价空值)的记录: {len(bn006_like)} 条")
for r in bn006_like[:3]:
    print(f"  {r['record_id']}: {r.get('raw_inputs')}")
print()

print("完成诊断！")
