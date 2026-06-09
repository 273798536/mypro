import pandas as pd
import numpy as np
from pathlib import Path

np.random.seed(42)
dates = pd.date_range("2024-01-01", periods=56, freq="D")
base_trend = np.linspace(100, 130, 56)
seasonal = 15 * np.sin(2 * np.pi * np.arange(56) / 7)
noise = np.random.normal(0, 3, 56)
values = base_trend + seasonal + noise

data = []
for i, (d, v) in enumerate(zip(dates, values)):
    val_str = f"{v:.2f}"
    if i == 5:
        val_str = f"{v:.2f}备注:春节调休"
    elif i == 12:
        val_str = ""
    elif i == 18:
        val_str = "缺数据(待补)"
    elif i == 25:
        val_str = f"{v:.2f}(系统异常，待核)"
    elif i == 33:
        val_str = "未报"
    elif i == 40:
        val_str = "abc123"
    data.append({"date": d.strftime("%Y-%m-%d"), "value": val_str})

data.append({"date": "2024-01-20", "value": f"{values[19]:.2f}"})
data.append({"date": "2024-01-20", "value": f"{values[19]*1.1:.2f}"})

df = pd.DataFrame(data)
out = Path(__file__).parent / "sample_data.csv"
df.to_csv(out, index=False, encoding="utf-8-sig")
print(f"Sample data created at {out} with {len(df)} rows")
