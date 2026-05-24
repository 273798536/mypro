#!/usr/bin/env python3
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json


def generate_checkin_data(count: int = 10, batch_no: str = None) -> List[Dict[str, Any]]:
    guests = ["张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十"]
    room_types = ["标准间", "大床房", "豪华间", "套房"]
    room_nos = ["101", "102", "103", "201", "202", "203", "301", "302", "303"]
    sources = ["线上", "线下", "会员", "协议"]

    if not batch_no:
        batch_no = f"BATCH-{uuid.uuid4().hex[:8].upper()}"

    records = []
    base_date = datetime.now().replace(hour=14, minute=0, second=0, microsecond=0)

    for i in range(count):
        checkin_date = base_date - timedelta(days=random.randint(0, 7))
        days = random.randint(1, 5)
        checkout_date = checkin_date + timedelta(days=days)
        room_rate = random.choice([299, 399, 499, 599, 699, 899])
        total_amount = days * room_rate
        is_extended = random.random() < 0.2
        extended_days = random.randint(1, 2) if is_extended else 0

        records.append({
            "checkin_no": f"CI{datetime.now().strftime('%Y%m%d')}{i+1:04d}",
            "order_no": f"ORD{uuid.uuid4().hex[:12].upper()}",
            "guest_name": random.choice(guests),
            "guest_phone": f"138{random.randint(10000000, 99999999)}",
            "id_card": f"110101{random.randint(1980, 2000)}{random.randint(101, 1231):04d}{random.randint(1000, 9999)}",
            "room_no": random.choice(room_nos),
            "room_type": random.choice(room_types),
            "checkin_date": checkin_date.isoformat(),
            "checkout_date": checkout_date.isoformat(),
            "actual_checkout": (checkout_date + timedelta(hours=random.randint(10, 14))).isoformat() if random.random() < 0.6 else None,
            "room_rate": room_rate,
            "total_amount": total_amount + (extended_days * room_rate if is_extended else 0),
            "paid_amount": random.randint(int(total_amount * 0.5), total_amount),
            "status": random.choice(["checked_in", "checked_out", "checked_in"]),
            "source": random.choice(sources),
            "is_extended": is_extended,
            "extended_days": extended_days,
            "remarks": "半夜延住" if is_extended and random.random() < 0.5 else None,
            "batch_no": batch_no,
            "operator": "前台小李",
            "duplicate_strategy": "update",
        })

    return records


def generate_deposit_data(checkin_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    payment_methods = ["现金", "微信", "支付宝", "银行卡", "预授权"]
    transaction_types = ["charge", "refund"]

    records = []
    for idx, checkin in enumerate(checkin_records):
        records.append({
            "deposit_no": f"DEP{datetime.now().strftime('%Y%m%d')}{idx+1:04d}",
            "checkin_no": checkin["checkin_no"],
            "order_no": checkin["order_no"],
            "guest_name": checkin["guest_name"],
            "amount": checkin["room_rate"] * 2,
            "payment_method": random.choice(payment_methods),
            "transaction_type": "charge",
            "transaction_time": checkin["checkin_date"],
            "operator": "前台小王",
            "status": "success",
            "remarks": None,
            "batch_no": checkin["batch_no"],
            "duplicate_strategy": "update",
        })

        if random.random() < 0.3:
            records.append({
                "deposit_no": f"DEP{datetime.now().strftime('%Y%m%d')}{idx+1001:04d}",
                "checkin_no": checkin["checkin_no"],
                "order_no": checkin["order_no"],
                "guest_name": checkin["guest_name"],
                "amount": checkin["room_rate"],
                "payment_method": random.choice(payment_methods),
                "transaction_type": "charge",
                "transaction_time": checkin["checkin_date"],
                "operator": "前台小王",
                "status": "success",
                "remarks": "补收押金",
                "batch_no": checkin["batch_no"],
                "duplicate_strategy": "update",
            })

    return records


def generate_room_change_data(checkin_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    room_types = ["标准间", "大床房", "豪华间", "套房"]
    room_nos = ["101", "102", "103", "201", "202", "203", "301", "302", "303"]
    reasons = ["房间升级", "房间设施问题", "噪音问题", "客人要求"]

    records = []
    change_idx = 1
    for checkin in checkin_records:
        if random.random() < 0.3:
            old_rate = checkin["room_rate"]
            new_rate = old_rate + random.choice([-100, 0, 100, 200])
            old_room = checkin["room_no"]
            new_room = random.choice([r for r in room_nos if r != old_room])

            records.append({
                "change_no": f"CHG{datetime.now().strftime('%Y%m%d')}{change_idx:04d}",
                "checkin_no": checkin["checkin_no"],
                "order_no": checkin["order_no"],
                "guest_name": checkin["guest_name"],
                "old_room_no": old_room,
                "new_room_no": new_room,
                "old_room_type": checkin["room_type"],
                "new_room_type": random.choice(room_types),
                "old_rate": old_rate,
                "new_rate": new_rate,
                "rate_diff": new_rate - old_rate,
                "change_time": (datetime.fromisoformat(checkin["checkin_date"]) + timedelta(hours=random.randint(2, 48))).isoformat(),
                "change_reason": random.choice(reasons),
                "operator": "前台小张",
                "status": "completed",
                "remarks": "半夜换房" if random.random() < 0.4 else None,
                "batch_no": checkin["batch_no"],
                "duplicate_strategy": "update",
            })
            change_idx += 1

    return records


def main():
    import argparse
    parser = argparse.ArgumentParser(description="生成酒店夜审测试数据")
    parser.add_argument("-c", "--count", type=int, default=10, help="入住单数量")
    parser.add_argument("-b", "--batch", help="批次号")
    parser.add_argument("-o", "--output", help="输出文件")
    args = parser.parse_args()

    batch_no = args.batch or f"BATCH-{uuid.uuid4().hex[:8].upper()}"

    checkins = generate_checkin_data(args.count, batch_no)
    deposits = generate_deposit_data(checkins)
    room_changes = generate_room_change_data(checkins)

    data = {
        "batch_no": batch_no,
        "generated_at": datetime.now().isoformat(),
        "checkins": checkins,
        "deposits": deposits,
        "room_changes": room_changes,
    }

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"数据已生成: {args.output}")
    else:
        print(json.dumps(data, ensure_ascii=False, indent=2))

    print(f"\n统计:")
    print(f"  批次号: {batch_no}")
    print(f"  入住单: {len(checkins)} 条")
    print(f"  押金流水: {len(deposits)} 条")
    print(f"  换房记录: {len(room_changes)} 条")


if __name__ == "__main__":
    main()
