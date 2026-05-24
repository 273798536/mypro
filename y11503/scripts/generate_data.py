#!/usr/bin/env python3
"""
造数脚本 - 生成测试用的批次数据
"""
import sys
sys.path.insert(0, '.')

import json
import random
from datetime import datetime, timedelta
import uuid
from typing import List, Dict

def generate_repair_orders(count: int = 3, late_submit_ratio: float = 0.2) -> List[Dict]:
    orders = []
    engineers = ["张工", "李工", "王工", "赵工", "刘工"]
    products = ["iPhone 15", "iPhone 14 Pro", "MacBook Pro", "iPad Air", "Apple Watch"]
    faults = ["屏幕碎裂", "电池不充电", "主板故障", "摄像头故障", "进水维修"]

    for i in range(count):
        order_no = f"RO{datetime.now().strftime('%Y%m%d')}{i+1:04d}"
        is_late = random.random() < late_submit_ratio
        orders.append({
            "order_no": order_no,
            "customer_name": f"客户{i+1}",
            "customer_phone": f"138{random.randint(10000000, 99999999)}",
            "product_model": random.choice(products),
            "fault_description": random.choice(faults),
            "engineer": random.choice(engineers),
            "is_late_submit": is_late,
            "remark": "先领后补单" if is_late else ""
        })
    return orders

def generate_spare_parts(count: int = 10, order_nos: List[str] = None) -> List[Dict]:
    parts = []
    part_codes = [
        ("SP001", "屏幕总成", 1),
        ("SP002", "电池", 1),
        ("SP003", "摄像头模组", 1),
        ("SP004", "主板", 1),
        ("SP005", "充电接口", 2),
        ("SP006", "扬声器", 2),
        ("SP007", "振动马达", 3),
        ("SP008", "Home键", 5),
    ]

    for i in range(count):
        code, name, qty = random.choice(part_codes)
        barcode = f"BC{random.randint(100000000000, 999999999999)}"
        is_returned = random.random() < 0.15
        is_scrapped = random.random() < 0.1

        if is_returned and is_scrapped and random.random() < 0.5:
            is_scrapped = False

        repair_order_no = random.choice(order_nos) if order_nos and random.random() > 0.3 else None

        parts.append({
            "part_code": f"{code}_{i+1:03d}",
            "part_name": name,
            "barcode": barcode,
            "quantity": qty,
            "is_returned": is_returned,
            "is_scrapped": is_scrapped,
            "scan_time": (datetime.now() - timedelta(hours=random.randint(1, 72))).isoformat(),
            "scan_operator": random.choice(["仓管A", "仓管B", "仓管C"]),
            "repair_order_no": repair_order_no,
            "remark": ""
        })
    return parts

def generate_batch_data(batch_no: str = None, operator: str = "服务经理") -> Dict:
    if not batch_no:
        batch_no = f"BATCH{datetime.now().strftime('%Y%m%d%H%M%S')}"

    idempotency_key = f"IDEMP_{batch_no}_{uuid.uuid4().hex[:8]}"

    orders = generate_repair_orders(count=random.randint(2, 5))
    order_nos = [o["order_no"] for o in orders]
    parts = generate_spare_parts(count=random.randint(5, 15), order_nos=order_nos)

    return {
        "batch_no": batch_no,
        "operator": operator,
        "description": f"测试批次-{datetime.now().strftime('%Y-%m-%d')}",
        "idempotency_key": idempotency_key,
        "duplicate_strategy": "ignore",
        "repair_orders": orders,
        "parts": parts
    }

def generate_invalid_batch_data() -> Dict:
    """生成包含无效数据的批次（用于测试部分失败）"""
    batch = generate_batch_data()
    batch["parts"].append({
        "part_code": "",
        "part_name": "无效备件",
        "barcode": "INVALID001",
        "quantity": 0,
        "is_returned": True,
        "is_scrapped": True,
        "remark": "这是一个混淆的备件，同时标记退回和报废"
    })
    return batch

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="生成测试数据")
    parser.add_argument("--count", type=int, default=1, help="生成批次数量")
    parser.add_argument("--invalid", action="store_true", help="生成包含无效数据的批次")
    parser.add_argument("--output", type=str, help="输出到文件")
    args = parser.parse_args()

    batches = []
    for i in range(args.count):
        if args.invalid:
            batch = generate_invalid_batch_data()
        else:
            batch = generate_batch_data(batch_no=f"BATCH{datetime.now().strftime('%Y%m%d')}{i+1:03d}")
        batches.append(batch)

    result = batches[0] if args.count == 1 else batches

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"数据已保存到: {args.output}")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))
