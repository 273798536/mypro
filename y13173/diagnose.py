"""诊断脚本：检查字段映射和数据加载情况。"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from deflection_attribution.field_mapper import parse_csv_file, build_field_mapping
from deflection_attribution.data_io import load_records_from_csv

csv_path = os.path.join(os.path.dirname(__file__), "demo_data", "demo_experiment_records.csv")

print("=== 字段映射诊断 ===")
raw_records, mapping, header = parse_csv_file(csv_path)
print(f"表头: {header}")
print()
print(f"映射结果:")
for std_field, raw_field in mapping.items():
    print(f"  {std_field} <-- {raw_field}")
print()
unmapped = [h for h in header if h not in mapping.values()]
print(f"未映射字段: {unmapped}")
print()

print("=== 记录加载诊断 ===")
records = load_records_from_csv(csv_path)
print(f"总记录数: {len(records)}")
print()

print("前3条记录关键数据:")
for i, r in enumerate(records[:3]):
    print(f"  [{i}] beam_id={r.beam_id}, measure_point={r.measure_point}, "
          f"deflection_ratio={r.deflection_ratio}, "
          f"design_value={r.design_value}, "
          f"measured_value={r.measured_value}, "
          f"material={r.material_name}")
print()

print("=== 采样缺口检测诊断 ===")
from deflection_attribution.gap_detector import detect_sampling_gap
gap_count = 0
for i, r in enumerate(records[:10]):
    is_gap, reason = detect_sampling_gap(r)
    if is_gap:
        gap_count += 1
        print(f"  [{i}] {r.beam_id}: 是缺口 - {reason}")
    else:
        print(f"  [{i}] {r.beam_id}: 正常")
print(f"前10条中缺口数: {gap_count}")
