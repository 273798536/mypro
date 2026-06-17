"""验证缺口检测准确性。"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from deflection_attribution.data_io import load_records_from_csv
from deflection_attribution.gap_detector import detect_sampling_gap

csv_path = os.path.join(os.path.dirname(__file__), "demo_data", "demo_experiment_records.csv")
records = load_records_from_csv(csv_path)

print("=== 所有采样缺口记录 ===")
gap_count = 0
for i, r in enumerate(records):
    is_gap, reason = detect_sampling_gap(r)
    if is_gap:
        gap_count += 1
        print(f"  [{i}] {r.beam_id} ({r.measure_point})")
        print(f"       实测值: {r.measured_value}, 挠度比: {r.deflection_ratio}")
        print(f"       原因: {reason}")
        print(f"       原始行数据: {r.raw_data.get('original_row', {})}")

print()
print(f"总计: {gap_count} / {len(records)} 条被标记为缺口")
print(f"预期: 2条（G001, G002）")
print()

print("=== 极端值记录（E开头） ===")
for i, r in enumerate(records):
    if r.beam_id.startswith("E"):
        is_gap, reason = detect_sampling_gap(r)
        print(f"  [{i}] {r.beam_id} ({r.measure_point})")
        print(f"       挠度比: {r.deflection_ratio}")
        print(f"       是否缺口: {is_gap}")
        print(f"       备注: {r.raw_data.get('original_row', {}).get('备注', '')}")

print()
print("=== 材料名称不一致的记录（INC001） ===")
for i, r in enumerate(records):
    if "50号" in r.material_name:
        is_gap, reason = detect_sampling_gap(r)
        print(f"  [{i}] {r.beam_id} ({r.measure_point})")
        print(f"       材料: {r.material_name}")
        print(f"       挠度比: {r.deflection_ratio}")
        print(f"       是否缺口: {is_gap}")
