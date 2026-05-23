#!/usr/bin/env python3
import os
import sys
import csv
import random
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

DATA_DIR = os.path.join(BASE_DIR, "data", "imports")
os.makedirs(DATA_DIR, exist_ok=True)


def generate_warehouse_orders(count=5, output_file=None):
    if output_file is None:
        output_file = os.path.join(DATA_DIR, "test_warehouse_orders.csv")
    
    customers = [
        ("C001", "北京建工集团"),
        ("C002", "上海建设有限公司"),
        ("C003", "广州建筑工程"),
        ("C004", "深圳基建集团"),
    ]
    
    equipments = [
        ("升降机", "SHENG-001", 5000, 200),
        ("塔吊", "DIAO-002", 10000, 500),
        ("挖掘机", "WAJ-003", 8000, 400),
        ("压路机", "YALU-004", 6000, 300),
    ]
    
    rows = []
    for i in range(1, count + 1):
        customer_id, customer_name = random.choice(customers)
        equipment_type, equipment_code, deposit, daily = random.choice(equipments)
        quantity = random.randint(1, 5)
        
        rows.append({
            "order_no": f"WH{datetime.now().strftime('%Y%m%d')}{i:03d}",
            "customer_id": customer_id,
            "customer_name": customer_name,
            "equipment_type": equipment_type,
            "equipment_code": f"{equipment_code}-{i:03d}",
            "quantity": quantity,
            "deposit_amount": deposit * quantity,
            "daily_rental": daily,
            "rental_days": random.randint(7, 30),
            "outbound_date": (datetime.now() - timedelta(days=random.randint(10, 30))).strftime("%Y-%m-%d"),
            "operator": f"操作员{random.randint(1, 10)}",
            "remark": f"测试出库单{i}"
        })
    
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Generated {len(rows)} warehouse orders to {output_file}")
    return output_file


def generate_return_records(count=8, output_file=None):
    if output_file is None:
        output_file = os.path.join(DATA_DIR, "test_return_records.csv")
    
    conditions = ["good", "minor_damage", "major_damage"]
    
    rows = []
    for i in range(1, count + 1):
        rows.append({
            "return_no": f"RT{datetime.now().strftime('%Y%m%d')}{i:03d}",
            "customer_id": f"C00{random.randint(1, 4)}",
            "return_quantity": random.randint(1, 3),
            "returned_equipment_codes": f"EQ-{random.randint(100, 999)}",
            "condition_status": random.choice(conditions),
            "damage_description": "轻微划痕" if random.random() > 0.5 else "",
            "is_partial": random.random() > 0.6,
            "batch_number": random.randint(1, 3),
            "operator": f"仓管员{random.randint(1, 5)}",
            "remark": f"测试归还记录{i}"
        })
    
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Generated {len(rows)} return records to {output_file}")
    return output_file


def generate_repair_estimates(count=3, output_file=None):
    if output_file is None:
        output_file = os.path.join(DATA_DIR, "test_repair_estimates.csv")
    
    damage_types = ["外观损坏", "电路故障", "液压系统故障", "机械磨损"]
    
    rows = []
    for i in range(1, count + 1):
        parts_cost = random.randint(500, 3000)
        labor_cost = random.randint(200, 1000)
        
        rows.append({
            "estimate_no": f"RE{datetime.now().strftime('%Y%m%d')}{i:03d}",
            "equipment_code": f"EQ-{random.randint(100, 999)}",
            "damage_type": random.choice(damage_types),
            "damage_description": f"{random.choice(['轻微', '中度', '重度'])}损坏需要维修",
            "estimate_amount": parts_cost + labor_cost,
            "parts_cost": parts_cost,
            "labor_cost": labor_cost,
            "is_customer_liable": random.random() > 0.2,
            "reviewer": f"技术员{random.randint(1, 8)}",
            "status": "approved",
            "remark": f"测试估价单{i}"
        })
    
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Generated {len(rows)} repair estimates to {output_file}")
    return output_file


if __name__ == "__main__":
    generate_warehouse_orders(5)
    generate_return_records(8)
    generate_repair_estimates(3)
    print("\nTest data generation complete!")
