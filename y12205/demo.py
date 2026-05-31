#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
私域团购返佣清算系统 - 演示脚本
演示：导入 → 检查 → 问题清单 → 导出清单 全流程
"""

import sys
from datetime import datetime
from pprint import pprint

from data_importer import DataImporter
from commission_engine import CommissionEngine
from settlement_exporter import SettlementExporter
from models import SubsidyRule, AnomalyStatus, OrderStatus


def print_separator(char="=", length=80):
    print(char * length)


def print_header(title):
    print_separator()
    print(f"  {title}")
    print_separator()


def main():
    print("\n" + "=" * 80)
    print("  私域团购返佣清算系统 - 完整演示")
    print("  Private Group Buy Commission Settlement System Demo")
    print("=" * 80 + "\n")

    importer = DataImporter()

    print_header("第一步：导入数据")

    print("\n【1.1 导入群主档案】")
    owners = importer.import_group_owners_from_csv("sample_data/group_owners.csv")
    print(f"  ✓ 成功导入 {len(owners)} 位群主档案")
    for o in owners[:3]:
        print(f"    - {o.name} ({o.owner_id}) - {o.group_name} - 佣金率:{o.commission_rate*100:.0f}%")

    print("\n【1.2 导入补贴规则】")
    rules = importer.import_subsidy_rules_from_csv("sample_data/subsidy_rules.csv")
    print(f"  ✓ 成功导入 {len(rules)} 条补贴规则")
    for r in rules[:3]:
        print(f"    - {r.rule_name} ({r.rule_id}) - {r.subsidy_type}:{r.subsidy_value}")

    print("\n【1.3 导入团购订单】")
    orders = importer.import_orders_from_csv("sample_data/orders.csv")
    print(f"  ✓ 成功导入 {len(orders)} 个订单，共包含 {sum(len(o.items) for o in orders)} 件商品")
    print(f"    - 正常支付: {sum(1 for o in orders if o.status == OrderStatus.PAID)} 单")
    print(f"    - 全额退款: {sum(1 for o in orders if o.status == OrderStatus.REFUNDED)} 单")
    print(f"    - 部分退款: {sum(1 for o in orders if o.status == OrderStatus.PARTIAL_REFUND)} 单")
    print(f"    - 含多群追踪链接: {sum(1 for o in orders if o.trace_link and '|' in o.trace_link)} 单")
    print(f"    - 跨群退款: {sum(1 for o in orders if o.original_group_id and o.original_group_id != o.group_id)} 单")

    engine = CommissionEngine(importer)

    print("\n" + "=" * 80)
    print("  第二步：佣金归因与异常检测")
    print("=" * 80 + "\n")

    print("【2.1 执行批量归因处理】")
    results = engine.process_all_orders()
    print(f"  ✓ 已处理 {len(results)} 个订单")
    print(f"  ✓ 生成 {len(engine.traces)} 条归因记录")
    print(f"  ✓ 检测到 {len(engine.anomalies)} 条异常记录")

    print("\n【2.2 异常类型分布】")
    anomaly_counts = {}
    for a in engine.anomalies:
        atype = a.anomaly_type.value
        anomaly_counts[atype] = anomaly_counts.get(atype, 0) + 1
    for atype, count in anomaly_counts.items():
        type_labels = {
            "link_split": "🔗 链接串单",
            "refund_cross_group": "🔄 退款跨群",
            "subsidy_recovery": "💰 补贴追回",
            "missing_group_owner": "❓ 群主缺失"
        }
        print(f"    {type_labels.get(atype, atype)}: {count} 条")

    print("\n" + "=" * 80)
    print("  第三步：重点异常详情展示")
    print("=" * 80)

    link_splits = [a for a in engine.anomalies if a.anomaly_type.value == "link_split"]
    if link_splits:
        print("\n【3.1 链接串单异常 - 展示原因和处理建议】")
        for idx, anomaly in enumerate(link_splits[:2], 1):
            print(f"\n  ┌─ 链接串单异常 #{idx}: {anomaly.anomaly_id}")
            print(f"  │ 订单号: {anomaly.order_id}")
            order = next((o for o in importer.orders if o.order_id == anomaly.order_id), None)
            item = None
            if order:
                item = next((i for i in order.items if i.item_id == anomaly.item_id), None)
            if item:
                print(f"  │ 商品: {item.product_name} (¥{item.quantity * item.unit_price:.2f})")
            print(f"  │ 涉及金额: ¥{anomaly.affected_amount:.2f}")
            print(f"  │")
            print(f"  │ 🔍 问题原因:")
            print(f"  │   {anomaly.description}")
            print(f"  │")
            print(f"  │ 💡 处理建议:")
            print(f"  │   {anomaly.suggestion}")
            print(f"  │")
            print(f"  │ 🔗 来源追溯:")
            link_groups = anomaly.metadata.get("link_groups", [])
            print(f"  │   追踪链接群ID: {link_groups}")
            print(f"  │   订单来源: order_id={anomaly.order_id}")
            print(f"  │   群主档案: owner_id={anomaly.owner_id}")
            if anomaly.related_trace_ids:
                print(f"  │   归因记录: {', '.join(anomaly.related_trace_ids)}")
            print(f"  └" + "─" * 76)

    cross_refunds = [a for a in engine.anomalies if a.anomaly_type.value == "refund_cross_group"]
    if cross_refunds:
        print("\n【3.2 跨群退款异常】")
        for idx, anomaly in enumerate(cross_refunds[:2], 1):
            print(f"\n  跨群退款 #{idx}: {anomaly.anomaly_id}")
            print(f"    订单: {anomaly.order_id}")
            print(f"    原归属群 → 现退款群: {anomaly.metadata.get('original_group_id')} → {anomaly.metadata.get('current_group_id')}")
            print(f"    退款金额: ¥{anomaly.affected_amount:.2f}")
            print(f"    问题: {anomaly.description[:60]}...")
            print(f"    建议: {anomaly.suggestion[:60]}...")

    missing_owners = [a for a in engine.anomalies if a.anomaly_type.value == "missing_group_owner"]
    if missing_owners:
        print("\n【3.3 群主档案缺失异常】")
        for anomaly in missing_owners:
            print(f"  订单 {anomaly.order_id}: 群 {anomaly.metadata.get('group_id')} 无对应群主档案")

    print("\n" + "=" * 80)
    print("  第四步：归因版本变化演示")
    print("=" * 80)

    print("\n【4.1 查看归因版本链 - 以退款订单为例】")
    refund_order = next((o for o in importer.orders if o.status == OrderStatus.REFUNDED), None)
    if refund_order and refund_order.items:
        item = refund_order.items[0]
        history = engine.get_trace_history(refund_order.order_id, item.item_id)
        print(f"  订单 {refund_order.order_id}, 商品 {item.product_name}")
        print(f"  订单状态: {refund_order.status.value}, 退款金额: ¥{refund_order.refund_amount:.2f}")
        print(f"  归因版本历史 (共 {len(history)} 个版本):")
        for trace in history:
            status_icon = "✅" if trace.is_active else "❌"
            print(f"    {status_icon} v{trace.version} [{trace.trace_id}]")
            print(f"       佣金: ¥{trace.commission_amount:.2f}, 补贴: ¥{trace.subsidy_amount:.2f}")
            print(f"       原因: {trace.reason or '初始归因'}")
            print(f"       关联规则: {trace.rule_id}")

    print("\n【4.2 模拟退款金额调整 - 触发自动回滚】")
    partial_order = next((o for o in importer.orders if o.status == OrderStatus.PARTIAL_REFUND), None)
    if partial_order and partial_order.items:
        item = partial_order.items[0]
        print(f"  原退款金额: ¥{partial_order.refund_amount:.2f}")
        print(f"  原状态: {partial_order.status.value}")

        old_history = engine.get_trace_history(partial_order.order_id, item.item_id)
        print(f"  调整前归因版本数: {len(old_history)}")

        result = engine.rollback_refund(partial_order, 240.0, operator="财务-李姐")
        print(f"  ✓ 财务调整退款金额为 ¥240.00")
        print(f"  新状态: {partial_order.status.value}")

        new_history = engine.get_trace_history(partial_order.order_id, item.item_id)
        print(f"  调整后归因版本数: {len(new_history)}")

        latest = new_history[-1]
        print(f"  最新版本 v{latest.version}: 佣金 ¥{latest.commission_amount:.2f}, 补贴 ¥{latest.subsidy_amount:.2f}")
        print(f"  变更原因: {latest.reason}")

        subsidy_recovery = [a for a in result.get("anomalies", [])
                           if a.anomaly_type.value == "subsidy_recovery"]
        if subsidy_recovery:
            print(f"  ⚠️  自动生成补贴追回异常: {subsidy_recovery[0].anomaly_id}")

    print("\n【4.3 模拟补贴规则变更 - 触发版本更新】")
    beauty_order = next((o for o in importer.orders
                         if any(i.product_category == "beauty" for i in o.items)
                         and o.status == OrderStatus.PAID), None)
    if beauty_order:
        beauty_item = next((i for i in beauty_order.items if i.product_category == "beauty"), None)
        if beauty_item:
            old_trace = engine.get_trace_history(beauty_order.order_id, beauty_item.item_id)[-1]
            print(f"  商品 {beauty_item.product_name} (¥{beauty_item.quantity * beauty_item.unit_price:.2f})")
            print(f"  原补贴规则 {old_trace.rule_id}: 补贴 ¥{old_trace.subsidy_amount:.2f}")

            new_rule = SubsidyRule(
                rule_id="rule_001_v2",
                rule_name="618美妆专项补贴(调整版)",
                product_category="beauty",
                min_order_amount=100.0,
                subsidy_type="fixed",
                subsidy_value=10.0,
                effective_date=datetime(2024, 6, 1),
                expiry_date=datetime(2024, 6, 30),
                parent_rule_id="rule_001"
            )

            result = engine.update_subsidy_rule(beauty_order, beauty_item, new_rule, operator="运营-王经理")
            print(f"  ✓ 更新补贴规则为 rule_001_v2: 补贴从¥20降至¥10")

            new_trace = result["new_trace"]
            print(f"  新版本 v{new_trace.version}: 补贴 ¥{new_trace.subsidy_amount:.2f}")

            recovery = [a for a in result["anomalies"]
                       if a.anomaly_type.value == "subsidy_recovery"]
            if recovery:
                print(f"  ⚠️  生成补贴追回异常: 需追回 ¥{recovery[0].affected_amount:.2f}")
                print(f"     异常ID: {recovery[0].anomaly_id}")
                print(f"     处理建议: {recovery[0].suggestion}")

    print("\n" + "=" * 80)
    print("  第五步：异常复核流程")
    print("=" * 80)

    pending = engine.get_anomalies(AnomalyStatus.PENDING)
    print(f"\n【5.1 待复核异常: {len(pending)} 条】")

    if pending:
        anomaly = pending[0]
        print(f"\n  复核异常 {anomaly.anomaly_id} ({anomaly.anomaly_type.value})")
        print(f"  当前状态: {anomaly.status.value}")

        result = engine.review_anomaly(
            anomaly.anomaly_id,
            AnomalyStatus.CONFIRMED,
            notes="已核实该订单确实为多群推广串单，按首归因原则确认归属群001，后续与其他群主协商分配",
            operator="财务-李姐"
        )

        if result:
            print(f"  ✓ 复核完成，新状态: {result.status.value}")
            print(f"  复核备注: {result.review_notes[-1]}")

    print("\n" + "=" * 80)
    print("  第六步：导出清算结果")
    print("=" * 80)

    exporter = SettlementExporter(engine, importer)

    period_start = datetime(2024, 6, 1)
    period_end = datetime(2024, 6, 30, 23, 59, 59)

    print(f"\n【6.1 生成完整审计包】")
    print(f"  清算期间: {period_start.strftime('%Y-%m-%d')} ~ {period_end.strftime('%Y-%m-%d')}")

    files = exporter.generate_full_audit_package("output", period_start, period_end)

    print(f"  ✓ 导出文件清单:")
    for key, filepath in files.items():
        print(f"    - {key}: {filepath}")

    print("\n【6.2 归因明细摘要】")
    active_traces = [t for t in engine.traces if t.is_active]
    print(f"  有效归因记录: {len(active_traces)} 条")
    print(f"  佣金总计: ¥{sum(t.commission_amount for t in active_traces):.2f}")
    print(f"  补贴总计: ¥{sum(t.subsidy_amount for t in active_traces):.2f}")

    print("\n【6.3 异常复核状态统计】")
    status_counts = {}
    for a in engine.anomalies:
        status = a.status.value
        status_counts[status] = status_counts.get(status, 0) + 1
    for status, count in status_counts.items():
        print(f"  {status}: {count} 条")

    print("\n【6.4 操作日志统计】")
    print(f"  系统操作日志: {len(engine.process_logs)} 条")
    log_types = {}
    for log in engine.process_logs:
        ptype = log.process_type
        log_types[ptype] = log_types.get(ptype, 0) + 1
    for ptype, count in log_types.items():
        print(f"  - {ptype}: {count} 条")

    print_separator()
    print("  🎉 演示完成！请查看 output/ 目录下的导出文件")
    print_separator()

    print("\n📋 关键文件说明:")
    print("  - 归因明细_*.csv: 每条商品的佣金和补贴归因记录，含版本号和来源追溯")
    print("  - 异常清单_*.csv: 所有异常记录，含问题描述、处理建议、关联来源")
    print("  - 操作日志_*.csv: 完整操作留痕，支持审计追溯")
    print("  - 异常问题报告_*.txt: 可读版异常清单，含详细原因和处理建议")
    print("  - 结算汇总_*.csv: 按群主维度的结算单，含扣款明细")
    print("  - 追溯链_链接串单_*.json: 链接串单的完整归因版本链")
    print("\n🔗 来源追溯机制:")
    print("  每条归因记录都包含: order_id, owner_id, rule_id 三个来源ID")
    print("  每条异常记录关联: 订单+群主+归因记录+操作日志")
    print("  每笔金额变动都有: 版本号+变更原因+操作人+时间戳")

    return 0


if __name__ == "__main__":
    sys.exit(main())
