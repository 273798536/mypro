#!/usr/bin/env python3
"""
矿山设备租赁账期 - 本地命令行工具

用于处理矿山设备租赁的账期结算，支持：
- 设备台账管理（含停机免租配置）
- 班次记录（支持跨日班次）
- 故障停机管理（按原因计费/免租）
- 签字单匹配（缺页检测）
- 计费日历和账单导出
"""

import argparse
import sys
from datetime import date, datetime
from pathlib import Path

from device_ledger import DeviceLedger
from shift_manager import ShiftManager
from downtime_manager import DowntimeManager
from signature_manager import SignatureManager
from billing_engine import BillingEngine


def parse_date(date_str: str) -> date:
    for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"无法解析日期: {date_str}")


def print_section(title: str):
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_warning(msg: str):
    print(f"  ⚠️  {msg}")


def print_error(msg: str):
    print(f"  ❌ {msg}")


def print_success(msg: str):
    print(f"  ✅ {msg}")


def print_info(msg: str):
    print(f"  ℹ️  {msg}")


def main():
    parser = argparse.ArgumentParser(
        description="矿山设备租赁账期 - 矿区设备租赁账期结算工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python 矿山设备租赁账期.py --start 2024-05-01 --end 2024-05-31 \\
      --ledger data/设备台账.csv \\
      --shifts data/班次表.csv \\
      --downtimes data/故障停机.csv \\
      --signatures data/签字单.csv \\
      --output output/
        """,
    )

    parser.add_argument(
        "--start",
        required=True,
        help="账期开始日期 (格式: YYYY-MM-DD)",
    )
    parser.add_argument(
        "--end",
        required=True,
        help="账期结束日期 (格式: YYYY-MM-DD)",
    )
    parser.add_argument(
        "--ledger",
        required=True,
        help="设备台账CSV文件路径",
    )
    parser.add_argument(
        "--shifts",
        help="班次表CSV文件路径",
    )
    parser.add_argument(
        "--downtimes",
        help="故障停机CSV文件路径",
    )
    parser.add_argument(
        "--signatures",
        help="签字单CSV文件路径",
    )
    parser.add_argument(
        "--customer",
        default="",
        help="筛选指定客户",
    )
    parser.add_argument(
        "--site",
        default="",
        help="筛选指定矿区",
    )
    parser.add_argument(
        "--output",
        default="./billing_output",
        help="输出目录 (默认: ./billing_output)",
    )
    parser.add_argument(
        "--no-export",
        action="store_true",
        help="不导出文件，仅显示预览",
    )

    args = parser.parse_args()

    try:
        period_start = parse_date(args.start)
        period_end = parse_date(args.end)
    except ValueError as e:
        print_error(str(e))
        sys.exit(1)

    print_section("矿山设备租赁账期结算")
    print_info(f"账期: {period_start} 至 {period_end}")
    if args.customer:
        print_info(f"客户: {args.customer}")
    if args.site:
        print_info(f"矿区: {args.site}")

    print_section("数据导入")

    device_ledger = DeviceLedger()
    try:
        warnings = device_ledger.import_from_csv(args.ledger)
        print_success(f"设备台账: 导入 {len(device_ledger.list_all_devices())} 台设备")
        for w in warnings:
            print_warning(w)
    except FileNotFoundError as e:
        print_error(str(e))
        sys.exit(1)

    shift_manager = ShiftManager()
    if args.shifts and Path(args.shifts).exists():
        warnings = shift_manager.import_from_csv(args.shifts)
        print_success(f"班次表: 导入 {len(shift_manager.shifts)} 条记录")
        for w in warnings:
            print_warning(w)
    else:
        print_warning("班次表文件不存在或未指定")

    downtime_manager = DowntimeManager()
    if args.downtimes and Path(args.downtimes).exists():
        warnings = downtime_manager.import_from_csv(args.downtimes)
        print_success(f"故障停机: 导入 {len(downtime_manager.downtimes)} 条记录")
        for w in warnings:
            print_warning(w)

    signature_manager = SignatureManager()
    if args.signatures and Path(args.signatures).exists():
        warnings = signature_manager.import_from_csv(args.signatures)
        print_success(f"签字单: 导入 {len(signature_manager.signatures)} 条记录")
        for w in warnings:
            print_warning(w)

    print_section("生成计费日历")

    billing_engine = BillingEngine(
        device_ledger=device_ledger,
        shift_manager=shift_manager,
        downtime_manager=downtime_manager,
        signature_manager=signature_manager,
    )

    billing_period = billing_engine.create_billing_period(
        period_start=period_start,
        period_end=period_end,
        customer=args.customer,
        mining_site=args.site,
    )

    print_info(f"计费天数: {len(billing_period.calendar_days)}")
    print_info(f"计费时长: {billing_period.total_billable_hours} 小时 / {billing_period.total_billable_shifts} 班")
    print_info(f"免租时长: {billing_period.total_free_hours} 小时")
    print_success(f"总金额: ¥{billing_period.total_amount:,.2f}")

    print_section("问题清单")

    if billing_period.issues:
        for issue in billing_period.issues:
            print_error(issue)
    else:
        print_success("无严重问题")

    print_section("警告提示")

    if billing_period.warnings:
        for warning in billing_period.warnings[:20]:
            print_warning(warning)
        if len(billing_period.warnings) > 20:
            print_warning(f"... 还有 {len(billing_period.warnings) - 20} 条警告")
    else:
        print_success("无警告")

    print_section("操作建议")

    hints = billing_engine.get_actionable_hints(billing_period)
    if hints:
        for hint in hints:
            print_info(hint)
    else:
        print_success("数据完整，无需补充")

    if args.no_export:
        print_section("预览模式 - 未导出文件")
        sys.exit(0)

    print_section("导出文件")

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    bill = billing_engine.export_bill(billing_period)
    bill_path = billing_engine.save_bill_to_csv(
        bill, str(output_dir / f"{bill.bill_id}.csv")
    )
    print_success(f"账单已导出: {bill_path}")

    details_path = billing_engine.save_period_details_json(
        billing_period,
        str(output_dir / f"{bill.bill_id}_details.json"),
    )
    print_success(f"明细已导出: {details_path}")

    print_section("完成")
    print_success(f"账期结算完成！输出目录: {output_dir.resolve()}")
    print_info(f"账单金额: ¥{bill.total_amount:,.2f}")
    print_info(f"问题数量: {len(billing_period.issues)} 个")
    print_info(f"警告数量: {len(billing_period.warnings)} 个")

    if billing_period.issues:
        print_warning("⚠️  存在问题，请先处理后再提交客户")
        print()


if __name__ == "__main__":
    main()
