#!/usr/bin/env python3
"""生成样例数据用于测试"""
import os
import pandas as pd
import random
from datetime import datetime, timedelta

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))


def generate_declarations():
    """生成申报表样例数据"""
    data = []
    suppliers = ["供应商A", "供应商B", "供应商C", "供应商D"]
    countries = ["CN", "US", "JP", "DE", "UK"]
    hs_codes = ["85171210", "85258013", "62052000", "84713000"]

    for i in range(1, 21):
        tracking_num = f"TRK{202405000000 + i}"
        data.append({
            "tracking_number": tracking_num,
            "declaration_number": f"DEC{202405000 + i}",
            "supplier": suppliers[i % len(suppliers)],
            "sender": f"发件人{i}",
            "receiver": f"收件人{i}",
            "weight": round(random.uniform(0.5, 5.0), 2),
            "declared_value": round(random.uniform(50, 500), 2),
            "currency": "USD",
            "origin_country": countries[i % len(countries)],
            "destination_country": "CN",
            "item_description": f"商品描述{i}",
            "hs_code": hs_codes[i % len(hs_codes)],
        })

    data.append({
        "tracking_number": "",
        "declaration_number": "DEC202405999",
        "supplier": "坏数据供应商",
        "sender": "坏发件人",
        "receiver": "坏收件人",
        "weight": 1.5,
        "declared_value": 100.0,
        "currency": "USD",
        "origin_country": "US",
        "destination_country": "CN",
        "item_description": "这行会因为缺少运单号导入失败",
        "hs_code": "85171210",
    })

    df = pd.DataFrame(data)
    output_path = os.path.join(OUTPUT_DIR, "declarations.csv")
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"生成: {output_path} ({len(df)} 行)")


def generate_tracking():
    """生成轨迹节点样例数据"""
    data = []

    for i in range(1, 16):
        tracking_num = f"TRK{202405000000 + i}"
        base_time = datetime(2024, 5, 1, 10, 0, 0)

        stages = [
            ("揽收", "上海浦东"),
            ("离开始发地", "上海浦东"),
            ("到达中转站", "广州白云"),
            ("清关中", "深圳海关"),
            ("派送中", "北京朝阳"),
        ]

        for j, (status, location) in enumerate(stages):
            data.append({
                "tracking_number": tracking_num,
                "node_time": (base_time + timedelta(hours=j * 6)).strftime("%Y-%m-%d %H:%M:%S"),
                "node_location": location,
                "node_status": status,
                "node_description": f"{status}扫描",
                "operator": f"操作员{j}",
            })

    df = pd.DataFrame(data)
    output_path = os.path.join(OUTPUT_DIR, "tracking_nodes.csv")
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"生成: {output_path} ({len(df)} 行)")


def generate_tax_notices():
    """生成补税通知样例数据（包含故意制造的异常）"""
    data = []

    for i in range(1, 16):
        tracking_num = f"TRK{202405000000 + i}"
        declared_value = 100 + i * 20
        correct_tax = declared_value * 0.13

        tax_amount = correct_tax if i % 3 != 0 else correct_tax + 50

        data.append({
            "notice_number": f"TAX{202405000 + i}",
            "tracking_number": tracking_num,
            "declaration_number": f"DEC{202405000 + i}",
            "tax_type": "增值税",
            "tax_amount": round(tax_amount, 2),
            "tax_currency": "CNY",
            "issue_date": "2024-05-15",
            "due_date": "2024-05-30",
            "payer": f"收件人{i}",
            "tax_authority": "深圳海关",
            "status": "unpaid",
            "remark": f"补税通知{i}",
        })

    data.append({
        "notice_number": "TAX202405999",
        "tracking_number": "TRK999999999999",
        "declaration_number": "DEC999999",
        "tax_type": "增值税",
        "tax_amount": 150.0,
        "tax_currency": "CNY",
        "issue_date": "2024-05-15",
        "due_date": "2024-05-30",
        "payer": "未知",
        "tax_authority": "深圳海关",
        "status": "unpaid",
        "remark": "这个运单号不存在，会触发'有补税但无申报'异常",
    })

    df = pd.DataFrame(data)
    output_path = os.path.join(OUTPUT_DIR, "tax_notices.csv")
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"生成: {output_path} ({len(df)} 行)")


def generate_supplier_statements():
    """生成供应商对账单样例数据（包含故意制造的供应商不一致）"""
    data = []
    suppliers = ["供应商A", "供应商B", "供应商C", "供应商D"]

    for i in range(1, 16):
        tracking_num = f"TRK{202405000000 + i}"

        actual_supplier = suppliers[i % len(suppliers)]
        if i % 4 == 0:
            actual_supplier = "错误供应商"

        data.append({
            "statement_number": f"STMT{202405000 + i}",
            "supplier": actual_supplier,
            "tracking_number": tracking_num,
            "declaration_number": f"DEC{202405000 + i}",
            "invoice_amount": round(100 + i * 20, 2),
            "currency": "USD",
            "tax_amount": round((100 + i * 20) * 0.13, 2),
            "invoice_date": "2024-05-01",
            "due_date": "2024-06-01",
            "status": "pending",
            "remark": f"对账单{i}",
        })

    df = pd.DataFrame(data)
    output_path = os.path.join(OUTPUT_DIR, "supplier_statements.csv")
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"生成: {output_path} ({len(df)} 行)")


def generate_approval_emails():
    """生成审批邮件样例数据"""
    data = []

    for i in range(1, 6):
        data.append({
            "email_id": f"EMAIL{i:06d}",
            "subject": f"审批：清关批次 {i}",
            "sender": f"经理{i}@company.com",
            "receiver": f"操作员{i}@company.com",
            "sent_at": f"2024-05-{10+i:02d} 10:00:00",
            "approval_type": "清关审批",
            "approval_status": "approved" if i % 2 == 0 else "rejected",
            "related_batch_id": f"BATCH20240500{i:03d}",
            "related_tracking_numbers": f"TRK{202405000000 + i}, TRK{202405000001 + i}",
            "content": f"审批内容{i}：同意清关",
        })

    df = pd.DataFrame(data)
    output_path = os.path.join(OUTPUT_DIR, "approval_emails.csv")
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"生成: {output_path} ({len(df)} 行)")


def generate_split_packages():
    """生成拆分包裹样例数据"""
    data = []
    suppliers = ["供应商A", "供应商B"]

    for i in range(1, 4):
        parent_tracking = f"SPLIT{202405000 + i}"
        data.append({
            "tracking_number": parent_tracking,
            "declaration_number": f"DEC-SPLIT{i:03d}",
            "supplier": suppliers[i % len(suppliers)],
            "sender": f"发件人拆分{i}",
            "receiver": f"收件人拆分{i}",
            "weight": 10.0,
            "declared_value": 1000.0,
            "currency": "USD",
            "origin_country": "US",
            "destination_country": "CN",
            "item_description": f"大型商品{i}（需要拆分配送）",
            "hs_code": "85171210",
            "split_flag": True,
            "parent_package_id": None,
        })

        for j in range(1, 4):
            child_tracking = f"SPLIT{202405000 + i}-{j}"
            data.append({
                "tracking_number": child_tracking,
                "declaration_number": f"DEC-SPLIT{i:03d}-{j}",
                "supplier": suppliers[i % len(suppliers)],
                "sender": f"发件人拆分{i}",
                "receiver": f"收件人拆分{i}",
                "weight": 3.33,
                "declared_value": 333.33,
                "currency": "USD",
                "origin_country": "US",
                "destination_country": "CN",
                "item_description": f"大型商品{i} 拆分{j}",
                "hs_code": "85171210",
                "split_flag": True,
                "parent_package_tracking": parent_tracking,
            })

    df = pd.DataFrame(data)
    output_path = os.path.join(OUTPUT_DIR, "split_packages.csv")
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"生成: {output_path} ({len(df)} 行)")


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("=" * 50)
    print("生成样例数据...")
    print("=" * 50)
    generate_declarations()
    generate_tracking()
    generate_tax_notices()
    generate_supplier_statements()
    generate_approval_emails()
    generate_split_packages()
    print("=" * 50)
    print("完成！")
