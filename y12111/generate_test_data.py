"""Generate test data with edge cases for nonlinear pricing fitting."""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)

INPUT_DIR = Path("/Users/mac/pro/solo/workspaces/y12111/test_data/input")
INPUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------
# 1. Package Prices
# ---------------------
packages = pd.DataFrame([
    {"package_id": "P001", "name": "Starter", "tier": "basic", "price": 99},
    {"package_id": "P002", "name": "Professional", "tier": "mid", "price": 299},
    {"package_id": "P003", "name": "Business", "tier": "mid", "price": 599},
    {"package_id": "P004", "name": "Enterprise", "tier": "enterprise", "price": 1499},
    {"package_id": "P005", "name": "Enterprise Plus", "tier": "enterprise", "price": 2999},
    {"package_id": "P006", "name": "Custom", "tier": "custom", "price": 4999},
])
packages.to_csv(INPUT_DIR / "packages.csv", index=False)
print(f"Generated packages.csv with {len(packages)} packages")

# ---------------------
# 2. Conversion Records
# ---------------------
n_records = 500
n_normal = 420
n_large = 30
n_discount = 35
n_sparse = 15

record_ids = [f"R{i:05d}" for i in range(1, n_records + 1)]
customer_ids = [f"C{i:04d}" for i in range(1, 201)]

# Generate base data following power-law: price = a * quantity^b + c
# with a=200, b=-0.4, c=50
quantities = np.exp(np.random.uniform(0, 5, n_normal))  # 1 to ~148
base_prices = 200 * np.power(quantities, -0.4) + 50
noise = np.random.normal(0, 15, n_normal)
actual_prices = np.clip(base_prices + noise, 50, None)

# Assign packages based on price
def assign_package(price):
    if price < 150:
        return "P001"
    elif price < 400:
        return "P002"
    elif price < 800:
        return "P003"
    elif price < 2000:
        return "P004"
    elif price < 3500:
        return "P005"
    else:
        return "P006"

package_ids = [assign_package(p) for p in actual_prices]
pkg_price_map = dict(zip(packages["package_id"], packages["price"]))

conversions = pd.DataFrame({
    "record_id": record_ids[:n_normal],
    "customer_id": np.random.choice(customer_ids[:150], n_normal),
    "package_id": package_ids,
    "price": actual_prices,
    "quantity": quantities,
    "converted": np.random.choice([True, False], n_normal, p=[0.75, 0.25]),
    "date": pd.date_range("2024-01-01", periods=n_normal, freq="D"),
    "customer_segment": np.random.choice(
        ["SMB", "Mid-Market", "Enterprise", "Startup"],
        n_normal, p=[0.4, 0.35, 0.15, 0.1]
    ),
    "region": np.random.choice(
        ["North", "South", "East", "West", "International"],
        n_normal, p=[0.3, 0.25, 0.2, 0.15, 0.1]
    ),
})

# ---------------------
# Edge Case 1: Abnormally Large Customers
# ---------------------
large_quantities = np.exp(np.random.uniform(6, 9, n_large))  # ~400 to ~8100
large_base_prices = 200 * np.power(large_quantities, -0.4) + 50
large_noise = np.random.normal(0, 50, n_large)
large_prices = np.clip(large_base_prices + large_noise, 50, None)

large_conversions = pd.DataFrame({
    "record_id": record_ids[n_normal:n_normal + n_large],
    "customer_id": np.random.choice(customer_ids[150:170], n_large),
    "package_id": [assign_package(p) for p in large_prices],
    "price": large_prices,
    "quantity": large_quantities,
    "converted": np.random.choice([True, False], n_large, p=[0.9, 0.1]),
    "date": pd.date_range("2024-01-01", periods=n_large, freq="2D"),
    "customer_segment": np.random.choice(
        ["Enterprise", "Mid-Market"], n_large, p=[0.8, 0.2]
    ),
    "region": np.random.choice(["North", "East"], n_large, p=[0.6, 0.4]),
})

# Make a few extremely large
large_conversions.loc[0, "quantity"] = 10000  # Extreme outlier
large_conversions.loc[0, "price"] = 150
large_conversions.loc[1, "quantity"] = 8000
large_conversions.loc[1, "price"] = 180

conversions = pd.concat([conversions, large_conversions], ignore_index=True)

# ---------------------
# Edge Case 2: Discount Records
# ---------------------
current_idx = n_normal + n_large
discount_quantities = np.exp(np.random.uniform(1, 4, n_discount))
discount_base_prices = 200 * np.power(discount_quantities, -0.4) + 50
discount_pcts = np.random.uniform(0.15, 0.5, n_discount)  # 15% to 50% discount
discount_prices = discount_base_prices * (1 - discount_pcts)

discount_conversions = pd.DataFrame({
    "record_id": record_ids[current_idx:current_idx + n_discount],
    "customer_id": np.random.choice(customer_ids[170:190], n_discount),
    "package_id": [assign_package(discount_base_prices[i]) for i in range(n_discount)],
    "price": discount_prices,
    "quantity": discount_quantities,
    "converted": np.random.choice([True, False], n_discount, p=[0.7, 0.3]),
    "date": pd.date_range("2024-02-01", periods=n_discount, freq="3D"),
    "customer_segment": np.random.choice(
        ["SMB", "Startup", "Mid-Market"], n_discount, p=[0.4, 0.35, 0.25]
    ),
    "region": np.random.choice(["South", "West"], n_discount, p=[0.55, 0.45]),
    "discount": discount_pcts,
})

conversions = pd.concat([conversions, discount_conversions], ignore_index=True)

# ---------------------
# Edge Case 3: Sparse Groups (very few samples)
# ---------------------
current_idx = current_idx + n_discount
sparse_quantities = np.exp(np.random.uniform(0.5, 3, n_sparse))
sparse_base_prices = 200 * np.power(sparse_quantities, -0.4) + 50
sparse_noise = np.random.normal(0, 20, n_sparse)
sparse_prices = np.clip(sparse_base_prices + sparse_noise, 50, None)

sparse_conversions = pd.DataFrame({
    "record_id": record_ids[current_idx:current_idx + n_sparse],
    "customer_id": np.random.choice(customer_ids[190:200], n_sparse),
    "package_id": [assign_package(p) for p in sparse_prices],
    "price": sparse_prices,
    "quantity": sparse_quantities,
    "converted": np.random.choice([True, False], n_sparse, p=[0.6, 0.4]),
    "date": pd.date_range("2024-03-01", periods=n_sparse, freq="5D"),
    "customer_segment": "Government",  # Very sparse segment
    "region": "International",  # Sparse region for this segment
})

conversions = pd.concat([conversions, sparse_conversions], ignore_index=True)

# Fill NaN discount values
conversions["discount"] = conversions["discount"].fillna(0.0)

# Shuffle the data
conversions = conversions.sample(frac=1, random_state=42).reset_index(drop=True)
conversions["record_id"] = [f"R{i:05d}" for i in range(1, len(conversions) + 1)]
conversions["date"] = pd.date_range("2024-01-01", periods=len(conversions), freq="D")

conversions.to_csv(INPUT_DIR / "conversions.csv", index=False)
print(f"Generated conversions.csv with {len(conversions)} records")
print(f"  - Normal: {n_normal}")
print(f"  - Large customers: {n_large}")
print(f"  - Discount records: {n_discount}")
print(f"  - Sparse group (Government): {n_sparse}")

# ---------------------
# 3. Trial Durations (for Stage 2)
# ---------------------
trial_customers = np.random.choice(conversions["customer_id"].unique(), 120, replace=False)
trials = pd.DataFrame({
    "customer_id": trial_customers,
    "trial_start_date": pd.date_range("2023-12-01", periods=120, freq="2D"),
    "trial_duration_days": np.random.choice([7, 14, 21, 30, 45, 60], 120, p=[0.1, 0.2, 0.25, 0.25, 0.1, 0.1]),
    "converted_to_paid": np.random.choice([True, False], 120, p=[0.65, 0.35]),
})

trials.to_csv(INPUT_DIR / "trials.csv", index=False)
print(f"Generated trials.csv with {len(trials)} trial records")

print("\nData generation complete!")
print(f"Input directory: {INPUT_DIR}")
print("\nData summary:")
print(f"  Packages: {len(packages)}")
print(f"  Conversions: {len(conversions)}")
print(f"  Trials: {len(trials)}")
print(f"  Unique customers: {conversions['customer_id'].nunique()}")
print(f"  Segments: {conversions['customer_segment'].unique()}")
print(f"  Regions: {conversions['region'].unique()}")
print(f"\nSegment counts:")
print(conversions["customer_segment"].value_counts())
print(f"\nMax quantity: {conversions['quantity'].max():.0f}")
print(f"Max price: {conversions['price'].max():.2f}")
print(f"Discount count: {(conversions['discount'] > 0).sum()}")
