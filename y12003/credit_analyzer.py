#!/usr/bin/env python3

import sys
import os
from datetime import date, timedelta

from models import (
    Customer,
    SalesOrder,
    PaymentRecord,
    ReturnOrder,
    TemporaryCreditLimit,
    ReturnStatus,
)
from credit_calculator import CreditCalculator
from data_portal import DataPortal


def load_sample_data(calculator: CreditCalculator) -> None:
    today = date.today()

    customers = [
        Customer("C001", "华盛批发", 500000, remarks="老客户，信誉良好"),
        Customer("C002", "宏达商贸", 300000, remarks="有临时提额需求"),
        Customer("C003", "兴盛批发", 200000, remarks="需关注回款情况"),
        Customer("C004", "万隆商行", 400000, remarks="退货较多"),
        Customer("C005", "鑫源贸易", 150000, remarks="新客户"),
    ]
    for c in customers:
        calculator.add_customer(c)

    orders = [
        SalesOrder("O001", "C001", today - timedelta(days=30), 200000, 200000, 150000, salesperson="张三"),
        SalesOrder("O002", "C001", today - timedelta(days=15), 150000, 150000, 0, salesperson="张三"),
        SalesOrder("O003", "C002", today - timedelta(days=20), 250000, 250000, 100000, salesperson="李四"),
        SalesOrder("O004", "C002", today - timedelta(days=5), 100000, 100000, 0, salesperson="李四"),
        SalesOrder("O005", "C003", today - timedelta(days=25), 180000, 180000, 20000, salesperson="王五"),
        SalesOrder("O006", "C004", today - timedelta(days=10), 300000, 300000, 50000, salesperson="赵六"),
        SalesOrder("O007", "C005", today - timedelta(days=3), 80000, 80000, 0, salesperson="张三"),
    ]
    for o in orders:
        calculator.add_sales_order(o)

    payments = [
        PaymentRecord("P001", "C001", today - timedelta(days=20), 150000),
        PaymentRecord("P002", None, today - timedelta(days=10), 100000, remarks="银行转账，无备注"),
        PaymentRecord("P003", "C003", today - timedelta(days=5), 20000),
        PaymentRecord("P004", None, today - timedelta(days=2), 50000),
        PaymentRecord("P005", "C004", today - timedelta(days=1), 50000),
    ]
    for p in payments:
        calculator.add_payment(p)

    returns = [
        ReturnOrder("R001", "O006", "C004", today - timedelta(days=35), 30000, status=ReturnStatus.PENDING, remarks="质量问题退货"),
        ReturnOrder("R002", "O006", "C004", today - timedelta(days=45), 20000, status=ReturnStatus.APPROVED, processed_date=today - timedelta(days=40)),
        ReturnOrder("R003", "O001", "C001", today - timedelta(days=10), 15000, status=ReturnStatus.PENDING),
    ]
    for r in returns:
        calculator.add_return_order(r)

    temp_limits = [
        TemporaryCreditLimit(
            "T001", "C002", 100000,
            today - timedelta(days=30),
            today + timedelta(days=2),
            reason="促销活动临时提额"
        ),
        TemporaryCreditLimit(
            "T002", "C001", 50000,
            today - timedelta(days=15),
            today - timedelta(days=1),
            reason="月底备货临时提额"
        ),
    ]
    for t in temp_limits:
        calculator.add_temp_limit(t)

    calculator.recalculate_all()


def print_banner():
    print("=" * 60)
    print("          批发赊销信用额度分析系统")
    print("=" * 60)
    print()


def print_menu():
    print("\n请选择操作：")
    print("1. 查看信用额度总览")
    print("2. 查看单个客户详情")
    print("3. 检查能否发货")
    print("4. 查看未认领回款")
    print("5. 查看修正任务清单")
    print("6. 导出数据文件")
    print("7. 刷新数据")
    print("0. 退出")
    print()


def print_credit_summary(portal: DataPortal):
    data = portal.get_credit_summary_data()

    print("\n" + "=" * 60)
    print("信用额度总览")
    print("=" * 60)
    print(f"客户总数: {data['customer_count']}")
    print(f"总基础额度: {data['total_base_limit']:,.2f}")
    print(f"总有效额度: {data['total_effective_limit']:,.2f}")
    print(f"总使用额度: {data['total_usage']:,.2f}")
    print(f"整体使用率: {data['overall_usage_rate']:.2f}%")
    print()

    print("客户状态分布:")
    for status, count in data["status_distribution"].items():
        print(f"  {status}: {count} 家")
    print()

    print("额度使用率TOP5:")
    print("-" * 60)
    print(f"{'客户名称':<15} {'使用率(%)':>10} {'可用额度':>15} {'状态':>8}")
    print("-" * 60)
    for cust in data["top_usage_customers"][:5]:
        print(
            f"{cust['customer_name']:<15} "
            f"{cust['usage_rate']:>10.2f} "
            f"{cust['available_credit']:>15,.2f} "
            f"{str(cust['current_status']):>8}"
        )


def print_customer_detail(portal: DataPortal):
    customer_id = input("\n请输入客户ID: ").strip()
    if not customer_id:
        return

    detail = portal.get_customer_detail(customer_id)
    if not detail:
        print(f"未找到客户: {customer_id}")
        return

    usage = detail["usage"]
    print("\n" + "=" * 60)
    print(f"客户详情 - {usage['customer_name']} ({customer_id})")
    print("=" * 60)

    print(f"基础额度: {usage['base_limit']:,.2f}")
    print(f"有效额度: {usage['effective_limit']:,.2f}")
    print(f"实际使用: {usage['actual_usage']:,.2f}")
    print(f"可用额度: {usage['available_credit']:,.2f}")
    print(f"使用率: {usage['usage_rate']:.2f}%")
    print(f"当前状态: {usage['current_status']}")
    print()

    print(f"发货状态: {'可以发货' if detail['can_ship'] else '不能发货'}")
    print(f"提示信息: {detail['ship_message']}")
    print()

    if detail["return_suggestions"]:
        print("待处理退货修正建议:")
        for s in detail["return_suggestions"]:
            print(f"  - 退货单 {s['return_id']}: 金额{s['return_amount']:,.2f}, 已待{s['days_pending']}天, 优先级:{s['priority']}")
            for action in s["actions"]:
                print(f"    * {action}")
        print()

    if detail["temp_suggestions"]:
        print("临时额度修正建议:")
        for s in detail["temp_suggestions"]:
            status_str = "已过期" if s["days_remaining"] <= 0 else f"剩余{s['days_remaining']}天"
            print(f"  - 临时额度 {s['temp_id']}: 金额{s['amount']:,.2f}, {status_str}")
            for action in s["actions"]:
                print(f"    * {action}")
        print()


def check_ship(portal: DataPortal):
    customer_id = input("\n请输入客户ID: ").strip()
    if not customer_id:
        return

    order_amount_str = input("请输入订单金额(可选): ").strip()
    order_amount = float(order_amount_str) if order_amount_str else 0.0

    can_ship, message = portal.calculator.can_ship(customer_id, order_amount)
    print(f"\n结果: {message}")


def print_unmatched_payments(portal: DataPortal):
    data = portal.get_payment_data()
    unmatched = data["unmatched_summary"]

    print("\n" + "=" * 60)
    print("未认领回款")
    print("=" * 60)
    print(f"未认领笔数: {unmatched['total_unmatched_count']}")
    print(f"未认领金额: {unmatched['total_unmatched_amount']:,.2f}")
    print()

    if unmatched["by_customer"]:
        print("按客户分布:")
        for name, amount in unmatched["by_customer"].items():
            print(f"  {name}: {amount:,.2f}")
    print()

    print("未认领明细:")
    print("-" * 60)
    print(f"{'回款ID':<10} {'回款日期':<12} {'金额':>12} {'未匹配':>12} {'状态':>8}")
    print("-" * 60)
    for p in unmatched["unmatched_list"]:
        print(
            f"{p['payment_id']:<10} "
            f"{str(p['payment_date']):<12} "
            f"{p['amount']:>12,.2f} "
            f"{p['unmatched_amount']:>12,.2f} "
            f"{str(p['match_status']):>8}"
        )

    print("\n触发回款未认领的条件:")
    print("  1. 回款记录无客户ID")
    print("  2. 回款金额与订单金额不匹配")
    print("  3. 回款日期与订单日期差距过大")
    print("  4. 匹配置信度低于40分需要人工确认")


def print_correction_tasks(portal: DataPortal):
    data = portal.get_correction_data()
    tasks = data["correction_tasks"]

    print("\n" + "=" * 60)
    print("修正任务清单")
    print("=" * 60)
    print(f"高优先级任务: {tasks['summary']['high_priority_count']}")
    print(f"中优先级任务: {tasks['summary']['medium_priority_count']}")
    print()

    if tasks["high_priority"]:
        print("高优先级任务:")
        print("-" * 60)
        for task in tasks["high_priority"]:
            print(f"\n[{task['type']}] {task['customer_name']}")
            print(f"  描述: {task['description']}")
            print(f"  建议: {task['action']}")

    if tasks["medium_priority"]:
        print("\n中优先级任务:")
        print("-" * 60)
        for task in tasks["medium_priority"]:
            print(f"\n[{task['type']}] {task['customer_name']}")
            print(f"  描述: {task['description']}")
            print(f"  建议: {task['action']}")


def export_data(portal: DataPortal):
    output_dir = "output"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("\n正在导出数据...")

    csv_path = os.path.join(output_dir, "credit_summary.csv")
    portal.export_credit_summary_to_csv(csv_path)
    print(f"  信用汇总: {csv_path}")

    csv_path = os.path.join(output_dir, "unmatched_payments.csv")
    portal.export_unmatched_payments_to_csv(csv_path)
    print(f"  未认领回款: {csv_path}")

    csv_path = os.path.join(output_dir, "correction_tasks.csv")
    portal.export_correction_tasks_to_csv(csv_path)
    print(f"  修正任务: {csv_path}")

    json_path = os.path.join(output_dir, "full_data.json")
    portal.export_to_json(json_path)
    print(f"  完整数据: {json_path}")

    print(f"\n所有文件已导出到 {output_dir}/ 目录")


def main():
    print_banner()

    calculator = CreditCalculator()

    if "--sample" in sys.argv or len(sys.argv) == 1:
        print("正在加载样例数据...")
        load_sample_data(calculator)
        print("样例数据加载完成！")
    else:
        print("提示: 使用 --sample 参数加载样例数据")

    portal = DataPortal(calculator)

    while True:
        print_menu()
        choice = input("请输入选项 (0-7): ").strip()

        if choice == "0":
            print("感谢使用，再见！")
            break
        elif choice == "1":
            print_credit_summary(portal)
        elif choice == "2":
            print_customer_detail(portal)
        elif choice == "3":
            check_ship(portal)
        elif choice == "4":
            print_unmatched_payments(portal)
        elif choice == "5":
            print_correction_tasks(portal)
        elif choice == "6":
            export_data(portal)
        elif choice == "7":
            portal.refresh_data()
            print("数据已刷新！")
        else:
            print("无效选项，请重新输入！")


if __name__ == "__main__":
    main()
