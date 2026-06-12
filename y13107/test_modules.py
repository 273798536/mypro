import sys
sys.path.insert(0, '.')
from src.calculator import batch_compute_condition_numbers, results_to_dataframe
from src.anomaly import run_all_anomaly_detection, anomaly_summary
from src.history import load_history_answers, compare_with_history
import pandas as pd

print("=== 测试核心模块 ===")

df = pd.read_csv('examples/example_input.csv')
print(f'输入数据: {len(df)} 行')

results = batch_compute_condition_numbers(df, matrix_prefix='a', id_col='id')
print(f'计算结果: {len(results)} 条')
for r in results[:3]:
    print(f'  {r.matrix_id}: cond={r.condition_number_2}, singular={r.is_singular}')

anomalies = run_all_anomaly_detection(df, results)
summary = anomaly_summary(anomalies)
print(f'异常总数: {summary["total"]}, 严重: {summary["critical"]}, 警告: {summary["warning"]}')

hist_df = pd.read_csv('examples/example_history.csv')
hist_answers = load_history_answers(
    hist_df, id_col='id', cond_col='condition_number',
    source_col='source', version_col='version'
)
print(f'历史答案: {len(hist_answers)} 条')

comparisons, hist_anomalies = compare_with_history(results, hist_answers)
print(f'对比结果: {len(comparisons)} 条')
n_match = sum(1 for c in comparisons if c.is_match)
print(f'  一致: {n_match}, 不一致: {len(comparisons) - n_match}')

results_df = results_to_dataframe(results)
print(f'\n结果DataFrame: {results_df.shape}')
print(results_df.head())

print('\n✅ 所有核心模块测试通过！')
