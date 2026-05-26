import argparse
import json
import sys
import os
from typing import Optional

from .models import ImportConflictStrategy
from .storage import DataStore
from .importer import DataImporter
from .snapshot import SnapshotManager
from .engine import RebateEngine
from .report import ReportExporter


def _format_import_result(result) -> str:
    lines = []
    s = result.summary
    lines.append(f"  新增: {s['added']}")
    lines.append(f"  跳过: {s['skipped']}")
    lines.append(f"  覆盖: {s['overwritten']}")
    lines.append(f"  追加: {s['appended']}")
    lines.append(f"  错误: {s['errors']}")
    if result.skipped:
        for item, reason in result.skipped[:5]:
            lines.append(f"    [跳过] {item}: {reason}")
    if result.overwritten:
        for item, prev in result.overwritten[:5]:
            lines.append(f"    [覆盖] {item}: 旧版本 {prev}")
    if result.appended:
        for item, note in result.appended[:5]:
            lines.append(f"    [追加] {item}: {note}")
    if result.errors:
        for err in result.errors[:10]:
            lines.append(f"    [错误] {err}")
    return "\n".join(lines)


def cmd_import(args):
    store = DataStore(args.data_dir)
    importer = DataImporter(store)
    strategy = ImportConflictStrategy(args.strategy)

    if not os.path.exists(args.file):
        print(f"文件不存在: {args.file}")
        sys.exit(1)

    with open(args.file, encoding="utf-8") as f:
        data = json.load(f)

    result = importer.import_data(data, args.file, strategy)
    store.save()

    print(f"导入完成 - {args.file}")
    print(f"策略: {args.strategy}")
    print(_format_import_result(result))


def cmd_calculate(args):
    store = DataStore(args.data_dir)
    engine = RebateEngine(store)

    if args.week:
        weeks = [args.week]
    else:
        weeks = store.get_all_weeks()

    if not weeks:
        print("没有找到交易数据")
        return

    all_anomalies = []

    for week in weeks:
        result = engine.calculate_week(week)
        store.save()

        print(f"\n{'='*60}")
        print(f"第 {week} 周计算结果")
        print(f"{'='*60}")
        print(f"  账号数: {len(result.records)}")
        print(f"  正常返佣: {result.to_dict()['total_rebate']:.4f}")
        print(f"  异常数: {len(result.anomalies)}")

        if result.anomalies:
            all_anomalies.extend(result.anomalies)
            print(f"\n  ⚠ 异常检测:")
            for a in result.anomalies:
                sev = a.get("severity", "info")
                icon = "🔴" if sev == "high" else "🟡" if sev == "medium" else "ℹ️"
                print(f"    {icon} [{a.get('account_id', '')}] {a.get('description', '')}")

        for record in result.records:
            if record.status.value == "valid":
                store.rebates.setdefault(record.account_id, []).append(record)

    store.save()

    if all_anomalies:
        print(f"\n{'='*60}")
        print(f"汇总: 共 {len(all_anomalies)} 条异常需要关注")
        print(f"{'='*60}")


def cmd_recalculate(args):
    store = DataStore(args.data_dir)
    engine = RebateEngine(store)

    if args.account:
        record = engine.recalculate_account(args.account, args.week)
        store.save()
        if record:
            print(f"重算完成: {args.account} @ {args.week}")
            print(f"  基础返佣: {record.base_rebate:.4f}")
            print(f"  调整后返佣: {record.adjusted_rebate:.4f}")
            if record.anomalies:
                print(f"  异常:")
                for a in record.anomalies:
                    print(f"    - {a.get('description', '')}")
        else:
            print(f"无法计算: {args.account} @ {args.week}")
    elif args.week:
        result = engine.recalculate_week(args.week)
        store.save()
        print(f"重算完成: 第 {args.week} 周")
        print(f"  记录数: {len(result.records)}")
        if result.anomalies:
            print(f"  异常数: {len(result.anomalies)}")


def cmd_cancel(args):
    store = DataStore(args.data_dir)
    engine = RebateEngine(store)

    result = engine.cancel_trade(args.account, args.week, args.reason)
    store.save()

    if result:
        print(f"成交已撤销: {args.account} @ {args.week}")
        if args.reason:
            print(f"  原因: {args.reason}")
    else:
        print(f"撤销失败: 未找到数据")


def cmd_compensate(args):
    store = DataStore(args.data_dir)
    engine = RebateEngine(store)

    result = engine.compensate_cancellation(
        args.account, args.week, args.amount, args.reason
    )
    store.save()

    print(f"补偿已记录: {args.account} @ {args.week}")
    print(f"  金额: {args.amount}")
    print(f"  原因: {args.reason}")


def cmd_snapshot(args):
    store = DataStore(args.data_dir)
    mgr = SnapshotManager(store)

    if args.tiers:
        snapshots = mgr.snapshot_tiers_for_week(args.week)
        store.save()
        print(f"档位快照已创建: {len(snapshots)} 条 @ {args.week}")

    if args.referral:
        snap = mgr.snapshot_referral_for_account_week(args.account, args.week)
        store.save()
        if snap:
            print(f"邀请关系快照: {args.account} @ {args.week}")
        else:
            print(f"未找到邀请关系: {args.account} @ {args.week}")


def cmd_report(args):
    store = DataStore(args.data_dir)
    exporter = ReportExporter(store)

    output_dir = args.output or "./reports"

    if args.format == "json":
        path = exporter.export_report_json(args.week, output_dir)
        print(f"报告已导出: {path}")
    elif args.format == "csv":
        path = exporter.export_report_csv(args.week, output_dir)
        print(f"报告已导出: {path}")
    elif args.format == "anomaly":
        path = exporter.export_anomaly_report_csv(args.week, output_dir)
        print(f"异常报告已导出: {path}")
    elif args.format == "all":
        p1 = exporter.export_report_json(args.week, output_dir)
        p2 = exporter.export_report_csv(args.week, output_dir)
        p3 = exporter.export_anomaly_report_csv(args.week, output_dir)
        print(f"报告已导出:\n  JSON: {p1}\n  CSV: {p2}\n  异常: {p3}")


def cmd_status(args):
    store = DataStore(args.data_dir)

    weeks = store.get_all_weeks()
    print(f"数据目录: {args.data_dir}")
    print(f"账号数: {len(store.accounts)}")
    print(f"有数据的周: {', '.join(weeks) if weeks else '(无)'}")

    if args.week:
        accounts = store.get_accounts_for_week(args.week)
        print(f"\n第 {args.week} 周:")
        print(f"  账号数: {len(accounts)}")
        for acc_id in accounts:
            vol = store.get_volume_for_week(acc_id, args.week)
            ref = store.get_referral_for_week(acc_id, args.week)
            tier = store.get_tier_for_volume(args.week, vol.trade_amount) if vol else None
            print(f"  {acc_id}: 成交={vol.trade_amount if vol else 'N/A'}, "
                  f"邀请人={ref.inviter_id if ref else 'N/A'}, "
                  f"档位={tier.tier_name if tier else 'N/A'}")


def cmd_history(args):
    store = DataStore(args.data_dir)
    mgr = SnapshotManager(store)

    if args.type == "tier":
        history = mgr.get_tier_history(args.name)
        if history:
            print(f"档位历史: {args.name}")
            for h in history:
                print(f"  {h['week']}: 成交量 {h['volume_min']}-{h['volume_max']}, "
                      f"费率 {h['fee_rate']}, 返佣率 {h['rebate_rate']}, 来源 {h['source']}")
        else:
            print(f"未找到档位: {args.name}")
    elif args.type == "referral":
        history = mgr.get_referral_history(args.name)
        if history:
            print(f"邀请关系历史: {args.name}")
            for h in history:
                print(f"  {h['week']}: 邀请人 {h['inviter_id']}, "
                      f"生效 {h['effective_from']}-{h['effective_to'] or '至今'}, "
                      f"v{h['version']}, 来源 {h['source']}")
        else:
            print(f"未找到账号: {args.name}")


def main():
    parser = argparse.ArgumentParser(
        prog="rebate",
        description="交易所手续费返佣核算工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  rebate import data.json                  # 导入数据
  rebate import data.json --strategy overwrite  # 覆盖导入
  rebate calculate --week 2024-W01         # 计算指定周
  rebate calculate                         # 计算所有周
  rebate report --week 2024-W01 --format csv   # 导出CSV报告
  rebate cancel --account A001 --week 2024-W01  # 撤销成交
  rebate compensate --account A001 --week 2024-W01 --amount 100  # 补偿
        """,
    )
    parser.add_argument("--data-dir", default="./rebate_data", help="数据存储目录")

    subparsers = parser.add_subparsers(dest="command", help="子命令")

    import_parser = subparsers.add_parser("import", help="导入数据")
    import_parser.add_argument("file", help="JSON数据文件路径")
    import_parser.add_argument(
        "--strategy", "-s",
        choices=["skip", "overwrite", "append"],
        default="skip",
        help="重复数据处理策略: skip=跳过, overwrite=覆盖, append=追加",
    )

    calc_parser = subparsers.add_parser("calculate", help="计算返佣")
    calc_parser.add_argument("--week", "-w", help="指定周 (如 2024-W01), 不指定则计算所有周")

    recalc_parser = subparsers.add_parser("recalculate", help="重算返佣")
    recalc_parser.add_argument("--week", "-w", required=True, help="指定周")
    recalc_parser.add_argument("--account", "-a", help="指定账号, 不指定则重算整个周")

    cancel_parser = subparsers.add_parser("cancel", help="撤销成交")
    cancel_parser.add_argument("--account", "-a", required=True, help="账号ID")
    cancel_parser.add_argument("--week", "-w", required=True, help="周")
    cancel_parser.add_argument("--reason", "-r", default="", help="撤销原因")

    comp_parser = subparsers.add_parser("compensate", help="撤销补偿")
    comp_parser.add_argument("--account", "-a", required=True, help="账号ID")
    comp_parser.add_argument("--week", "-w", required=True, help="周")
    comp_parser.add_argument("--amount", required=True, type=float, help="补偿金额")
    comp_parser.add_argument("--reason", "-r", default="", help="补偿原因")

    snap_parser = subparsers.add_parser("snapshot", help="创建快照")
    snap_parser.add_argument("--week", "-w", required=True, help="周")
    snap_parser.add_argument("--tiers", action="store_true", help="创建档位快照")
    snap_parser.add_argument("--referral", action="store_true", help="创建邀请关系快照")
    snap_parser.add_argument("--account", "-a", help="账号ID (邀请关系快照时需要)")

    report_parser = subparsers.add_parser("report", help="导出报告")
    report_parser.add_argument("--week", "-w", required=True, help="周")
    report_parser.add_argument(
        "--format", "-f",
        choices=["json", "csv", "anomaly", "all"],
        default="csv",
        help="导出格式",
    )
    report_parser.add_argument("--output", "-o", help="输出目录")

    status_parser = subparsers.add_parser("status", help="查看状态")
    status_parser.add_argument("--week", "-w", help="查看指定周详情")

    hist_parser = subparsers.add_parser("history", help="查看历史")
    hist_parser.add_argument("--type", "-t", choices=["tier", "referral"], required=True)
    hist_parser.add_argument("--name", "-n", required=True, help="档位名称或账号ID")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    commands = {
        "import": cmd_import,
        "calculate": cmd_calculate,
        "recalculate": cmd_recalculate,
        "cancel": cmd_cancel,
        "compensate": cmd_compensate,
        "snapshot": cmd_snapshot,
        "report": cmd_report,
        "status": cmd_status,
        "history": cmd_history,
    }

    cmd_func = commands.get(args.command)
    if cmd_func:
        cmd_func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
