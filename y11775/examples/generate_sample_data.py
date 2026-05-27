"""Generate sample return data for testing."""

import os
import numpy as np
import pandas as pd

np.random.seed(42)

INPUT_DIR = "input"
OUTPUT_DIR = "output"

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

dates = pd.date_range("2023-01-01", periods=252, freq="B")

n_assets = 6
asset_names = ["STOCK_A", "STOCK_B", "STOCK_C", "STOCK_D", "STOCK_E", "STOCK_F"]

mean_returns = np.array([0.0005, 0.0008, 0.0003, 0.001, 0.0006, 0.0004])
volatilities = np.array([0.02, 0.015, 0.025, 0.018, 0.022, 0.017])

corr_matrix = np.array([
    [1.0, 0.7, 0.5, 0.3, 0.2, 0.4],
    [0.7, 1.0, 0.6, 0.4, 0.3, 0.5],
    [0.5, 0.6, 1.0, 0.7, 0.5, 0.6],
    [0.3, 0.4, 0.7, 1.0, 0.8, 0.7],
    [0.2, 0.3, 0.5, 0.8, 1.0, 0.6],
    [0.4, 0.5, 0.6, 0.7, 0.6, 1.0],
])

cov_matrix = np.diag(volatilities) @ corr_matrix @ np.diag(volatilities)
returns = np.random.multivariate_normal(mean_returns, cov_matrix, size=len(dates))

df = pd.DataFrame(returns, index=dates, columns=asset_names)

mask = np.random.choice([True, False], size=df.shape, p=[0.05, 0.95])
df = df.mask(mask)

df.iloc[10:20, 2] = np.nan
df.iloc[100:110, 4] = np.nan

df.to_csv(os.path.join(INPUT_DIR, "returns_source1.csv"))

print(f"Created returns_source1.csv with shape {df.shape}")
print(f"Missing values: {df.isnull().sum().sum()}")
print(f"Missing per asset:\n{df.isnull().sum()}")

shuffled_cols = ["STOCK_F", "STOCK_A", "STOCK_C", "STOCK_B", "STOCK_D", "STOCK_E", "STOCK_G"]
df2 = df.copy()
df2["STOCK_G"] = np.random.normal(0.0005, 0.02, size=len(df2))
df2 = df2[shuffled_cols]

df2.to_csv(os.path.join(INPUT_DIR, "returns_source2.csv"))
print(f"\nCreated returns_source2.csv with shape {df2.shape}")
print(f"Columns: {list(df2.columns)}")

order_file = os.path.join(INPUT_DIR, "asset_order.txt")
with open(order_file, "w") as f:
    for asset in asset_names:
        f.write(f"{asset}\n")
print(f"\nCreated asset_order.txt with {len(asset_names)} assets")
print(f"Order: {asset_names}")
