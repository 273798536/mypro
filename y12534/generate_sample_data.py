import numpy as np
import pandas as pd
from pathlib import Path


def generate_sample_data(output_dir="./sample_data"):
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    np.random.seed(42)
    n_samples = 100
    
    sample_ids = [f"S{i:03d}" for i in range(1, n_samples + 1)]
    
    metric_a = np.random.normal(100, 15, n_samples)
    metric_b = metric_a * 0.8 + np.random.normal(0, 10, n_samples)
    metric_c = np.random.normal(50, 8, n_samples)
    metric_d = metric_c * (-0.6) + np.random.normal(0, 5, n_samples)
    metric_e = np.random.normal(200, 30, n_samples)
    metric_f = metric_e * 0.3 + np.random.normal(0, 20, n_samples)
    
    outlier_idx = [5, 12, 45]
    for idx in outlier_idx:
        metric_e[idx] *= 2.5
        metric_f[idx] *= 2.5
    
    metrics_df = pd.DataFrame({
        'sample_id': sample_ids,
        'metric_a': metric_a,
        'metric_b': metric_b,
        'metric_c': metric_c,
        'metric_d': metric_d,
        'metric_e': metric_e,
        'metric_f': metric_f
    })
    
    metrics_df.to_csv(output_dir / "metrics.csv", index=False)
    print(f"生成指标数据: {len(metrics_df)} 条记录")
    
    groups = np.random.choice(['对照组', '实验组A', '实验组B'], n_samples)
    groups_df = pd.DataFrame({
        'sample_id': sample_ids,
        'experiment_group': groups
    })
    groups_df.to_csv(output_dir / "groups.csv", index=False)
    print(f"生成分组数据: {len(groups_df)} 条记录")
    
    time_periods = np.random.choice(['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4'], n_samples)
    windows_df = pd.DataFrame({
        'sample_id': sample_ids,
        'quarter': time_periods
    })
    windows_df.to_csv(output_dir / "time_windows.csv", index=False)
    print(f"生成时间窗口数据: {len(windows_df)} 条记录")
    
    print(f"\n异常样本ID (metric_e 和 metric_f 被拉高):")
    for idx in outlier_idx:
        print(f"  - {sample_ids[idx]}")
    
    print(f"\n文件已保存到: {output_dir.absolute()}")
    return output_dir


if __name__ == "__main__":
    generate_sample_data()
