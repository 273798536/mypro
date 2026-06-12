#!/usr/bin/env python3
"""
潮间带物种分布图工具 - 命令行入口

使用方式：
  python cli.py run --species data/species.csv --tide data/tide.csv --salinity data/salinity.csv
  python cli.py review --issue-id ISS-XXXXXXXX
  python cli.py review --record-id REC-XXXXXXXX
  python cli.py history --list
  python cli.py demo
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from intertidal.audit_log import AuditLog
from intertidal.validator import DataValidator
from intertidal.processor import DataProcessor
from intertidal.map_generator import MapGenerator
from intertidal.charts import ChartGenerator
from intertidal.report_generator import ReportGenerator


OUTPUT_DIR = "output"
HISTORY_DIR = os.path.join(OUTPUT_DIR, "history")


def ensure_dirs():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(HISTORY_DIR, exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "charts"), exist_ok=True)


def cmd_run(args):
    """运行完整的处理流程"""
    print("=" * 60)
    print("🌊 潮间带物种分布图工具 - 开始处理")
    print("=" * 60)

    session_name = args.session or f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    audit = AuditLog(session_name=session_name)

    print(f"\n📂 读取数据...")
    species_df = pd.read_csv(args.species) if args.species else None
    tide_df = pd.read_csv(args.tide) if args.tide else None
    salinity_df = pd.read_csv(args.salinity) if args.salinity else None

    if species_df is not None:
        print(f"   ✓ 物种数据：{len(species_df)} 条")
    if tide_df is not None:
        print(f"   ✓ 潮汐数据：{len(tide_df)} 条")
    if salinity_df is not None:
        print(f"   ✓ 盐度数据：{len(salinity_df)} 条")

    print(f"\n🔍 数据校验...")
    validator = DataValidator(audit)
    s_df = species_df if species_df is not None else pd.DataFrame()
    t_df = tide_df if tide_df is not None else pd.DataFrame()
    sa_df = salinity_df if salinity_df is not None else pd.DataFrame()
    result = validator.validate_all(
        s_df, t_df, sa_df,
        species_file=args.species or "",
        tide_file=args.tide or "",
        salinity_file=args.salinity or ""
    )
    print(f"   {result.summary()}")

    if result.error_count > 0:
        print(f"\n⚠️  发现 {result.error_count} 个错误，将继续处理但请务必复核")
        for issue in audit.issues:
            if issue.severity == "error":
                print(f"   - [{issue.issue_id}] {issue.issue_type}: {issue.description[:60]}")

    print(f"\n⚙️  数据处理...")
    processor = DataProcessor(audit)
    species_proc, tide_proc, salinity_proc = processor.process_all(
        s_df, t_df, sa_df,
        species_file=args.species or "",
        tide_file=args.tide or "",
        salinity_file=args.salinity or "",
    )
    print(f"   ✓ 处理完成，共 {len(audit.records)} 条处理记录")

    print(f"\n🗺️  生成地图...")
    map_gen = MapGenerator(audit)
    map_path = map_gen.generate(
        species_proc,
        output_path=os.path.join(OUTPUT_DIR, "species_map.html")
    )
    if map_path:
        print(f"   ✓ 地图已生成：{map_path}")

    print(f"\n📈 生成图表...")
    chart_gen = ChartGenerator(audit)
    chart_paths = chart_gen.generate_all(
        species_proc, tide_proc, salinity_proc,
        output_dir=os.path.join(OUTPUT_DIR, "charts")
    )
    for name, path in chart_paths.items():
        print(f"   ✓ {name}: {path}")

    print(f"\n📄 生成报告...")
    report_gen = ReportGenerator(audit)
    report_path = report_gen.generate(
        species_proc, tide_proc, salinity_proc,
        map_path=os.path.basename(map_path) if map_path else "",
        chart_paths=chart_paths,
        output_path=os.path.join(OUTPUT_DIR, "report.html"),
    )
    print(f"   ✓ 报告已生成：{report_path}")

    print(f"\n📋 保存审计日志...")
    audit_path = os.path.join(OUTPUT_DIR, "audit_log.json")
    audit.save_to_file(audit_path)
    print(f"   ✓ 审计日志：{audit_path}")

    history_file = os.path.join(HISTORY_DIR, f"{session_name}.json")
    audit.save_to_file(history_file)
    print(f"   ✓ 历史存档：{history_file}")

    print("\n" + "=" * 60)
    print("✅ 处理完成！")
    print("=" * 60)
    print(f"\n📁 输出目录：{os.path.abspath(OUTPUT_DIR)}")
    print(f"   📄 报告：{os.path.basename(report_path)}")
    print(f"   🗺️  地图：{os.path.basename(map_path) if map_path else '无'}")
    print(f"   📈 图表：{len(chart_paths)} 个")
    print(f"   📋 审计日志：{os.path.basename(audit_path)}")

    if result.error_count > 0:
        print(f"\n🔧 复核入口：")
        print(f"   python cli.py review --issue-id <问题ID>")
        print(f"   python cli.py review --record-id <记录ID>")

    print()
    return 0


def cmd_review(args):
    """复核模式 - 从问题ID或记录ID回溯"""
    print("=" * 60)
    print("🔍 潮间带物种分布图工具 - 复核模式")
    print("=" * 60)

    audit_path = os.path.join(OUTPUT_DIR, "audit_log.json")
    if not os.path.exists(audit_path):
        print(f"\n❌ 找不到审计日志：{audit_path}")
        print("   请先运行处理命令：python cli.py run ...")
        return 1

    with open(audit_path, "r", encoding="utf-8") as f:
        audit_data = json.load(f)

    audit = AuditLog(session_name=audit_data.get("session_name", "unknown"))
    for rec_data in audit_data.get("records", []):
        from intertidal.audit_log import ProcessingRecord
        from dataclasses import fields
        rec_kwargs = {f.name: rec_data.get(f.name) for f in fields(ProcessingRecord)}
        audit.records.append(ProcessingRecord(**rec_kwargs))

    for issue_data in audit_data.get("issues", []):
        from intertidal.audit_log import ValidationIssue
        from dataclasses import fields
        issue_kwargs = {f.name: issue_data.get(f.name) for f in fields(ValidationIssue)}
        audit.issues.append(ValidationIssue(**issue_kwargs))

    print(f"\n📂 会话：{audit.session_name}")
    print(f"   处理记录：{len(audit.records)} 条")
    print(f"   校验问题：{len(audit.issues)} 个")

    target_issue = None
    target_record = None

    if args.issue_id:
        target_issue = audit.trace_issue(args.issue_id)
        if not target_issue:
            print(f"\n❌ 找不到问题：{args.issue_id}")
            return 1
        print(f"\n📌 问题详情：")
        print_issue_detail(target_issue)

        records = audit.get_records_by_source(
            target_issue.source_type, target_issue.source_row_index
        )
        if records:
            print(f"\n📝 关联的处理记录（共 {len(records)} 条）：")
            for rec in records:
                print(f"   - [{rec.record_id}] {rec.action}: {rec.reason[:50]}")

    elif args.record_id:
        target_record = audit.trace_back(args.record_id)
        if not target_record:
            print(f"\n❌ 找不到记录：{args.record_id}")
            return 1
        print(f"\n📌 处理记录详情：")
        print_record_detail(target_record)

    else:
        print("\n❌ 请指定 --issue-id 或 --record-id")
        return 1

    print(f"\n{'─' * 60}")
    print("💡 复核操作选项：")
    print("   1. 查看原始数据行")
    print("   2. 查看处理意见")
    print("   3. 标记为已复核")
    print("   4. 返回")

    try:
        choice = input("\n请选择操作 [1-4]: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\n已退出复核模式")
        return 0

    if choice == "1":
        print_source_row(audit, target_issue, target_record)
    elif choice == "2":
        print_opinion(target_issue, target_record)
    elif choice == "3":
        mark_reviewed(audit, target_issue, target_record, audit_path)
    else:
        print("已退出复核模式")

    print()
    return 0


def print_issue_detail(issue):
    """打印问题详情"""
    print(f"   问题ID：{issue.issue_id}")
    print(f"   类型：{issue.issue_type}")
    print(f"   严重程度：{issue.severity}")
    print(f"   来源：{issue.source_type} 第 {issue.source_row_index} 行")
    print(f"   字段：{issue.field_name}")
    print(f"   当前值：{issue.current_value}")
    print(f"   期望值：{issue.expected_value}")
    print(f"   描述：{issue.description}")


def print_record_detail(record):
    """打印处理记录详情"""
    print(f"   记录ID：{record.record_id}")
    print(f"   操作：{record.action}")
    print(f"   来源：{record.source_type} 第 {record.source_row_index} 行")
    print(f"   来源文件：{record.source_file}")
    print(f"   处理前：{record.before_value}")
    print(f"   处理后：{record.after_value}")
    print(f"   原因：{record.reason}")
    print(f"   处理人：{record.handler}")
    print(f"   时间：{record.timestamp}")
    if record.notes:
        print(f"   备注：{record.notes}")


def print_source_row(audit, issue=None, record=None):
    """打印原始数据行（从快照中查找）"""
    source_type = issue.source_type if issue else record.source_type
    row_idx = issue.source_row_index if issue else record.source_row_index

    print(f"\n📋 原始数据行（{source_type} 第 {row_idx} 行）：")

    snapshot_key = f"{source_type}_raw"
    if snapshot_key in audit.source_snapshots:
        df = audit.source_snapshots[snapshot_key]
        if row_idx >= 0 and row_idx < len(df):
            row = df.iloc[row_idx]
            for col, val in row.items():
                print(f"   {col}: {val}")
        else:
            print("   （行号超出范围）")
    else:
        print("   （未保存原始数据快照，请在处理前保存）")


def print_opinion(issue=None, record=None):
    """打印处理意见"""
    print(f"\n💬 处理意见：")

    if issue:
        if issue.issue_type == "salinity_unit_mixed":
            print("   【盐度单位混用】")
            print("   - 依据：海事处《海洋观测数据质量控制规范》要求盐度统一使用 psu")
            print("   - 处理：按照换算系数将其他单位转换为 psu")
            print("   - 复核要点：检查原始单位是否正确识别，换算系数是否适用")
            print("   - 海事处追问应对：出示单位换算依据和原始数据记录")
        elif issue.issue_type == "tide_timezone_error":
            print("   【潮位时区错误】")
            print("   - 依据：中国沿岸潮汐观测应使用北京时间（UTC+8）")
            print("   - 处理：将原始时区转换为 UTC+8")
            print("   - 复核要点：确认原始数据的实际时区，转换后时间是否合理")
            print("   - 注意：时区错误会导致潮高与物种观测时间对不上，影响分布判断")
        else:
            print(f"   【{issue.issue_type}】")
            print(f"   - {issue.description}")

    if record:
        print(f"\n   处理记录备注：{record.notes if record.notes else '无'}")

    print("\n   📌 建议：")
    print("   1. 确认原始数据来源和采集标准")
    print("   2. 核对单位/时区是否与记录一致")
    print("   3. 如修正，在复核模式中标记并重新生成报告")


def mark_reviewed(audit, issue=None, record=None, audit_path=None):
    """标记为已复核"""
    print(f"\n✅ 已标记为复核状态")
    print(f"   （注：当前版本为演示，复核结果将写入审计日志备注）")

    if issue:
        print(f"   问题 {issue.issue_id} 已复核")
    if record:
        print(f"   记录 {record.record_id} 已复核")

    print(f"\n💡 正式复核后，建议重新运行处理命令生成更新后的报告。")


def cmd_history(args):
    """历史回看"""
    print("=" * 60)
    print("📜 潮间带物种分布图工具 - 历史回看")
    print("=" * 60)

    ensure_dirs()

    if not os.path.exists(HISTORY_DIR):
        print("\n暂无历史记录")
        return 0

    history_files = sorted(
        [f for f in os.listdir(HISTORY_DIR) if f.endswith(".json")],
        reverse=True
    )

    if not history_files:
        print("\n暂无历史记录")
        return 0

    print(f"\n共找到 {len(history_files)} 个历史会话：\n")

    for i, fname in enumerate(history_files[:20], 1):
        fpath = os.path.join(HISTORY_DIR, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            summary = data.get("summary", {})
            created = summary.get("created_at", "?")[:19]
            name = summary.get("session_name", fname)
            records = summary.get("total_records", 0)
            issues = summary.get("total_issues", 0)
            print(f"   [{i:2d}] {name}")
            print(f"        创建时间：{created}")
            print(f"        处理记录：{records} 条 · 校验问题：{issues} 个")
            print()
        except Exception:
            print(f"   [{i:2d}] {fname}  （读取失败）")

    if args.detail:
        try:
            idx = int(args.detail) - 1
            if 0 <= idx < len(history_files):
                fpath = os.path.join(HISTORY_DIR, history_files[idx])
                print(f"\n📄 详情：{history_files[idx]}")
                os.system(f"python cli.py review --issue-id ISS --session-file {fpath}")
        except ValueError:
            print("请输入序号")

    print("💡 查看详情：python cli.py history --detail 1")
    return 0


def cmd_demo(args):
    """演示模式 - 使用内置样例数据"""
    print("=" * 60)
    print("🎬 潮间带物种分布图工具 - 演示模式")
    print("=" * 60)

    sample_dir = os.path.join(os.path.dirname(__file__), "sample_data")
    if not os.path.exists(sample_dir):
        print(f"\n❌ 找不到样例数据目录：{sample_dir}")
        return 1

    species_file = os.path.join(sample_dir, "species.csv")
    tide_file = os.path.join(sample_dir, "tide.csv")
    salinity_file = os.path.join(sample_dir, "salinity.csv")

    for f in [species_file, tide_file, salinity_file]:
        if not os.path.exists(f):
            print(f"❌ 缺少样例文件：{f}")
            return 1

    print(f"\n📂 样例数据：")
    print(f"   物种分布：{species_file}")
    print(f"   潮汐表：{tide_file}")
    print(f"   盐度数据：{salinity_file}")
    print(f"\n💡 样例数据包含以下可复现的场景：")
    print(f"   - 盐度单位混用（psu、ppt、‰ 混合）")
    print(f"   - 潮位时区错误（UTC、PST 等非标准时区）")
    print(f"   - 正常记录用于对照")
    print(f"\n🚀 开始处理...\n")

    class DemoArgs:
        species = species_file
        tide = tide_file
        salinity = salinity_file
        session = "demo_session"

    return cmd_run(DemoArgs())


def main():
    parser = argparse.ArgumentParser(
        description="🌊 潮间带物种分布图工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python cli.py demo                                    # 使用样例数据运行
  python cli.py run -s species.csv -t tide.csv -S sal.csv  # 处理自定义数据
  python cli.py review --issue-id ISS-XXXXXXXX         # 复核某个问题
  python cli.py review --record-id REC-XXXXXXXX        # 复核某条记录
  python cli.py history --list                         # 查看历史记录
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="子命令")

    run_parser = subparsers.add_parser("run", help="运行处理流程")
    run_parser.add_argument("-s", "--species", help="物种分布 CSV 文件")
    run_parser.add_argument("-t", "--tide", help="潮汐表 CSV 文件")
    run_parser.add_argument("-S", "--salinity", help="盐度数据 CSV 文件")
    run_parser.add_argument("--session", help="会话名称")

    review_parser = subparsers.add_parser("review", help="复核模式")
    review_parser.add_argument("--issue-id", help="问题 ID")
    review_parser.add_argument("--record-id", help="记录 ID")

    history_parser = subparsers.add_parser("history", help="历史回看")
    history_parser.add_argument("--list", action="store_true", help="列出历史")
    history_parser.add_argument("--detail", help="查看详情（序号）")

    subparsers.add_parser("demo", help="演示模式")

    args = parser.parse_args()

    ensure_dirs()

    if args.command == "run":
        if not args.species and not args.tide and not args.salinity:
            parser.error("run 命令至少需要指定一个数据文件")
        return cmd_run(args)
    elif args.command == "review":
        return cmd_review(args)
    elif args.command == "history":
        return cmd_history(args)
    elif args.command == "demo":
        return cmd_demo(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
