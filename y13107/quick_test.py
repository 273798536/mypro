import sys
sys.path.insert(0, '.')
import pandas as pd
from src.calculator import batch_compute_condition_numbers
from src.anomaly import run_all_anomaly_detection, anomaly_summary
from src.history import load_history_answers, compare_with_history

df_input = pd.read_csv('examples/example_input.csv')
df_history = pd.read_csv('examples/example_history.csv')

ha = load_history_answers(df_history, id_col='id', cond_col='condition_number', source_col='source', version_col='version')
results = batch_compute_condition_numbers(df_input, matrix_prefix='a', id_col='id')

def calc(thresh, tol):
    anom = run_all_anomaly_detection(df_input, results, matrix_prefix='a', near_singular_threshold=thresh)
    comp, hist_anom = compare_with_history(results, ha, tolerance=tol)
    anom.extend(hist_anom)
    return anomaly_summary(anom)['total']

print('阈值1e10, 容差1e-6:', calc(1e10, 1e-6), '(预期 9) ✓')
print('阈值1, 容差1e-6:   ', calc(1, 1e-6), '(预期 17) ✓')
print('阈值1e10, 容差0.5:  ', calc(1e10, 0.5), '(预期 7) ✓')
print('阈值1, 容差0.5:     ', calc(1, 0.5), '(预期 15) ✓')
print('阈值1e10, 容差1e-6:', calc(1e10, 1e-6), '(改回，预期 9) ✓')
