import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)

start_time = datetime(2026, 6, 1, 0, 0, 0)
n_points = 100
interval = timedelta(minutes=15)

times = [start_time + i * interval for i in range(n_points)]

power_1 = 80 + 30 * np.sin(np.linspace(0, 4 * np.pi, n_points)) + np.random.normal(0, 5, n_points)
power_2 = 120 + 40 * np.cos(np.linspace(0, 3 * np.pi, n_points)) + np.random.normal(0, 8, n_points)
power_3 = 60 + 20 * np.sin(np.linspace(0, 5 * np.pi, n_points)) + np.random.normal(0, 3, n_points)

power_1[23] = -5.2
power_1[67] = -2.8
power_2[45] = None
power_2[46] = None

times_with_issue = times.copy()
temp = times_with_issue[55]
times_with_issue[55] = times_with_issue[56]
times_with_issue[56] = temp

times_with_gap = times_with_issue.copy()
for i in range(75, 80):
    times_with_gap[i] = times_with_gap[i] + timedelta(minutes=60)

df = pd.DataFrame({
    '时间': times_with_gap,
    '主回路': power_1,
    '照明回路': power_2,
    '空调回路': power_3,
})

df.loc[30:32, '主回路'] = df.loc[30:32, '主回路'] * 1000

output_path = 'data/raw/sample_load_data.csv'
df.to_csv(output_path, index=False, encoding='utf-8-sig')

print(f"示例数据已生成: {output_path}")
print(f"数据点数: {len(df)}")
print(f"时间范围: {df['时间'].min()} 至 {df['时间'].max()}")
print(f"包含的数据质量问题:")
print(f"  - 负值读数: 主回路 2处")
print(f"  - 空值读数: 照明回路 2处")
print(f"  - 时间乱序: 第55-56行")
print(f"  - 采样中断: 第75-80行附近有1小时间隔")
print(f"  - 单位异常: 第30-32行主回路数值偏大1000倍(模拟单位配置错误)")
