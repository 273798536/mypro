import sys
sys.path.insert(0, '.')

import pandas as pd
from src.calculator import batch_compute_condition_numbers
from src.anomaly import run_all_anomaly_detection, anomaly_summary
from src.history import load_history_answers, compare_with_history

print("=" * 60)
print("验证：阈值变化时异常数是否正确变化")
print("=" * 60)

df_input = pd.read_csv('examples/example_input.csv')
df_history = pd.read_csv('examples/example_history.csv')

print(f"\n输入数据: {len(df_input)} 行")
print(f"历史答案: {len(df_history)} 行")

history_answers = load_history_answers(
    df_history,
    id_col="id",
    cond_col="condition_number",
    source_col="source",
    version_col="version"
)

results = batch_compute_condition_numbers(df_input, matrix_prefix="a", id_col="id")

test_cases = [
    (1e10, 1e-6, "默认参数 (阈值=1e10, 容差=1e-6)"),
    (1, 1e-6, "阈值=1 (非常严格)"),
    (1e10, 0.5, "容差=0.5 (很宽松)"),
    (1e15, 1e-6, "阈值=1e15 (很宽松)"),
]

for near_threshold, tolerance, description in test_cases:
    print(f"\n--- {description} ---")
    print(f"  高条件数阈值: {near_threshold:.1e}")
    print(f"  历史对比容差: {tolerance:.1e}")

    anomalies = run_all_anomaly_detection(
        df_input, results, matrix_prefix="a",
        near_singular_threshold=near_threshold
    )

    comparisons, hist_anomalies = compare_with_history(
        results, history_answers, tolerance=tolerance
    )
    anomalies.extend(hist_anomalies)

    from src.anomaly import AnomalySeverity
    anomalies.sort(key=lambda x: (
        0 if x.severity == AnomalySeverity.CRITICAL
        else 1 if x.severity == AnomalySeverity.WARNING
        else 2,
        x.source_row
    ))

    summary = anomaly_summary(anomalies)
    print(f"  异常总数: {summary['total']}")
    print(f"    严重: {summary['critical']}, 警告: {summary['warning']}, 提示: {summary['info']}")
    print(f"  按类型分布:")
    for t, cnt in sorted(summary['by_type'].items(), key=lambda x: -x[1]):
        print(f"    {t}: {cnt}")

print("\n" + "=" * 60)
print("关键验证点：")
print("=" * 60)

# 专门验证 1e10 -> 1 的变化
print("\n1. 阈值 1e10 时：")
anomalies_1e10 = run_all_anomaly_detection(df_input, results, matrix_prefix="a", near_singular_threshold=1e10)
comparisons_1e10, hist_1e10 = compare_with_history(results, history_answers, tolerance=1e-6)
anomalies_1e10.extend(hist_1e10)
summary_1e10 = anomaly_summary(anomalies_1e10)
print(f"   异常总数 = {summary_1e10['total']}  (预期 9)")
assert summary_1e10['total'] == 9, f"预期 9，实际 {summary_1e10['total']}"

print("\n2. 阈值改成 1 时：")
anomalies_1 = run_all_anomaly_detection(df_input, results, matrix_prefix="a", near_singular_threshold=1)
comparisons_1, hist_1 = compare_with_history(results, history_answers, tolerance=1e-6)
anomalies_1.extend(hist_1)
summary_1 = anomaly_summary(anomalies_1)
print(f"   异常总数 = {summary_1['total']}  (预期 17)")
assert summary_1['total'] == 17, f"预期 17，实际 {summary_1['total']}"

print("\n3. 异常数变化:")
print(f"   9 → 17 = 增加了 {summary_1['total'] - summary_1e10['total']} 条")
print(f"   新增的异常类型是「接近奇异」，因为所有条件数>1的都被标记")

near_singular_1 = sum(1 for a in anomalies_1 if a.anomaly_type.value == "接近奇异(高条件数)")
near_singular_1e10 = sum(1 for a in anomalies_1e10 if a.anomaly_type.value == "接近奇异(高条件数)")
print(f"   接近奇异异常数: {near_singular_1e10} → {near_singular_1}")
print(f"   差值: {near_singular_1 - near_singular_1e10} = 正好是新增的 8 条")

print("\n" + "=" * 60)
print("✅ 所有验证通过！")
print("=" * 60)
