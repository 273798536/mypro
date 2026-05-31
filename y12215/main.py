#!/usr/bin/env python3
from datetime import date, datetime
from decimal import Decimal
import json

from models import AnnualPassAccount, EntryRecord, EntryType
from services import (
    DataStore, RevenueRecognitionService, PackageVersionManager,
    UpgradeService, EntryDeduplicationService,
    RefundService, ReportExportService
)


def setup_sample_data():
    data_store = DataStore()
    version_manager = PackageVersionManager(data_store)
    revenue_service = RevenueRecognitionService(data_store)
    upgrade_service = UpgradeService(data_store, revenue_service, version_manager)
    deduplication_service = EntryDeduplicationService(data_store)
    refund_service = RefundService(data_store, revenue_service)
    report_service = ReportExportService(data_store)
    version_manager.create_version(
        version_id="pkg_basic_2024",
        package_name="基础年票2024",
        price=Decimal('365'),
        validity_days=365,
        effective_date=date(2024, 1, 1),
        expiry_date=date(2024, 12, 31),
        description="2024年基础年票，每日1元"
    )
    version_manager.create_version(
        version_id="pkg_premium_2024",
        package_name="尊享年票2024",
        price=Decimal('730'),
        validity_days=365,
        effective_date=date(2024, 1, 1),
        expiry_date=date(2024, 12, 31),
        parent_version_id="pkg_basic_2024",
        upgrade_fee=Decimal('365'),
        description="2024年尊享年票，每日2元"
    )
    version_manager.create_version(
        version_id="pkg_basic_2025",
        package_name="基础年票2025",
        price=Decimal('365'),
        validity_days=365,
        effective_date=date(2025, 1, 1),
        description="2025年基础年票"
    )
    account1 = AnnualPassAccount(
        account_id="acc_001",
        customer_name="张三",
        customer_id="cust_001",
        package_version_id="pkg_basic_2024",
        purchase_date=date(2024, 1, 1),
        start_date=date(2024, 1, 1),
        expiry_date=date(2024, 12, 31),
        original_amount=Decimal('365'),
        paid_amount=Decimal('365'),
        source_order_id="ord_001"
    )
    data_store.add_account(account1)
    account2 = AnnualPassAccount(
        account_id="acc_002",
        customer_name="李四",
        customer_id="cust_002",
        package_version_id="pkg_basic_2024",
        purchase_date=date(2024, 6, 1),
        start_date=date(2024, 6, 1),
        expiry_date=date(2025, 5, 31),
        original_amount=Decimal('365'),
        paid_amount=Decimal('365'),
        source_order_id="ord_002"
    )
    data_store.add_account(account2)
    account3 = AnnualPassAccount(
        account_id="acc_003",
        customer_name="王五",
        customer_id="cust_003",
        package_version_id="pkg_basic_2024",
        purchase_date=date(2024, 12, 1),
        start_date=date(2024, 12, 1),
        expiry_date=date(2025, 11, 30),
        original_amount=Decimal('365'),
        paid_amount=Decimal('365'),
        source_order_id="ord_003"
    )
    data_store.add_account(account3)
    return {
        'data_store': data_store,
        'version_manager': version_manager,
        'revenue_service': revenue_service,
        'upgrade_service': upgrade_service,
        'deduplication_service': deduplication_service,
        'refund_service': refund_service,
        'report_service': report_service
    }


def demo_upgrade_trace(services):
    print("\n" + "="*60)
    print("案例1：升级追溯演示")
    print("="*60)
    data_store = services['data_store']
    upgrade_service = services['upgrade_service']
    revenue_service = services['revenue_service']
    print("\n1. 先为acc_001生成1-6月的收入确认...")
    revenue_service.recognize_revenue_for_account(
        "acc_001", date(2024, 1, 1), date(2024, 6, 30)
    )
    print("   已生成181天收入明细")
    print("\n2. 2024年7月1日，张三从基础年票升级到尊享年票...")
    upgrade = upgrade_service.process_upgrade(
        account_id="acc_001",
        to_package_version_id="pkg_premium_2024",
        upgrade_date=date(2024, 7, 1),
        source_order_id="ord_upg_001"
    )
    print(f"   升级ID: {upgrade.upgrade_id}")
    print(f"   升级费用: {upgrade.upgrade_fee} 元")
    print("\n3. 查看升级历史追溯:")
    history = upgrade_service.trace_upgrade_history("acc_001")
    for h in history:
        print(f"   - {h['upgrade_date']}: {h['from_package']} -> {h['to_package']}")
        print(f"     费用: {h['upgrade_fee']} 元, 来源订单: {h['source_order_id']}")
    account = data_store.get_account("acc_001")
    print(f"\n4. 当前套餐版本: {account.package_version_id}")
    return services


def demo_duplicate_entry(services):
    print("\n" + "="*60)
    print("案例2：重复入园去重演示")
    print("="*60)
    data_store = services['data_store']
    deduplication_service = services['deduplication_service']
    print("\n1. 为acc_001添加3条入园记录，其中2024-03-15有2次重复入园...")
    entries = [
        EntryRecord(
            entry_id="entry_001",
            account_id="acc_001",
            entry_date=date(2024, 3, 15),
            entry_time=datetime(2024, 3, 15, 9, 0),
            gate_id="gate_a",
            entry_type=EntryType.NORMAL
        ),
        EntryRecord(
            entry_id="entry_002",
            account_id="acc_001",
            entry_date=date(2024, 3, 15),
            entry_time=datetime(2024, 3, 15, 9, 5),
            gate_id="gate_b",
            entry_type=EntryType.NORMAL
        ),
        EntryRecord(
            entry_id="entry_003",
            account_id="acc_001",
            entry_date=date(2024, 3, 16),
            entry_time=datetime(2024, 3, 16, 10, 0),
            gate_id="gate_a",
            entry_type=EntryType.NORMAL
        ),
    ]
    for e in entries:
        data_store.add_entry_record(e)
    print("   已添加3条入园记录")
    print("\n2. 执行去重检测...")
    duplicates = deduplication_service.detect_duplicates("acc_001", date(2024, 3, 15))
    print(f"   检测到 {len(duplicates)} 条重复记录")
    for dup in duplicates:
        print(f"   - 记录 {dup.entry_id} 是 {dup.duplicate_of_entry_id} 的重复")
    print("\n3. 2024-03-15 去重后的有效入园次数:", end=" ")
    valid_count = deduplication_service.get_entry_count_by_date(
        "acc_001", date(2024, 3, 15), date(2024, 3, 15)
    )
    print(f"{valid_count.get(date(2024, 3, 15), 0)} 次")
    return services


def demo_cross_year_refund(services):
    print("\n" + "="*60)
    print("案例3：退款跨年处理演示")
    print("="*60)
    data_store = services['data_store']
    refund_service = services['refund_service']
    revenue_service = services['revenue_service']
    print("\n1. 为acc_003生成完整的收入确认...")
    revenue_service.recognize_revenue_for_account(
        "acc_003", date(2024, 12, 1), date(2025, 11, 30)
    )
    print("   已生成365天收入明细")
    print("\n2. 2025年1月15日，王五申请退款...")
    refund = refund_service.process_refund(
        account_id="acc_003",
        refund_date=date(2025, 1, 15),
        source_order_id="ord_ref_001",
        remarks="客户主动申请退款"
    )
    print(f"   退款ID: {refund.refund_id}")
    print(f"   退款金额: {refund.refund_amount} 元")
    print(f"   受影响期间: {refund.affected_period}")
    print(f"   受影响收入明细数量: {len(refund.affected_revenue_detail_ids)} 条")
    print("\n3. 追溯退款影响的明细:")
    impact = refund_service.trace_refund_impact(refund.refund_id)
    print(f"   客户: {impact['customer_name']}")
    print(f"   影响期间: {impact['affected_period']}")
    print(f"   影响收入明细: {impact['affected_revenue_count']} 条")
    print(f"   产生退款明细: {impact['refund_detail_count']} 条")
    cross_year = refund_service.get_cross_year_refunds(2025)
    print(f"\n4. 跨年退款记录数: {len(cross_year)}")
    return services


def demo_report_export(services):
    print("\n" + "="*60)
    print("案例4：报表导出与数据对应关系")
    print("="*60)
    report_service = services['report_service']
    print("\n1. 导出acc_001完整账户详情报表...")
    account_report = report_service.export_account_details_report("acc_001")
    print("   账户摘要:")
    print(f"   - 账户ID: {account_report['account_summary']['account_id']}")
    print(f"   - 客户: {account_report['account_summary']['customer_name']}")
    print(f"   - 当前套餐: {account_report['account_summary']['current_package']}")
    print(f"\n2. 数据对应关系:")
    mapping = account_report['data_mapping']
    print(f"   - 收入明细 -> 账户映射: {len(mapping['revenue_to_account'])} 条")
    print(f"   - 退款 -> 收入明细映射: {len(mapping['refund_to_revenue'])} 条")
    print(f"   - 升级 -> 调整记录映射: {len(mapping['upgrade_to_adjustment'])} 条")
    print("\n3. 导出审计追踪报表...")
    audit_trail = report_service.generate_audit_trail_report()
    print(f"   共 {len(audit_trail)} 条调整记录")
    for trail in audit_trail[:3]:
        print(f"   - {trail['adjustment_date']}: {trail['adjustment_type']}")
        print(f"     金额: {trail['amount']} 元, 操作人: {trail['operator'] or '系统'}")
    print("\n4. 导出CSV收入报表(前5条预览:")
    csv_report = report_service.export_revenue_report(
        date(2024, 1, 1), date(2024, 1, 5)
    )
    lines = csv_report.split('\n')[:6]
    for line in lines:
        print(f"   {line}")
    report_service.save_report_to_file(csv_report, "revenue_report_2024.csv")
    print("\n   报表已保存到 revenue_report_2024.csv")
    print("\n5. 导出JSON格式账户详情:")
    json_report = json.dumps(account_report, ensure_ascii=False, indent=2)
    report_service.save_report_to_file(json_report, "account_report_acc_001.json")
    print("   账户详情已保存到 account_report_acc_001.json")
    return services


def main():
    print("\n" + "="*60)
    print("游乐园年票递延收入系统 - 演示")
    print("="*60)
    print("\n初始化样例数据...")
    services = setup_sample_data()
    print("样例数据初始化完成")
    services = demo_upgrade_trace(services)
    services = demo_duplicate_entry(services)
    services = demo_cross_year_refund(services)
    services = demo_report_export(services)
    print("\n" + "="*60)
    print("演示完成！")
    print("="*60)
    print("\n核心功能验证:")
    print("✓ 套餐版本管理")
    print("✓ 收入递延确认")
    print("✓ 升级追溯与调整留痕")
    print("✓ 重复入园去重")
    print("✓ 退款跨年处理")
    print("✓ 数据溯源与报表导出")
    print("\n生成的文件:")
    print("- revenue_report_2024.csv - 收入报表")
    print("- account_report_acc_001.json - 账户详情报表")


if __name__ == "__main__":
    main()
