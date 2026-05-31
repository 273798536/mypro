#!/usr/bin/env python3
import argparse
import sys
from datetime import date, datetime, timedelta
from typing import List

from models import (
    Rack, PUEFactor, MeterReading, TimeOfUsePrice,
    RackStatus, ReadingSource
)
from core import DataStore, Calculator
from analyzer import MigrationAnalyzer, GapAnalyzer, DifferenceExplainer
from reporter import Reporter


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_alert(message: str):
    print("\n" + "!" * 70)
    print(f"  ⚠️  {message}")
    print("!" * 70)


def print_section(title: str):
    print("\n" + "-" * 70)
    print(f"  {title}")
    print("-" * 70)


def setup_default_prices(store: DataStore):
    store.tou_prices = [
        TimeOfUsePrice("尖峰", 10, 12, 1.5, is_peak=True),
        TimeOfUsePrice("尖峰", 19, 21, 1.5, is_peak=True),
        TimeOfUsePrice("高峰", 8, 10, 1.2, is_peak=True),
        TimeOfUsePrice("高峰", 12, 14, 1.2, is_peak=True),
        TimeOfUsePrice("高峰", 17, 19, 1.2, is_peak=True),
        TimeOfUsePrice("高峰", 21, 23, 1.2, is_peak=True),
        TimeOfUsePrice("平段", 6, 8, 0.8, is_peak=False),
        TimeOfUsePrice("平段", 14, 17, 0.8, is_peak=False),
        TimeOfUsePrice("平段", 23, 24, 0.8, is_peak=False),
        TimeOfUsePrice("谷段", 0, 6, 0.4, is_peak=False),
    ]


def load_sample_data(store: DataStore):
    print_header("加载示例数据")

    d1 = date(2026, 5, 1)
    d15 = date(2026, 5, 15)
    d16 = date(2026, 5, 16)
    d31 = date(2026, 5, 31)

    racks = [
        Rack("R001", "客户A", "A-01-01", 5.0, RackStatus.ACTIVE, d1),
        Rack("R002", "客户A", "A-01-02", 5.0, RackStatus.ACTIVE, d1),
        Rack("R003", "客户B", "B-02-01", 8.0, RackStatus.ACTIVE, d1, d15, migrated_to="B-03-01"),
        Rack("R003", "客户B", "B-03-01", 8.0, RackStatus.ACTIVE, d16, None, migrated_from="B-02-01"),
        Rack("R004", "客户C", "C-01-01", 6.0, RackStatus.ACTIVE, d1),
        Rack("R005", "", "D-01-01", -5.0, RackStatus.ACTIVE, d1),
    ]

    for rack in racks:
        issue = store.add_rack(rack)
        if issue:
            print(f"  [警告] 机柜{rack.rack_id}: {issue.message}")

    pue_values = [
        PUEFactor(date=date(2026, 5, 1), pue_value=1.35, maintained_by="运维组"),
        PUEFactor(date=date(2026, 5, 10), pue_value=99.0, maintained_by="运维组"),
        PUEFactor(date=date(2026, 5, 20), pue_value=1.38, maintained_by="运维组"),
    ]

    for pue in pue_values:
        issue = store.add_pue(pue)
        if issue:
            print(f"  [警告] PUE{pue.pue_id}: {issue.message}")

    readings = []
    for i in range(1, 32):
        d = date(2026, 5, i)
        base_time = datetime(2026, 5, i, 9, 0, 0)

        readings.extend([
            MeterReading(rack_id="R001", reading_date=d,
                         start_kwh=1000 + i * 24, end_kwh=1000 + (i + 1) * 24,
                         read_at=base_time, source=ReadingSource.AUTO,
                         recorded_by="系统"),
            MeterReading(rack_id="R002", reading_date=d,
                         start_kwh=800 + i * 20, end_kwh=800 + (i + 1) * 20,
                         read_at=base_time, source=ReadingSource.AUTO,
                         recorded_by="系统"),
            MeterReading(rack_id="R003", reading_date=d,
                         start_kwh=2000 + i * 30, end_kwh=2000 + (i + 1) * 30,
                         read_at=base_time, source=ReadingSource.MANUAL,
                         recorded_by="张三"),
        ])

    readings.append(MeterReading(
        rack_id="R004", reading_date=date(2026, 5, 1),
        start_kwh=1500, end_kwh=1400,
        read_at=datetime(2026, 5, 1, 9, 0),
        source=ReadingSource.MANUAL, recorded_by="李四"
    ))

    readings.append(MeterReading(
        rack_id="R999", reading_date=date(2026, 5, 1),
        start_kwh=100, end_kwh=120,
        read_at=datetime(2026, 5, 1, 9, 0),
        source=ReadingSource.MANUAL, recorded_by="王五"
    ))

    readings.append(MeterReading(
        rack_id="R004", reading_date=date(2026, 5, 3),
        start_kwh=1500, end_kwh=1500,
        read_at=datetime(2026, 5, 3, 9, 0),
        source=ReadingSource.MANUAL, recorded_by="李四"
    ))

    for i in range(1, 10):
        d = date(2026, 5, i)
        readings.append(MeterReading(
            rack_id="R004", reading_date=d,
            start_kwh=1500 + i * 18, end_kwh=1500 + (i + 1) * 18,
            read_at=datetime(2026, 5, i, 9, 0),
            source=ReadingSource.AUTO, recorded_by="系统"
        ))

    for i in range(12, 32):
        d = date(2026, 5, i)
        readings.append(MeterReading(
            rack_id="R004", reading_date=d,
            start_kwh=1700 + i * 18, end_kwh=1700 + (i + 1) * 18,
            read_at=datetime(2026, 5, i, 9, 0),
            source=ReadingSource.AUTO, recorded_by="系统"
        ))

    readings.append(MeterReading(
        rack_id="R001", reading_date=date(2026, 5, 15),
        start_kwh=1365, end_kwh=1390,
        read_at=datetime(2026, 5, 16, 14, 0),
        source=ReadingSource.SUPPLEMENT, is_supplement=True,
        recorded_by="补录员", remarks="昨日漏抄，今日补录"
    ))

    for reading in readings:
        issue = store.add_reading(reading)
        if issue and issue.severity == "error":
            print(f"  [错误] 抄表{reading.reading_id}: {issue.message}")
        elif issue and issue.severity == "warning":
            print(f"  [警告] 抄表{reading.reading_id}: {issue.message}")

    print(f"\n  已加载: {len(store.racks)} 个有效机柜, "
          f"{len(store.pue_factors)} 个有效PUE, "
          f"{len(store.readings)} 条有效抄表")
    print(f"  坏行记录: {len(store.bad_rows)} 条")


def run_calculation(store: DataStore, start_date: date, end_date: date,
                    export: bool = True):
    print_header(f"电费分摊计算: {start_date} ~ {end_date}")

    calculator = Calculator(store)
    charges, calc_issues = calculator.calculate_charges(start_date, end_date)

    if calc_issues:
        print_section("计算过程问题")
        for issue in calc_issues:
            icon = "❌" if issue.severity == "error" else "⚠️"
            print(f"  {icon} [{issue.severity}] {issue.message}")

    migration_analyzer = MigrationAnalyzer(store)
    migrations = migration_analyzer.detect_cross_day_migrations(start_date, end_date)
    cross_day = [m for m in migrations if m.cross_day]

    gap_analyzer = GapAnalyzer(store)
    gaps = gap_analyzer.detect_meter_gaps(start_date, end_date)
    unresolved = [g for g in gaps if not g.is_resolved]

    if cross_day:
        print_alert("发现迁柜跨日记录！必须人工核对")
        for m in cross_day:
            print(f"\n  🔴 迁柜ID: {m.migration_id}")
            print(f"     客户: {m.customer} | 机柜: {m.rack_id}")
            print(f"     {m.old_location} → {m.new_location}")
            print(f"     日期: {m.migration_date} | 缺口: {m.gap_hours}小时")
            print(f"     影响抄表: {m.affected_readings}")
            print(f"     处理建议: 请确认迁柜当日电费归属和缺口小时数分摊方式")

    if unresolved:
        print_alert("发现抄表缺口！必须人工处理")
        for g in unresolved[:5]:
            rack = store.racks.get(g.rack_id)
            customer = rack.customer if rack else "未知"
            print(f"\n  🔴 缺口ID: {g.gap_id}")
            print(f"     客户: {customer} | 机柜: {g.rack_id}")
            print(f"     时间: {g.gap_start} → {g.gap_end}")
            print(f"     缺口: {g.gap_hours}小时 | 预估耗电: {g.estimated_consumption}kWh")
            print(f"     前次抄表: {g.previous_reading_id} | 后次抄表: {g.next_reading_id}")
            print(f"     处理建议: 请补录抄表或说明缺口原因")
        if len(unresolved) > 5:
            print(f"\n  ... 还有 {len(unresolved) - 5} 笔抄表缺口，详见导出报表")

    explainer = DifferenceExplainer(store)
    explanations = explainer.explain_differences(charges, start_date, end_date)

    print_section("电费分摊汇总")
    total_cost = sum(c.total_cost for c in charges)
    total_kwh = sum(c.final_kwh for c in charges)
    customers = set(c.customer for c in charges)

    print(f"  客户数量: {len(customers)}")
    print(f"  分摊记录: {len(charges)} 条")
    print(f"  总分摊电量: {total_kwh:,.2f} kWh")
    print(f"  总电费: {total_cost:,.2f} 元")

    for exp in explanations:
        s = exp['summary']
        print(f"\n  【{exp['customer']}】")
        print(f"    有效天数: {s['total_days']} 天 | 活跃机柜: {s['active_racks']} 台")
        print(f"    分摊电量: {s['total_kwh']:,.2f} kWh")
        print(f"    电费合计: {s['total_cost']:,.2f} 元 (峰: {s['peak_cost']:,.2f} / 谷: {s['offpeak_cost']:,.2f})")
        for note in exp['notes']:
            print(f"    {note}")

        if exp.get('reading_versions'):
            print(f"    📝 补充抄表记录: {len(exp['reading_versions'])} 笔")
            for rv in exp['reading_versions']:
                print(f"       - {rv['date']} 机柜{rv['rack_id']}: "
                      f"{len(rv['versions'])} 个版本")

    if store.bad_rows:
        print_section("坏行记录（已排除，不影响正常计算）")
        error_count = sum(1 for br in store.bad_rows
                          if any(i.severity == "error" for i in br.issues))
        print(f"  共 {len(store.bad_rows)} 条坏行，其中严重错误 {error_count} 条")
        for br in store.bad_rows[:5]:
            print(f"\n  [{br.row_type}] {br.row_id} | 排除: {'是' if br.excluded_from_calc else '否'}")
            for issue in br.issues:
                icon = "❌" if issue.severity == "error" else "⚠️"
                print(f"    {icon} {issue.issue_type}: {issue.message}")
        if len(store.bad_rows) > 5:
            print(f"\n  ... 还有 {len(store.bad_rows) - 5} 条坏行，详见 bad_rows.csv")

    if export:
        print_section("导出报表")
        reporter = Reporter()
        files = reporter.export_summary_excel(
            charges, explanations, store.bad_rows,
            store.gaps, store.migrations
        )
        print(f"  报表已导出到 reports/ 目录:")
        for key, path in files.items():
            print(f"    - {key}: {path}")

    return charges, explanations


def cmd_calculate(args):
    store = DataStore()
    setup_default_prices(store)

    if args.sample:
        load_sample_data(store)

    start_date = args.start or date.today().replace(day=1)
    end_date = args.end or date.today()

    run_calculation(store, start_date, end_date, export=not args.no_export)


def cmd_check_gaps(args):
    store = DataStore()
    setup_default_prices(store)

    if args.sample:
        load_sample_data(store)

    start_date = args.start or date.today().replace(day=1)
    end_date = args.end or date.today()

    print_header(f"抄表缺口检查: {start_date} ~ {end_date}")

    gap_analyzer = GapAnalyzer(store)
    gaps = gap_analyzer.detect_meter_gaps(start_date, end_date, args.max_gap)

    if not gaps:
        print("✅ 未发现抄表缺口")
        return

    unresolved = [g for g in gaps if not g.is_resolved]
    print(f"发现 {len(gaps)} 笔抄表缺口，其中未解决 {len(unresolved)} 笔")

    for g in gaps:
        rack = store.racks.get(g.rack_id)
        customer = rack.customer if rack else "未知"
        status = "✅ 已解决" if g.is_resolved else "🔴 待处理"
        prev_reading = store.readings.get(g.previous_reading_id)
        next_reading = store.readings.get(g.next_reading_id)
        prev_end = prev_reading.end_kwh if prev_reading else 'N/A'
        next_start = next_reading.start_kwh if next_reading else 'N/A'
        print(f"\n  {status}")
        print(f"  缺口ID: {g.gap_id}")
        print(f"  客户: {customer} | 机柜: {g.rack_id}")
        print(f"  时间: {g.gap_start} → {g.gap_end}")
        print(f"  缺口时长: {g.gap_hours} 小时")
        print(f"  前次抄表: {g.previous_reading_id} (止度: {prev_end})")
        print(f"  后次抄表: {g.next_reading_id} (起度: {next_start})")
        print(f"  预估耗电: {g.estimated_consumption} kWh")
        if g.resolve_note:
            print(f"  解决说明: {g.resolve_note}")


def cmd_check_migrations(args):
    store = DataStore()
    setup_default_prices(store)

    if args.sample:
        load_sample_data(store)

    start_date = args.start or date.today().replace(day=1)
    end_date = args.end or date.today()

    print_header(f"迁柜记录检查: {start_date} ~ {end_date}")

    migration_analyzer = MigrationAnalyzer(store)
    migrations = migration_analyzer.detect_cross_day_migrations(start_date, end_date)

    if not migrations:
        print("✅ 未发现迁柜记录")
        return

    cross_day = [m for m in migrations if m.cross_day]
    print(f"发现 {len(migrations)} 笔迁柜记录，其中跨日 {len(cross_day)} 笔")

    for m in migrations:
        status = "🔴 跨日迁移" if m.cross_day else "✅ 正常迁移"
        print(f"\n  {status}")
        print(f"  迁柜ID: {m.migration_id}")
        print(f"  客户: {m.customer} | 机柜: {m.rack_id}")
        print(f"  {m.old_location} → {m.new_location}")
        print(f"  日期: {m.migration_date}")
        print(f"  缺口: {m.gap_hours} 小时")
        if m.affected_readings:
            print(f"  影响抄表: {m.affected_readings}")
        if m.cross_day:
            print(f"  ⚠️  处理建议: 请确认迁柜当日电费归属和缺口小时数分摊方式")


def cmd_list_bad_rows(args):
    store = DataStore()
    setup_default_prices(store)

    if args.sample:
        load_sample_data(store)

    print_header("坏行记录列表")

    if not store.bad_rows:
        print("✅ 没有坏行记录")
        return

    by_type = {}
    for br in store.bad_rows:
        by_type.setdefault(br.row_type, []).append(br)

    for row_type, rows in by_type.items():
        print(f"\n【{row_type}】共 {len(rows)} 条")
        for br in rows:
            has_error = any(i.severity == "error" for i in br.issues)
            status = "❌ 严重错误" if has_error else "⚠️ 警告"
            print(f"\n  {status} | 排除: {'是' if br.excluded_from_calc else '否'}")
            print(f"  记录ID: {br.row_id}")
            for issue in br.issues:
                print(f"    - [{issue.severity}] {issue.issue_type}: {issue.message}")
            if issue.details:
                print(f"    详情: {issue.details}")


def cmd_export(args):
    store = DataStore()
    setup_default_prices(store)

    if args.sample:
        load_sample_data(store)

    start_date = args.start or date.today().replace(day=1)
    end_date = args.end or date.today()

    print_header(f"导出报表: {start_date} ~ {end_date}")

    calculator = Calculator(store)
    charges, _ = calculator.calculate_charges(start_date, end_date)

    explainer = DifferenceExplainer(store)
    explanations = explainer.explain_differences(charges, start_date, end_date)

    reporter = Reporter(args.output_dir)

    if args.type == 'all' or args.type == 'charges':
        path = reporter.export_charges_csv(charges)
        print(f"  ✅ 电费分摊: {path}")

    if args.type == 'all' or args.type == 'details':
        path = reporter.export_price_details_csv(charges)
        print(f"  ✅ 峰谷明细: {path}")

    if args.type == 'all' or args.type == 'bad':
        path = reporter.export_bad_rows_csv(store.bad_rows)
        print(f"  ✅ 坏行记录: {path}")

    if args.type == 'all' or args.type == 'gaps':
        path = reporter.export_gaps_csv(store.gaps)
        print(f"  ✅ 抄表缺口: {path}")

    if args.type == 'all' or args.type == 'migrations':
        path = reporter.export_migrations_csv(store.migrations)
        print(f"  ✅ 迁柜记录: {path}")

    if args.type == 'all' or args.type == 'summary':
        files = reporter.export_summary_excel(
            charges, explanations, store.bad_rows,
            store.gaps, store.migrations, args.filename
        )
        print(f"  ✅ 完整报告:")
        for key, path in files.items():
            print(f"     - {key}: {path}")


def main():
    parser = argparse.ArgumentParser(
        description="数据中心电费分摊工具\n\n"
                    "核心功能：电费分摊、峰谷计价、差异说明\n"
                    "重点检测：迁柜跨日、抄表缺口、坏行数据\n\n"
                    "使用示例：\n"
                    "  python cli.py calculate --sample --start 2026-05-01 --end 2026-05-31\n"
                    "  python cli.py check-gaps --sample\n"
                    "  python cli.py check-migrations --sample\n"
                    "  python cli.py list-bad-rows --sample\n"
                    "  python cli.py export --sample --type all",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    calc_parser = subparsers.add_parser("calculate", help="执行电费分摊计算")
    calc_parser.add_argument("--start", type=date.fromisoformat, help="开始日期 YYYY-MM-DD")
    calc_parser.add_argument("--end", type=date.fromisoformat, help="结束日期 YYYY-MM-DD")
    calc_parser.add_argument("--sample", action="store_true", help="使用示例数据")
    calc_parser.add_argument("--no-export", action="store_true", help="不导出报表")
    calc_parser.set_defaults(func=cmd_calculate)

    gaps_parser = subparsers.add_parser("check-gaps", help="检查抄表缺口")
    gaps_parser.add_argument("--start", type=date.fromisoformat, help="开始日期")
    gaps_parser.add_argument("--end", type=date.fromisoformat, help="结束日期")
    gaps_parser.add_argument("--sample", action="store_true", help="使用示例数据")
    gaps_parser.add_argument("--max-gap", type=float, default=26.0, help="最大允许间隔小时数")
    gaps_parser.set_defaults(func=cmd_check_gaps)

    mig_parser = subparsers.add_parser("check-migrations", help="检查迁柜记录（含跨日）")
    mig_parser.add_argument("--start", type=date.fromisoformat, help="开始日期")
    mig_parser.add_argument("--end", type=date.fromisoformat, help="结束日期")
    mig_parser.add_argument("--sample", action="store_true", help="使用示例数据")
    mig_parser.set_defaults(func=cmd_check_migrations)

    bad_parser = subparsers.add_parser("list-bad-rows", help="列出坏行记录")
    bad_parser.add_argument("--sample", action="store_true", help="使用示例数据")
    bad_parser.set_defaults(func=cmd_list_bad_rows)

    exp_parser = subparsers.add_parser("export", help="导出报表")
    exp_parser.add_argument("--start", type=date.fromisoformat, help="开始日期")
    exp_parser.add_argument("--end", type=date.fromisoformat, help="结束日期")
    exp_parser.add_argument("--sample", action="store_true", help="使用示例数据")
    exp_parser.add_argument("--type", choices=['all', 'charges', 'details', 'bad', 'gaps', 'migrations', 'summary'],
                            default='all', help="导出类型")
    exp_parser.add_argument("--output-dir", default="reports", help="输出目录")
    exp_parser.add_argument("--filename", help="文件名前缀")
    exp_parser.set_defaults(func=cmd_export)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
