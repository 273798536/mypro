from inventory_manager import InventoryManager
from risk_analyzer import RiskAnalyzer
from version_history import VersionHistoryManager
from shipping_exporter import ShippingExporter
from test_data import (
    create_sample_pre_orders,
    create_sample_version_list,
    create_sample_sleeve_inventory,
    create_modified_version_list
)


def main():
    print("=" * 60)
    print("  唱片库存压盘计划系统")
    print("=" * 60)
    print()

    inventory_manager = InventoryManager()
    risk_analyzer = RiskAnalyzer()
    version_history = VersionHistoryManager()
    shipping_exporter = ShippingExporter()

    pre_orders = create_sample_pre_orders()
    version_list = create_sample_version_list()
    sleeve_inventory = create_sample_sleeve_inventory()

    inventory_manager.load_pre_orders(pre_orders)
    inventory_manager.load_version_list(version_list)
    inventory_manager.load_sleeve_inventory(sleeve_inventory)

    snapshot1 = version_history.create_snapshot(
        version_list, pre_orders, sleeve_inventory,
        "初始版本 - 修改前"
    )
    print(f"[1] 创建快照: {snapshot1.snapshot_id} - {snapshot1.description}")
    print()

    print("-" * 60)
    print("  第一次运行 - 修改前")
    print("-" * 60)
    print()

    matching_result = inventory_manager.match_versions()
    risks = risk_analyzer.analyze_all_risks(
        pre_orders, version_list, sleeve_inventory, matching_result
    )
    shipping_items, risk_alerts = inventory_manager.generate_shipping_plan()

    inventory_summary = inventory_manager.get_inventory_summary()
    risk_summary = risk_analyzer.get_risk_summary()

    print("库存汇总:")
    for key, value in inventory_summary.items():
        print(f"  {key}: {value}")
    print()

    print("风险汇总:")
    for key, value in risk_summary.items():
        print(f"  {key}: {value}")
    print()

    report1 = shipping_exporter.generate_shipping_report(
        shipping_items, risk_alerts, pre_orders, version_list,
        sleeve_inventory, inventory_summary
    )

    shipping_exporter.export_detailed_report(
        report1, "shipping_report_v1.txt"
    )
    shipping_exporter.export_to_csv(report1, "shipping_report_v1.csv")
    print("已生成报告: shipping_report_v1.txt, shipping_report_v1.csv")
    print()

    print("-" * 60)
    print("  修改版本清单 - 模拟验收时的修改")
    print("-" * 60)
    print()

    modified_version_list = create_modified_version_list()
    inventory_manager.load_version_list(modified_version_list)

    snapshot2 = version_history.create_snapshot(
        modified_version_list, pre_orders, sleeve_inventory,
        "修改后版本 - 星辰大海B版补货 + 夏日回忆新增"
    )
    print(f"[2] 创建快照: {snapshot2.snapshot_id} - {snapshot2.description}")
    print()

    print("-" * 60)
    print("  第二次运行 - 修改后")
    print("-" * 60)
    print()

    matching_result_v2 = inventory_manager.match_versions()
    risks_v2 = risk_analyzer.analyze_all_risks(
        pre_orders, modified_version_list, sleeve_inventory, matching_result_v2
    )
    shipping_items_v2, risk_alerts_v2 = inventory_manager.generate_shipping_plan()

    inventory_summary_v2 = inventory_manager.get_inventory_summary()
    risk_summary_v2 = risk_analyzer.get_risk_summary()

    print("库存汇总 (修改后):")
    for key, value in inventory_summary_v2.items():
        print(f"  {key}: {value}")
    print()

    print("风险汇总 (修改后):")
    for key, value in risk_summary_v2.items():
        print(f"  {key}: {value}")
    print()

    report2 = shipping_exporter.generate_shipping_report(
        shipping_items_v2, risk_alerts_v2, pre_orders, modified_version_list,
        sleeve_inventory, inventory_summary_v2
    )

    shipping_exporter.export_detailed_report(
        report2, "shipping_report_v2.txt"
    )
    shipping_exporter.export_to_csv(report2, "shipping_report_v2.csv")
    print("已生成报告: shipping_report_v2.txt, shipping_report_v2.csv")
    print()

    print("-" * 60)
    print("  版本对比 - 查看修改前后的差异")
    print("-" * 60)
    print()

    comparison = version_history.compare_snapshots(
        snapshot1.snapshot_id, snapshot2.snapshot_id
    )

    print("版本清单变更:")
    print(f"  新增: {comparison['version_changes']['added_count']} 项")
    print(f"  删除: {comparison['version_changes']['removed_count']} 项")
    print(f"  修改: {comparison['version_changes']['modified_count']} 项")
    print()

    if comparison['version_changes']['modified']:
        print("修改详情:")
        for mod in comparison['version_changes']['modified']:
            print(f"  {mod['album_name']} - {mod['version']} "
                  f"({'签名版' if mod['is_signed'] else '普通版'})")
            for change in mod['changes']:
                print(f"    {change['field']}: {change['old']} -> {change['new']}")
        print()

    if comparison['version_changes']['added']:
        print("新增版本:")
        for add in comparison['version_changes']['added']:
            print(f"  {add['专辑名称']} - {add['版本']} "
                  f"({'签名版' if add['是否签名'] == '是' else '普通版'}) "
                  f"x{add['压盘数量']}")
        print()

    print("变更摘要:")
    print(f"  压盘数量变化: {comparison['summary']['version_pressing_change']:+d}")
    print(f"  快照间隔: {comparison['summary']['time_diff']:.2f} 秒")
    print()

    print("-" * 60)
    print("  发货明细表 (修改后)")
    print("-" * 60)
    print()

    for item in shipping_items_v2:
        print(f"发货单: {item.shipping_id}")
        print(f"  订单: {item.order_id} - {item.customer_name}")
        print(f"  商品: {item.album_name} - {item.version} "
              f"({'签名' if item.is_signed else '普通'}) x{item.quantity}")
        print(f"  状态: {item.status}")
        if item.source_records:
            print(f"  来源追溯:")
            for src_key, src_val in item.source_records.items():
                print(f"    {src_key}: {src_val}")
        print()

    print("-" * 60)
    print("  风险预警 (修改后)")
    print("-" * 60)
    print()

    risk_categories = [
        ("版本漏配", risk_alerts_v2, "版本漏配"),
        ("签名缺货", risk_alerts_v2, "签名缺货"),
        ("订单拆分", risk_alerts_v2, "订单拆分")
    ]

    for category_name, all_risks, risk_type_value in risk_categories:
        category_risks = [r for r in all_risks if r.risk_type.value == risk_type_value]
        if category_risks:
            print(f"【{category_name}】({len(category_risks)}项)")
            for risk in category_risks:
                print(f"  {risk.risk_id}: {risk.description}")
                print(f"    缺货数量: {risk.shortage_quantity}")
                print(f"    影响订单: {', '.join(risk.affected_orders)}")
            print()

    print("=" * 60)
    print("  系统演示完成")
    print("=" * 60)
    print()
    print("生成的文件:")
    print("  - shipping_report_v1.txt  (修改前详细报告)")
    print("  - shipping_report_v1.csv  (修改前CSV格式)")
    print("  - shipping_report_v2.txt  (修改后详细报告)")
    print("  - shipping_report_v2.csv  (修改后CSV格式)")
    print()
    print("核心功能说明:")
    print("  1. 样本回看: 通过快照系统保留历史数据")
    print("  2. 版本对比: 可对比任意两个快照的差异")
    print("  3. 明细保留: 预售订单、封套库存、发货表独立记录")
    print("  4. 风险分类: 版本漏配、签名缺货、订单拆分分开说明")
    print("  5. 动态更新: 修改版本清单后自动重新计算")
    print("  6. 对应关系: 每个发货单保留来源追溯信息")


if __name__ == "__main__":
    main()
