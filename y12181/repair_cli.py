#!/usr/bin/env python3
"""
乐器维修工单排程系统 - 命令行工具

功能：
- import: 导入数据（支持JSON/CSV）
- check:  检查工单（配件缺货、师傅请假等）
- fix:    显示问题修正方案
- lock:   锁定工单配件
- status: 管理工单状态
- history:查看通知历史
- export: 导出数据
- list:   列出工单/库存/师傅
"""

import argparse
import sys
import os
from datetime import date
from typing import Optional

from models import RepairShopData, WorkOrderStatus
from importer import import_all_from_json, import_single_file
from checker import check_all_work_orders, generate_notifications, check_work_order
from fixer import print_fix_report, print_quick_summary, Colors, color, print_separator
from manager import (
    lock_parts_for_work_order,
    unlock_parts_for_work_order,
    consume_parts_for_work_order,
    complete_work_order,
    update_work_order_status,
    update_inventory,
    get_work_order_by_id,
    list_work_orders,
    get_locked_parts_summary,
    add_parts_to_work_order,
)
from notifier import print_notification_history, print_unresolved_alerts
from exporter import (
    save_to_json,
    export_work_orders_csv,
    export_inventory_csv,
    export_technicians_csv,
    export_check_report,
    export_blocked_orders_purchase_list,
    export_all_csv,
)


DATA_FILE = "repair_shop_data.json"


def load_data() -> RepairShopData:
    if os.path.exists(DATA_FILE):
        return import_all_from_json(DATA_FILE)
    return RepairShopData()


def save_data(shop_data: RepairShopData) -> None:
    save_to_json(shop_data, DATA_FILE)
    print(f"\n💾 数据已保存到 {DATA_FILE}\n")


def cmd_import(args: argparse.Namespace) -> None:
    shop_data = load_data()

    if args.all:
        try:
            new_data = import_all_from_json(args.file)
            shop_data = new_data
            print(f"✅ 成功导入完整数据:")
            print(f"   工单: {len(shop_data.work_orders)} 份")
            print(f"   乐器类型: {len(shop_data.instrument_types)} 种")
            print(f"   配件库存: {len(shop_data.part_inventories)} 项")
            print(f"   维修师傅: {len(shop_data.technicians)} 位")
            save_data(shop_data)
        except Exception as e:
            print(f"❌ 导入失败: {e}")
            sys.exit(1)
    else:
        try:
            count = import_single_file(shop_data, args.file, args.type)
            type_labels = {
                "work_orders": "工单",
                "instrument_types": "乐器类型",
                "part_inventories": "配件库存",
                "technicians": "维修师傅",
            }
            print(f"✅ 成功导入 {count} 条{type_labels.get(args.type, args.type)}数据")
            save_data(shop_data)
        except Exception as e:
            print(f"❌ 导入失败: {e}")
            sys.exit(1)


def cmd_check(args: argparse.Namespace) -> None:
    shop_data = load_data()

    print_unresolved_alerts(shop_data)

    status_filter = None
    if args.status:
        status_map = {s.value: s for s in WorkOrderStatus}
        status_map.update({s.name: s for s in WorkOrderStatus})
        status_filter = [status_map.get(s) for s in args.status if s in status_map]
        if not status_filter:
            print(f"⚠️  未识别的状态筛选，将检查所有工单")
            status_filter = None

    check_date = None
    if args.date:
        check_date = date.fromisoformat(args.date)

    report = check_all_work_orders(shop_data, check_date, status_filter)
    notifications = generate_notifications(shop_data, report)

    if notifications:
        print(f"\n📢 新增 {len(notifications)} 条问题通知\n")

    if args.fix:
        print_fix_report(report, show_all=args.all)
    else:
        print_quick_summary(report)

    save_data(shop_data)


def cmd_fix(args: argparse.Namespace) -> None:
    shop_data = load_data()

    if args.id:
        wo = get_work_order_by_id(shop_data, args.id)
        if not wo:
            print(f"❌ 未找到工单 {args.id}")
            sys.exit(1)
        result = check_work_order(shop_data, wo)
        print_fix_report.__wrapped__ if hasattr(print_fix_report, '__wrapped__') else print_fix_report
        from checker import CheckReport
        report = CheckReport(
            check_date=__import__('datetime').datetime.now(),
            total_orders=len(shop_data.work_orders),
            checked_orders=1,
            blocked_orders=1 if result.has_issues else 0,
            ready_orders=0 if result.has_issues else 1,
            results=[result],
            all_part_shortages=result.part_shortages,
            all_technician_conflicts=result.technician_conflicts,
        )
        print_fix_report(report, show_all=True)
    else:
        check_date = None
        if args.date:
            check_date = date.fromisoformat(args.date)
        report = check_all_work_orders(shop_data, check_date)
        print_fix_report(report, show_all=args.all)
        save_data(shop_data)


def cmd_lock(args: argparse.Namespace) -> None:
    shop_data = load_data()

    if args.list:
        locked = get_locked_parts_summary(shop_data)
        if not locked:
            print("\n✅ 当前没有锁定的配件\n")
            return
        print()
        print_separator("=")
        print(color("🔒 已锁定配件汇总", Colors.BLUE + Colors.BOLD))
        print_separator("-")
        for item in locked:
            print(f"\n{color(item['part_name'], Colors.BOLD)}")
            print(f"  总锁定: {item['total_locked']} {item['unit']} / 库存: {item['stock']} {item['unit']}")
            for wo in item['work_orders']:
                print(f"  - 工单 {wo['work_order_id']} ({wo['customer']}): {wo['quantity']} {item['unit']}")
        print()
        return

    if args.unlock:
        success, messages = unlock_parts_for_work_order(shop_data, args.id, args.note)
        for msg in messages:
            print(f"  {msg}")
        if success:
            save_data(shop_data)
        return

    if args.consume:
        success, messages = consume_parts_for_work_order(shop_data, args.id)
        for msg in messages:
            print(f"  {msg}")
        if success:
            save_data(shop_data)
        return

    success, messages = lock_parts_for_work_order(shop_data, args.id)
    for msg in messages:
        print(f"  {msg}")
    if success:
        save_data(shop_data)


def cmd_status(args: argparse.Namespace) -> None:
    shop_data = load_data()

    if args.set:
        status_map = {s.value: s for s in WorkOrderStatus}
        status_map.update({s.name: s for s in WorkOrderStatus})
        new_status = status_map.get(args.set)
        if not new_status:
            print(f"❌ 无效的状态: {args.set}")
            print(f"可用状态: {', '.join([s.value for s in WorkOrderStatus])}")
            sys.exit(1)

        success = update_work_order_status(shop_data, args.id, new_status, args.note)
        if success:
            print(f"✅ 工单 {args.id} 状态已更新为 {new_status.value}")
            save_data(shop_data)
        else:
            print(f"❌ 未找到工单 {args.id}")
        return

    wo = get_work_order_by_id(shop_data, args.id)
    if not wo:
        print(f"❌ 未找到工单 {args.id}")
        sys.exit(1)

    print()
    print_separator("=")
    print(f"工单详情: {wo.id}")
    print_separator("-")
    print(f"客户: {wo.customer_name}")
    print(f"乐器: {wo.instrument_type} {wo.instrument_model}")
    print(f"问题: {wo.issue_description}")
    print(f"状态: {color(wo.status.value, Colors.YELLOW + Colors.BOLD)}")
    if wo.assigned_technician:
        print(f"师傅: {wo.assigned_technician}")
    if wo.scheduled_date:
        print(f"排程: {wo.scheduled_date}")
    if wo.parts_required:
        print(f"\n所需配件:")
        for pr in wo.parts_required:
            lock_status = f" [{color('已锁定', Colors.GREEN)}]" if pr.locked else ""
            print(f"  - {pr.part_name} x {pr.quantity}{lock_status}")
    if wo.notes:
        print(f"\n操作记录:")
        for note in wo.notes:
            print(f"  {note}")
    print()


def cmd_history(args: argparse.Namespace) -> None:
    shop_data = load_data()

    notif_type = None
    if args.type:
        type_map = {
            "part": "part_shortage",
            "parts": "part_shortage",
            "technician": "technician_conflict",
            "tech": "technician_conflict",
            "instrument": "instrument_missing",
            "inst": "instrument_missing",
        }
        notif_type = type_map.get(args.type.lower())

    resolved = None
    if args.resolved == "yes":
        resolved = True
    elif args.resolved == "no":
        resolved = False

    print_notification_history(
        shop_data,
        work_order_id=args.id,
        notif_type=notif_type,
        resolved=resolved,
        limit=args.limit,
    )


def cmd_export(args: argparse.Namespace) -> None:
    shop_data = load_data()

    if args.all:
        output_dir = args.output or "export"
        results = export_all_csv(shop_data, output_dir)
        print(f"✅ 已导出到 {output_dir}/ 目录:")
        for k, v in results.items():
            if k == "json_full":
                print(f"   - 完整JSON数据")
            else:
                print(f"   - {k}: {v} 条记录")
        return

    if args.check_report:
        report = check_all_work_orders(shop_data)
        output_file = args.output or f"check_report_{__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        export_check_report(report, output_file)
        print(f"✅ 检查报告已导出到 {output_file}")
        return

    if args.purchase:
        report = check_all_work_orders(shop_data)
        output_file = args.output or f"purchase_list_{__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        count = export_blocked_orders_purchase_list(report, output_file)
        if count > 0:
            print(f"✅ 采购清单已导出到 {output_file}，共 {count} 项配件需要采购")
        else:
            print("✅ 当前没有缺货的配件，无需采购")
        return

    output_file = args.output
    if args.type == "work_orders":
        if not output_file:
            output_file = f"work_orders_{__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        count = export_work_orders_csv(shop_data, output_file)
        print(f"✅ 已导出 {count} 份工单到 {output_file}")
    elif args.type == "inventory":
        if not output_file:
            output_file = f"inventory_{__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        count = export_inventory_csv(shop_data, output_file)
        print(f"✅ 已导出 {count} 项库存到 {output_file}")
    elif args.type == "technicians":
        if not output_file:
            output_file = f"technicians_{__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        count = export_technicians_csv(shop_data, output_file)
        print(f"✅ 已导出 {count} 位师傅信息到 {output_file}")
    elif args.type == "json":
        if not output_file:
            output_file = f"alldata_{__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        save_to_json(shop_data, output_file)
        print(f"✅ 完整数据已导出到 {output_file}")


def cmd_list(args: argparse.Namespace) -> None:
    shop_data = load_data()

    if args.what == "work_orders" or args.what == "wo":
        status_filter = None
        if args.status:
            status_map = {s.value: s for s in WorkOrderStatus}
            status_map.update({s.name: s for s in WorkOrderStatus})
            status_filter = status_map.get(args.status)

        orders = list_work_orders(shop_data, status_filter)

        print()
        print_separator("=")
        print(color(f"📋 工单列表 (共 {len(orders)} 份)", Colors.BLUE + Colors.BOLD))
        print_separator("-")
        print(f"{'工单号':<14} {'客户':<10} {'乐器':<10} {'师傅':<8} {'日期':<12} {'状态':<10}")
        print("-" * 70)

        status_colors = {
            WorkOrderStatus.BLOCKED: Colors.RED,
            WorkOrderStatus.IN_PROGRESS: Colors.YELLOW,
            WorkOrderStatus.READY: Colors.CYAN,
            WorkOrderStatus.COMPLETED: Colors.GREEN,
        }

        for wo in orders:
            status_color = status_colors.get(wo.status, "")
            date_str = wo.scheduled_date.isoformat() if wo.scheduled_date else "-"
            tech_str = wo.assigned_technician or "-"
            status_str = color(wo.status.value, status_color + Colors.BOLD) if status_color else wo.status.value
            print(f"{wo.id:<14} {wo.customer_name:<10} {wo.instrument_type:<10} "
                  f"{tech_str:<8} {date_str:<12} {status_str}")
        print()

    elif args.what == "inventory" or args.what == "inv":
        print()
        print_separator("=")
        print(color(f"📦 配件库存 (共 {len(shop_data.part_inventories)} 项)", Colors.BLUE + Colors.BOLD))
        print_separator("-")
        print(f"{'配件名称':<14} {'库存':<8} {'安全库存':<8} {'状态':<10} {'供应商':<20}")
        print("-" * 70)

        for pi in shop_data.part_inventories:
            if pi.stock_quantity <= pi.min_stock:
                status = color("不足/预警", Colors.RED + Colors.BOLD)
            elif pi.stock_quantity <= pi.min_stock * 1.5:
                status = color("偏少", Colors.YELLOW)
            else:
                status = color("充足", Colors.GREEN)
            print(f"{pi.name:<14} {pi.stock_quantity:<8} {pi.min_stock:<8} {status:<20} {pi.supplier:<20}")
        print()

    elif args.what == "technicians" or args.what == "tech":
        print()
        print_separator("=")
        print(color(f"👨‍🔧 维修师傅 (共 {len(shop_data.technicians)} 位)", Colors.BLUE + Colors.BOLD))
        print_separator("-")

        for t in shop_data.technicians:
            print(f"\n{color(t.name, Colors.BOLD)}")
            print(f"  技能: {', '.join(t.skills)}")
            if t.leave_dates:
                leave_str = ", ".join([d.isoformat() for d in t.leave_dates])
                print(f"  {color('请假日期', Colors.YELLOW)}: {leave_str}")
            else:
                print(f"  请假日期: 无")
        print()

    elif args.what == "instrument_types" or args.what == "inst":
        print()
        print_separator("=")
        print(color(f"🎸 乐器类型 (共 {len(shop_data.instrument_types)} 种)", Colors.BLUE + Colors.BOLD))
        print_separator("-")

        for it in shop_data.instrument_types:
            print(f"\n{color(it.name, Colors.BOLD)} ({it.category}) - 难度: {'★' * it.difficulty_level}")
            if it.common_parts:
                print(f"  常见易损配件: {', '.join(it.common_parts)}")
        print()


def cmd_inventory(args: argparse.Namespace) -> None:
    shop_data = load_data()

    if args.add:
        part_name = args.part
        quantity = args.quantity
        success, msg = update_inventory(shop_data, part_name, quantity, args.note)
        if success:
            print(f"✅ {msg}")
            save_data(shop_data)
        else:
            print(f"❌ {msg}")


def main():
    parser = argparse.ArgumentParser(
        description="🎵 乐器维修工单排程系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 导入示例数据
  python repair_cli.py import --all sample_data.json

  # 检查所有工单
  python repair_cli.py check

  # 检查并显示详细修复方案
  python repair_cli.py check --fix

  # 查看某个工单的详细问题和解决方案
  python repair_cli.py fix --id WO-2026-001

  # 锁定工单配件
  python repair_cli.py lock --id WO-2026-001

  # 查看锁定的配件
  python repair_cli.py lock --list

  # 更新工单状态
  python repair_cli.py status --id WO-2026-001 --set 维修中 --note "开始维修"

  # 查看通知历史
  python repair_cli.py history

  # 导出所有数据
  python repair_cli.py export --all

  # 导出采购清单
  python repair_cli.py export --purchase

  # 列出所有工单
  python repair_cli.py list work_orders

  # 列出受阻工单
  python repair_cli.py list work_orders --status 受阻

  # 入库配件
  python repair_cli.py inventory --add --part "小提琴琴弦" --quantity 10 --note "采购到货"
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    import_parser = subparsers.add_parser("import", help="导入数据")
    import_parser.add_argument("file", help="导入文件路径")
    import_parser.add_argument("--all", action="store_true", help="导入完整JSON数据")
    import_parser.add_argument("--type", choices=["work_orders", "instrument_types", "part_inventories", "technicians"],
                               help="导入数据类型（单类型导入时需要）")

    check_parser = subparsers.add_parser("check", help="检查工单")
    check_parser.add_argument("--status", nargs="+", help="按状态筛选工单检查")
    check_parser.add_argument("--date", help="检查日期 (YYYY-MM-DD)")
    check_parser.add_argument("--fix", action="store_true", help="显示详细修复方案")
    check_parser.add_argument("--all", action="store_true", help="同时显示就绪工单")

    fix_parser = subparsers.add_parser("fix", help="查看问题修正方案")
    fix_parser.add_argument("--id", help="指定工单ID查看详情")
    fix_parser.add_argument("--date", help="检查日期 (YYYY-MM-DD)")
    fix_parser.add_argument("--all", action="store_true", help="同时显示就绪工单")

    lock_parser = subparsers.add_parser("lock", help="配件锁定管理")
    lock_parser.add_argument("--id", help="工单ID")
    lock_parser.add_argument("--unlock", action="store_true", help="解锁配件")
    lock_parser.add_argument("--consume", action="store_true", help="消耗配件（开始维修）")
    lock_parser.add_argument("--list", action="store_true", help="查看所有锁定的配件")
    lock_parser.add_argument("--note", help="操作备注")

    status_parser = subparsers.add_parser("status", help="工单状态管理")
    status_parser.add_argument("--id", required=True, help="工单ID")
    status_parser.add_argument("--set", help="设置新状态")
    status_parser.add_argument("--note", help="状态变更备注")

    history_parser = subparsers.add_parser("history", help="通知历史")
    history_parser.add_argument("--id", help="按工单ID筛选")
    history_parser.add_argument("--type", help="按类型筛选 (part/technician/instrument)")
    history_parser.add_argument("--resolved", choices=["yes", "no"], help="按解决状态筛选")
    history_parser.add_argument("--limit", type=int, default=20, help="显示条数")

    export_parser = subparsers.add_parser("export", help="导出数据")
    export_parser.add_argument("--type", choices=["work_orders", "inventory", "technicians", "json"],
                               help="导出类型")
    export_parser.add_argument("--all", action="store_true", help="导出所有CSV和JSON")
    export_parser.add_argument("--check-report", action="store_true", help="导出检查报告")
    export_parser.add_argument("--purchase", action="store_true", help="导出缺货配件采购清单")
    export_parser.add_argument("--output", help="输出文件/目录路径")

    list_parser = subparsers.add_parser("list", help="列表查询")
    list_parser.add_argument("what", choices=["work_orders", "wo", "inventory", "inv", "technicians", "tech",
                                              "instrument_types", "inst"],
                             help="查询类型")
    list_parser.add_argument("--status", help="按状态筛选工单")

    inventory_parser = subparsers.add_parser("inventory", help="库存管理")
    inventory_parser.add_argument("--add", action="store_true", help="增加库存")
    inventory_parser.add_argument("--part", required=True, help="配件名称")
    inventory_parser.add_argument("--quantity", type=int, required=True, help="数量")
    inventory_parser.add_argument("--note", help="备注")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    commands = {
        "import": cmd_import,
        "check": cmd_check,
        "fix": cmd_fix,
        "lock": cmd_lock,
        "status": cmd_status,
        "history": cmd_history,
        "export": cmd_export,
        "list": cmd_list,
        "inventory": cmd_inventory,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
