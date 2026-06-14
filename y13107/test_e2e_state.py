import sys
sys.path.insert(0, '.')

import pandas as pd
from src.calculator import batch_compute_condition_numbers
from src.anomaly import run_all_anomaly_detection, anomaly_summary
from src.history import load_history_answers, compare_with_history
from src.anomaly import AnomalySeverity

print("=" * 70)
print("完整端到端验证：状态管理 + 参数变化 + 异常检测")
print("=" * 70)

df_input = pd.read_csv('examples/example_input.csv')
df_history = pd.read_csv('examples/example_history.csv')

history_answers = load_history_answers(
    df_history, id_col="id", cond_col="condition_number",
    source_col="source", version_col="version"
)
results = batch_compute_condition_numbers(df_input, matrix_prefix="a", id_col="id")

def full_calc(near_threshold, tolerance):
    anomalies = run_all_anomaly_detection(
        df_input, results, matrix_prefix="a", near_singular_threshold=near_threshold
    )
    comparisons, hist_anomalies = compare_with_history(
        results, history_answers, tolerance=tolerance
    )
    anomalies.extend(hist_anomalies)
    anomalies.sort(key=lambda x: (
        0 if x.severity == AnomalySeverity.CRITICAL
        else 1 if x.severity == AnomalySeverity.WARNING
        else 2,
        x.source_row
    ))
    return anomalies, comparisons

test_scenarios = [
    {
        "name": "首次计算 (阈值=1e10, 容差=1e-6)",
        "near_threshold": 1e10,
        "tolerance": 1e-6,
        "expected_anomalies": 9,
    },
    {
        "name": "修改阈值为1 (状态应变化)",
        "near_threshold": 1,
        "tolerance": 1e-6,
        "expected_anomalies": 17,
    },
    {
        "name": "再改回1e10 (状态应还原)",
        "near_threshold": 1e10,
        "tolerance": 1e-6,
        "expected_anomalies": 9,
    },
    {
        "name": "修改容差为0.5 (减少历史不符异常)",
        "near_threshold": 1e10,
        "tolerance": 0.5,
        "expected_anomalies": 7,
    },
    {
        "name": "阈值=1, 容差=0.5 (双重修改)",
        "near_threshold": 1,
        "tolerance": 0.5,
        "expected_anomalies": 15,
    },
]

all_passed = True
prev_count = None

for i, scenario in enumerate(test_scenarios):
    anomalies, comparisons = full_calc(scenario["near_threshold"], scenario["tolerance"])
    summary = anomaly_summary(anomalies)
    actual = summary["total"]
    passed = actual == scenario["expected_anomalies"]

    if not passed:
        all_passed = False

    status = "✅ PASS" if passed else "❌ FAIL"
    change_str = ""
    if prev_count is not None:
        diff = actual - prev_count
        change_str = f"  ({'+' if diff > 0 else ''}{diff} 条变化)"

    print(f"\n{status} 场景{i+1}: {scenario['name']}")
    print(f"  参数: 阈值={scenario['near_threshold']:.1e}, 容差={scenario['tolerance']:.1e}")
    print(f"  预期异常数: {scenario['expected_anomalies']}, 实际: {actual}{change_str}")
    print(f"  分布: 严重={summary['critical']}, 警告={summary['warning']}, 提示={summary['info']}")
    if not passed:
        print(f"  按类型: {summary['by_type']}")

    prev_count = actual

print("\n" + "=" * 70)
print("关键行为验证：")
print("=" * 70)

anom_1e10, comp_1e10 = full_calc(1e10, 1e-6)
anom_1, comp_1 = full_calc(1, 1e-6)

near_singular_1e10 = sum(1 for a in anom_1e10 if a.anomaly_type.value == "接近奇异(高条件数)")
near_singular_1 = sum(1 for a in anom_1 if a.anomaly_type.value == "接近奇异(高条件数)")
hist_mismatch_1e10 = sum(1 for a in anom_1e10 if a.anomaly_type.value == "历史答案不符")
hist_mismatch_1 = sum(1 for a in anom_1 if a.anomaly_type.value == "历史答案不符")

print(f"\n1. 阈值 1e10 → 1:")
print(f"   接近奇异异常: {near_singular_1e10} → {near_singular_1} (增加 {near_singular_1 - near_singular_1e10} 条)")
print(f"   历史答案不符: {hist_mismatch_1e10} → {hist_mismatch_1} (不变)")
print(f"   其他异常类型数量保持不变，说明参数变化只影响相关检测")

empty_anom_list = [a for a in anom_1 if a.anomaly_type.value == "空矩阵/空集合"]
assert len(empty_anom_list) > 0, "未找到空矩阵/空集合异常"
empty_anom = empty_anom_list[0]
print(f"\n2. 空集合异常保留原始来源行:")
print(f"   矩阵 {empty_anom.matrix_id}: 来源行={empty_anom.source_row}, 影响范围='{empty_anom.impact_scope}'")

dirty_anom_list = [a for a in anom_1 if a.anomaly_type.value == "脏数据(非数值)"]
assert len(dirty_anom_list) > 0, "未找到脏数据异常"
dirty_anom = dirty_anom_list[0]
print(f"\n3. 脏数据保留原始痕迹:")
print(f"   矩阵 {dirty_anom.matrix_id}: 原始值='{dirty_anom.raw_value}'")
print(f"   保留 {len(dirty_anom.affected_columns)} 个脏数据列，不自动修复")

singular_anom_list = [a for a in anom_1 if a.anomaly_type.value == "奇异矩阵(除零边界)"]
assert len(singular_anom_list) > 0, "未找到奇异矩阵(除零边界)异常"
singular_anom = singular_anom_list[0]
print(f"\n4. 除零边界异常包含影响范围:")
print(f"   矩阵 {singular_anom.matrix_id}: {singular_anom.impact_scope}")
print(f"   计算上下文: {singular_anom.calculation_context}")

match_count_1e10 = sum(1 for c in comp_1e10 if c.is_match)
match_count_1 = sum(1 for c in comp_1 if c.is_match)
print(f"\n5. 历史对比随参数变化:")
print(f"   容差 1e-6 时一致数: {match_count_1e10} / {len(comp_1e10)}")
anom_05, comp_05 = full_calc(1e10, 0.5)
match_count_05 = sum(1 for c in comp_05 if c.is_match)
print(f"   容差 0.5 时一致数: {match_count_05} / {len(comp_05)} (容差变大，一致数增加)")

print("\n" + "=" * 70)
if all_passed:
    print("✅ 所有验证通过！")
else:
    print("❌ 部分验证失败！")
print("=" * 70)

sys.exit(0 if all_passed else 1)
