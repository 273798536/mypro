#!/usr/bin/env python3
"""生成样例数据"""
import pandas as pd
import os
from datetime import datetime, timedelta
import random

os.makedirs("samples", exist_ok=True)


def generate_recharge_data():
    """生成充值流水数据（包含脏记录）"""
    normal_data = [
        {
            "member_id": f"M{i:03d}",
            "member_name": f"会员{i}号",
            "store_id": f"S{(i % 3) + 1:02d}",
            "store_name": f"门店{(i % 3) + 1}",
            "recharge_amount": random.randint(100, 1000),
            "bonus_amount": random.randint(10, 100),
            "payment_method": random.choice(["微信", "支付宝", "现金", "银行卡"]),
            "transaction_time": (datetime(2024, 1, 1) + timedelta(days=random.randint(0, 30), hours=random.randint(9, 21))).strftime("%Y-%m-%d %H:%M:%S"),
            "operator": f"营业员{random.choice(['A', 'B', 'C'])}",
        }
        for i in range(1, 11)
    ]

    dirty_data = [
        {
            "member_id": "",
            "member_name": "缺字段会员",
            "store_id": "S01",
            "store_name": "门店1",
            "recharge_amount": 500,
            "bonus_amount": 50,
            "payment_method": "微信",
            "transaction_time": "2024-01-15 10:30:00",
            "operator": "营业员A",
        },
        {
            "member_id": "M005",
            "member_name": "改名会员",
            "store_id": "S01",
            "store_name": "门店1",
            "recharge_amount": 300,
            "bonus_amount": 30,
            "payment_method": "支付宝",
            "transaction_time": "2024-01-16 14:20:00",
            "operator": "营业员B",
        },
        {
            "member_id": "M011",
            "member_name": "无效金额",
            "store_id": "S02",
            "store_name": "门店2",
            "recharge_amount": -100,
            "bonus_amount": 0,
            "payment_method": "现金",
            "transaction_time": "2024-01-17 09:15:00",
            "operator": "营业员C",
        },
        {
            "member_id": "M012",
            "member_name": "无效时间",
            "store_id": "S03",
            "store_name": "门店3",
            "recharge_amount": 200,
            "bonus_amount": 20,
            "payment_method": "微信",
            "transaction_time": "invalid_date",
            "operator": "营业员A",
        },
    ]

    all_data = normal_data + dirty_data
    df = pd.DataFrame(all_data)
    df.to_excel("samples/recharge_records.xlsx", index=False)
    df.to_csv("samples/recharge_records.csv", index=False, encoding="utf-8-sig")
    print(f"生成充值流水: {len(all_data)} 条记录 (正常{len(normal_data)}, 脏{len(dirty_data)})")


def generate_refund_data():
    """生成退款申请数据"""
    normal_data = [
        {
            "member_id": f"M{i:03d}",
            "member_name": f"会员{i}号",
            "store_id": f"S{(i % 3) + 1:02d}",
            "store_name": f"门店{(i % 3) + 1}",
            "refund_amount": random.randint(50, 200),
            "refund_reason": random.choice(["储值退款", "活动取消", "会员退卡"]),
            "transaction_time": (datetime(2024, 1, 1) + timedelta(days=random.randint(0, 30), hours=random.randint(9, 21))).strftime("%Y-%m-%d %H:%M:%S"),
            "operator": f"营业员{random.choice(['A', 'B', 'C'])}",
            "reviewer": f"主管{random.choice(['X', 'Y'])}",
        }
        for i in range(1, 6)
    ]

    dirty_data = [
        {
            "member_id": "M999",
            "member_name": "超额退款",
            "store_id": "S01",
            "store_name": "门店1",
            "refund_amount": 99999,
            "refund_reason": "异常退款",
            "transaction_time": "2024-01-20 16:00:00",
            "operator": "营业员A",
            "reviewer": "主管X",
        },
        {
            "member_id": "",
            "member_name": "",
            "store_id": "S02",
            "store_name": "门店2",
            "refund_amount": 100,
            "refund_reason": "缺字段退款",
            "transaction_time": "2024-01-21 11:30:00",
            "operator": "营业员B",
            "reviewer": "",
        },
    ]

    all_data = normal_data + dirty_data
    df = pd.DataFrame(all_data)
    df.to_excel("samples/refund_records.xlsx", index=False)
    df.to_csv("samples/refund_records.csv", index=False, encoding="utf-8-sig")
    print(f"生成退款申请: {len(all_data)} 条记录 (正常{len(normal_data)}, 脏{len(dirty_data)})")


def generate_shift_data():
    """生成班次记录数据"""
    normal_data = []
    for i in range(5):
        store_id = f"S{(i % 3) + 1:02d}"
        start_balance = random.randint(1000, 5000)
        cash_sales = random.randint(500, 2000)
        member_recharge = random.randint(1000, 3000)
        member_refund = random.randint(100, 500)
        end_balance = start_balance + cash_sales + member_recharge - member_refund

        normal_data.append({
            "store_id": store_id,
            "shift_date": (datetime(2024, 1, 1) + timedelta(days=i)).strftime("%Y-%m-%d"),
            "shift_no": f"SHIFT{i + 1:03d}",
            "cashier": f"收银员{random.choice(['甲', '乙', '丙'])}",
            "start_balance": start_balance,
            "end_balance": end_balance,
            "cash_sales": cash_sales,
            "card_sales": random.randint(500, 2000),
            "member_recharge": member_recharge,
            "member_refund": member_refund,
        })

    dirty_data = [
        {
            "store_id": "S01",
            "shift_date": "2024-01-06",
            "shift_no": "SHIFT006",
            "cashier": "收银员甲",
            "start_balance": 1000,
            "end_balance": 2500,
            "cash_sales": 500,
            "card_sales": 500,
            "member_recharge": 500,
            "member_refund": 0,
        },
    ]

    all_data = normal_data + dirty_data
    df = pd.DataFrame(all_data)
    df.to_excel("samples/shift_records.xlsx", index=False)
    df.to_csv("samples/shift_records.csv", index=False, encoding="utf-8-sig")
    print(f"生成班次记录: {len(all_data)} 条记录 (正常{len(normal_data)}, 脏{len(dirty_data)})")


def generate_handover_data():
    """生成门店交接表数据"""
    normal_data = [
        {
            "store_id": f"S{(i % 3) + 1:02d}",
            "store_name": f"门店{(i % 3) + 1}",
            "handover_date": (datetime(2024, 1, 1) + timedelta(days=i * 10)).strftime("%Y-%m-%d"),
            "outgoing_manager": f"经理{random.choice(['张', '李', '王'])}",
            "incoming_manager": f"经理{random.choice(['赵', '钱', '孙'])}",
            "member_count": random.randint(100, 500),
            "total_balance": random.randint(50000, 200000),
            "cash_on_hand": random.randint(5000, 20000),
        }
        for i in range(3)
    ]

    dirty_data = [
        {
            "store_id": "",
            "store_name": "缺字段门店",
            "handover_date": "2024-02-10",
            "outgoing_manager": "",
            "incoming_manager": "经理周",
            "member_count": 200,
            "total_balance": 100000,
            "cash_on_hand": 10000,
        },
    ]

    all_data = normal_data + dirty_data
    df = pd.DataFrame(all_data)
    df.to_excel("samples/handover_records.xlsx", index=False)
    df.to_csv("samples/handover_records.csv", index=False, encoding="utf-8-sig")
    print(f"生成门店交接: {len(all_data)} 条记录 (正常{len(normal_data)}, 脏{len(dirty_data)})")


if __name__ == "__main__":
    print("正在生成样例数据...")
    generate_recharge_data()
    generate_refund_data()
    generate_shift_data()
    generate_handover_data()
    print("\n样例数据已生成到 samples/ 目录")
