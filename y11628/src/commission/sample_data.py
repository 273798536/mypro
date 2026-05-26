import csv
import yaml
from pathlib import Path
from datetime import datetime, timedelta
import random


def create_sample_data(data_dir: str = "./data"):
    path = Path(data_dir)
    path.mkdir(parents=True, exist_ok=True)

    regions = ["华东区", "华南区", "华北区", "西南区", "西北区"]
    product_lines = ["企业软件", "云服务", "硬件设备", "解决方案", "咨询服务"]
    salespeople = ["张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十"]
    payment_statuses = ["已回款", "已回款", "已回款", "已回款", "部分回款", "未回款"]

    orders = []
    for i in range(1, 31):
        order_date = (datetime.now() - timedelta(days=random.randint(10, 120))).strftime("%Y-%m-%d")
        payment_date = (
            (datetime.now() - timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d")
            if random.random() > 0.3
            else ""
        )
        payment_status = random.choice(payment_statuses)
        amount = round(random.uniform(5000, 500000), 2)
        payment_amount = amount if payment_status == "已回款" else round(amount * random.uniform(0, 0.7), 2)

        if i == 5:
            region = "华东"
        elif i == 15:
            region = "华南北区"
        elif i == 25:
            region = "华东区"
            product_line = "硬件"
        else:
            region = random.choice(regions)
            product_line = random.choice(product_lines)

        rate_version = random.choice(["2024Q1", "2024Q2", "2023Q4", ""])

        orders.append({
            "order_id": f"ORD{i:04d}",
            "salesperson": random.choice(salespeople),
            "region": region,
            "product_line": product_line,
            "amount": amount,
            "order_date": order_date,
            "payment_status": payment_status,
            "payment_amount": payment_amount,
            "payment_date": payment_date,
            "rate_version": rate_version,
        })

    with open(path / "orders.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=orders[0].keys())
        writer.writeheader()
        writer.writerows(orders)

    region_rules_data = {
        "regions": [
            {
                "region": "华东区",
                "allowed_product_lines": ["企业软件", "云服务", "硬件设备"],
                "payment_requirement_days": 60,
                "rate_table": "standard",
                "cross_region_allowed": True,
                "cross_region_penalty": 0.1,
            },
            {
                "region": "华南区",
                "allowed_product_lines": ["企业软件", "解决方案", "咨询服务"],
                "payment_requirement_days": 45,
                "rate_table": "standard",
                "cross_region_allowed": False,
                "cross_region_penalty": 0.0,
            },
            {
                "region": "华北区",
                "allowed_product_lines": ["硬件设备", "解决方案", "咨询服务"],
                "payment_requirement_days": 30,
                "rate_table": "premium",
                "cross_region_allowed": True,
                "cross_region_penalty": 0.05,
            },
            {
                "region": "西南区",
                "allowed_product_lines": ["云服务", "咨询服务"],
                "payment_requirement_days": 90,
                "rate_table": "standard",
                "cross_region_allowed": True,
                "cross_region_penalty": 0.15,
            },
            {
                "region": "西北区",
                "allowed_product_lines": ["硬件设备", "企业软件"],
                "payment_requirement_days": 60,
                "rate_table": "standard",
                "cross_region_allowed": False,
                "cross_region_penalty": 0.0,
            },
        ]
    }

    with open(path / "region_rules.yaml", "w", encoding="utf-8") as f:
        yaml.dump(region_rules_data, f, allow_unicode=True, sort_keys=False)

    tier_rates = []
    versions = ["2023Q4", "2024Q1", "2024Q2"]
    for version in versions:
        effective_date = {
            "2023Q4": "2023-10-01",
            "2024Q1": "2024-01-01",
            "2024Q2": "2024-04-01",
        }[version]
        expiry_date = {
            "2023Q4": "2023-12-31",
            "2024Q1": "2024-03-31",
            "2024Q2": "2024-06-30",
        }[version]

        base_rates = {
            "企业软件": [0.03, 0.05, 0.07, 0.10],
            "云服务": [0.02, 0.04, 0.06, 0.08],
            "硬件设备": [0.015, 0.03, 0.045, 0.06],
            "解决方案": [0.04, 0.06, 0.08, 0.12],
            "咨询服务": [0.05, 0.07, 0.09, 0.15],
        }

        for product, rates in base_rates.items():
            tier_rates.append({
                "rate_version": version,
                "product_line": product,
                "min_amount": 0,
                "max_amount": 50000,
                "rate": rates[0],
                "effective_date": effective_date,
                "expiry_date": expiry_date,
            })
            tier_rates.append({
                "rate_version": version,
                "product_line": product,
                "min_amount": 50000,
                "max_amount": 200000,
                "rate": rates[1],
                "effective_date": effective_date,
                "expiry_date": expiry_date,
            })
            tier_rates.append({
                "rate_version": version,
                "product_line": product,
                "min_amount": 200000,
                "max_amount": 500000,
                "rate": rates[2],
                "effective_date": effective_date,
                "expiry_date": expiry_date,
            })
            tier_rates.append({
                "rate_version": version,
                "product_line": product,
                "min_amount": 500000,
                "max_amount": "",
                "rate": rates[3],
                "effective_date": effective_date,
                "expiry_date": expiry_date,
            })

    with open(path / "tier_rates.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=tier_rates[0].keys())
        writer.writeheader()
        writer.writerows(tier_rates)

    with open(path / "product_lines.txt", "w", encoding="utf-8") as f:
        for p in product_lines:
            f.write(p + "\n")

    return str(path)
