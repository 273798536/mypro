#!/usr/bin/env python3
from datetime import datetime, timedelta

from models import (
    ExportOrder, InsurancePolicy, ClaimRecord, RecoveryRecord
)
from ledger_service import RecoveryLedgerService
from report_generator import ReportGenerator


def create_sample_data(service: RecoveryLedgerService):
    today = datetime.now()
    
    print("正在导入样例数据...")
    print("=" * 60)
    
    orders_data = [
        {
            "order_id": "ORD20240115001",
            "order_date": today - timedelta(days=150),
            "buyer_name": "Global Electronics Inc",
            "buyer_country": "美国",
            "product_name": "智能手机配件套装",
            "quantity": 5000,
            "unit_price": 28.5,
            "currency": "USD",
            "total_amount": 142500,
            "shipment_date": today - timedelta(days=135),
            "payment_term": "OA90"
        },
        {
            "order_id": "ORD20240220002",
            "order_date": today - timedelta(days=120),
            "buyer_name": "Euro Tech Distribution",
            "buyer_country": "德国",
            "product_name": "无线蓝牙耳机",
            "quantity": 3000,
            "unit_price": 45.0,
            "currency": "USD",
            "total_amount": 135000,
            "shipment_date": today - timedelta(days=105),
            "payment_term": "OA60"
        },
        {
            "order_id": "ORD20240310003",
            "order_date": today - timedelta(days=95),
            "buyer_name": "Asia Pacific Trading",
            "buyer_country": "澳大利亚",
            "product_name": "智能手表",
            "quantity": 2000,
            "unit_price": 85.0,
            "currency": "USD",
            "total_amount": 170000,
            "shipment_date": today - timedelta(days=80),
            "payment_term": "OA90"
        },
        {
            "order_id": "ORD20240325004",
            "order_date": today - timedelta(days=80),
            "buyer_name": "Americas Retail Group",
            "buyer_country": "加拿大",
            "product_name": "平板保护壳",
            "quantity": 8000,
            "unit_price": 12.5,
            "currency": "USD",
            "total_amount": 100000,
            "shipment_date": today - timedelta(days=65),
            "payment_term": "OA60"
        },
        {
            "order_id": "ORD20240405005",
            "order_date": today - timedelta(days=65),
            "buyer_name": "Global Electronics Inc",
            "buyer_country": "美国",
            "product_name": "充电器套装",
            "quantity": 10000,
            "unit_price": 8.0,
            "currency": "USD",
            "total_amount": 80000,
            "shipment_date": today - timedelta(days=50),
            "payment_term": "OA90"
        }
    ]
    
    for data in orders_data:
        order = ExportOrder(**data, source_tag="SOURCE_ORDER")
        success, msg = service.add_order(order)
        print(f"  {msg}")
    
    policies_data = [
        {
            "policy_id": "POL20240116001",
            "policy_number": "SINOSURE-2024-US-00128",
            "order_id": "ORD20240115001",
            "insured_amount": 142500,
            "currency": "USD",
            "coverage_rate": 0.9,
            "effective_date": today - timedelta(days=148),
            "expiry_date": today + timedelta(days=200),
            "insurer": "中国出口信用保险公司",
            "premium_amount": 1282.5
        },
        {
            "policy_id": "POL20240221002",
            "policy_number": "SINOSURE-2024-EU-00086",
            "order_id": "ORD20240220002",
            "insured_amount": 135000,
            "currency": "USD",
            "coverage_rate": 0.85,
            "effective_date": today - timedelta(days=118),
            "expiry_date": today + timedelta(days=150),
            "insurer": "中国出口信用保险公司",
            "premium_amount": 1147.5
        },
        {
            "policy_id": "POL20240311003",
            "policy_number": "SINOSURE-2024-AU-00052",
            "order_id": "ORD20240310003",
            "insured_amount": 170000,
            "currency": "USD",
            "coverage_rate": 0.8,
            "effective_date": today - timedelta(days=93),
            "expiry_date": today + timedelta(days=120),
            "insurer": "中国出口信用保险公司",
            "premium_amount": 1360.0
        },
        {
            "policy_id": "POL20240326004",
            "policy_number": "SINOSURE-2024-CA-00103",
            "order_id": "ORD20240325004",
            "insured_amount": 100000,
            "currency": "USD",
            "coverage_rate": 0.9,
            "effective_date": today - timedelta(days=78),
            "expiry_date": today + timedelta(days=100),
            "insurer": "中国出口信用保险公司",
            "premium_amount": 900.0
        },
        {
            "policy_id": "POL20240406005",
            "policy_number": "SINOSURE-2024-US-00156",
            "order_id": "ORD20240405005",
            "insured_amount": 80000,
            "currency": "USD",
            "coverage_rate": 0.9,
            "effective_date": today - timedelta(days=63),
            "expiry_date": today + timedelta(days=80),
            "insurer": "中国出口信用保险公司",
            "premium_amount": 720.0
        }
    ]
    
    print()
    for data in policies_data:
        policy = InsurancePolicy(**data, source_tag="SOURCE_POLICY")
        success, msg = service.add_policy(policy)
        print(f"  {msg}")
    
    claims_data = [
        {
            "claim_id": "CLM20240520001",
            "policy_id": "POL20240116001",
            "order_id": "ORD20240115001",
            "claim_date": today - timedelta(days=40),
            "claim_amount": 128250,
            "currency": "USD",
            "claim_reason": "买家拖欠货款，逾期45天",
            "approved_amount": 128250,
            "deduction_amount": 0,
            "payment_date": today - timedelta(days=25),
            "is_disputed": False
        },
        {
            "claim_id": "CLM20240605002",
            "policy_id": "POL20240221002",
            "order_id": "ORD20240220002",
            "claim_date": today - timedelta(days=25),
            "claim_amount": 114750,
            "currency": "USD",
            "claim_reason": "买家申请破产保护",
            "approved_amount": 100000,
            "deduction_amount": 14750,
            "deduction_reason": "剔除超额投保部分，按实际出运金额核算",
            "payment_date": today - timedelta(days=10),
            "is_disputed": True,
            "dispute_reason": "业务部门认为应按保单金额全额赔付"
        },
        {
            "claim_id": "CLM20240615003",
            "policy_id": "POL20240311003",
            "order_id": "ORD20240310003",
            "claim_date": today - timedelta(days=15),
            "claim_amount": 136000,
            "currency": "USD",
            "claim_reason": "买家拒收货物，货物滞港",
            "approved_amount": 136000,
            "deduction_amount": 0,
            "payment_date": None,
            "is_disputed": False
        }
    ]
    
    print()
    for data in claims_data:
        claim = ClaimRecord(**data, source_tag="SOURCE_CLAIM")
        success, msg = service.add_claim(claim)
        print(f"  {msg}")
    
    recoveries_data = [
        {
            "recovery_id": "REC20240610001",
            "claim_id": "CLM20240520001",
            "order_id": "ORD20240115001",
            "recovery_date": today - timedelta(days=15),
            "recovery_amount": 50000,
            "currency": "USD",
            "recovery_channel": "买家直接还款",
            "expected_date": today - timedelta(days=20)
        },
        {
            "recovery_id": "REC20240625002",
            "claim_id": "CLM20240520001",
            "order_id": "ORD20240115001",
            "recovery_date": today - timedelta(days=5),
            "recovery_amount": 78250,
            "currency": "USD",
            "recovery_channel": "第三方商账公司",
            "expected_date": today - timedelta(days=10)
        },
        {
            "recovery_id": "REC20240628003",
            "claim_id": "CLM20240605002",
            "order_id": "ORD20240220002",
            "recovery_date": today - timedelta(days=2),
            "recovery_amount": 25000,
            "currency": "USD",
            "recovery_channel": "破产清算分配",
            "expected_date": None
        }
    ]
    
    print()
    for data in recoveries_data:
        recovery = RecoveryRecord(**data, source_tag="SOURCE_RECOVERY")
        success, msg = service.add_recovery(recovery)
        print(f"  {msg}")
    
    print()
    success, msg = service.mark_buyer_merge(
        buyer_names=["Global Electronics Inc", "Americas Retail Group"],
        new_buyer_name="Global Americas Holdings",
        order_ids=["ORD20240115001", "ORD20240325004", "ORD20240405005"]
    )
    print(f"  {msg}")
    
    print()
    print("=" * 60)
    print("样例数据导入完成！")
    print()


def main():
    print()
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 10 + "出口信用险追偿台账管理系统" + " " * 18 + "║")
    print("╚" + "=" * 58 + "╝")
    print()
    
    service = RecoveryLedgerService()
    create_sample_data(service)
    
    print("正在检查数据一致性...")
    issues = service.check_data_consistency()
    if issues:
        print("  发现以下问题：")
        for category, items in issues.items():
            for item in items:
                print(f"    - {item}")
    else:
        print("  ✓ 数据一致性检查通过")
    print()
    
    print("未解决异常记录：")
    abnormal_records = service.get_abnormal_records(unresolved_only=True)
    if abnormal_records:
        for abn in abnormal_records:
            print(f"  [{abn.abnormal_type.value}] {abn.description}")
            print(f"    金额：{abn.amount:,.2f} {abn.currency}")
    else:
        print("  无未解决异常")
    print()
    
    report_gen = ReportGenerator(service)
    
    print("【快报摘要】")
    print(report_gen.generate_simple_summary())
    print()
    
    filename = report_gen.export_to_file()
    print(f"完整报告已导出至：{filename}")
    print()
    
    print("【报告预览】")
    print("-" * 60)
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for line in lines[:40]:
            print(line.rstrip())
    print("...")
    print("(其余内容请查看完整报告文件)")
    print()
    
    print("【金额核销口径】")
    calibers = service.get_verification_calibers()
    for c in calibers:
        print(f"  {c.caliber_id}: {c.name}")
        print(f"    适用：{', '.join(c.applicable_scenarios)}")
    print()
    
    print("系统演示完成！")
    print()


if __name__ == "__main__":
    main()
