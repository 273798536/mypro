#!/usr/bin/env python3
"""微分方程课堂验算 — 命令行工具

常用命令：
  python cli.py list                    列出所有正常记录
  python cli.py list --all              列出所有记录（含撤回、旧版、草稿）
  python cli.py show <id>               看单条记录的验算报告
  python cli.py summary                 看汇总报告
  python cli.py import <json文件>       导入数据文件
  python cli.py gen-samples             生成样例数据
  python cli.py withdraw <id> <原因>    撤回一条记录
  python cli.py note <id> <备注内容>    给记录加备注
  python cli.py report <id> -o <文件>   导出单条报告到文件
"""

import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ode_checker.data_store import DataStore
from ode_checker.error_analysis import ErrorAnalyzer
from ode_checker.report import ReportGenerator
from samples.generate_samples import generate_sample_data


def cmd_list(args):
    store = DataStore(args.data)
    records = store.list_records(
        include_withdrawn=args.all,
        include_legacy=args.all,
        include_superseded=args.all,
        include_drafts=args.all,
    )
    print(f"共 {len(records)} 条记录（数据文件: {args.data}）")
    print("-" * 70)
    for r in records:
        status = r.get("status", "active")
        status_label = {
            "active": "正常", "withdrawn": "撤回", "draft": "草稿",
            "legacy": "旧版", "superseded": "旧版",
        }.get(status, status)
        print(f"  [{status_label}] {r['id']}  {r.get('title', '无标题')}")
        if r.get("notes") and args.verbose:
            for line in r["notes"].strip().split("\n")[:2]:
                print(f"         备注: {line}")
    if not records:
        print("  （空的，试试 gen-samples 生成样例数据）")


def cmd_show(args):
    store = DataStore(args.data)
    record = store.get_record(args.id)
    if not record:
        print(f"找不到记录: {args.id}")
        sys.exit(1)

    analyzer = ErrorAnalyzer(threshold=args.threshold)
    reporter = ReportGenerator(analyzer)
    print(reporter.generate_record_report(record))


def cmd_summary(args):
    store = DataStore(args.data)
    analyzer = ErrorAnalyzer(threshold=args.threshold)
    reporter = ReportGenerator(analyzer)
    print(reporter.generate_summary_report(store.records))


def cmd_import(args):
    if not os.path.exists(args.file):
        print(f"文件不存在: {args.file}")
        sys.exit(1)
    # 直接复制为新的数据文件
    import shutil
    shutil.copy(args.file, args.data)
    print(f"已导入: {args.file} -> {args.data}")
    store = DataStore(args.data)
    print(f"共 {len(store.records)} 条记录")


def cmd_gen_samples(args):
    output = args.output or args.data
    generate_sample_data(output)


def cmd_withdraw(args):
    store = DataStore(args.data)
    try:
        record = store.withdraw_record(args.id, args.reason)
        store.save()
        print(f"已撤回: {record['id']}")
        print(f"原因: {args.reason}")
    except ValueError as e:
        print(f"错误: {e}")
        sys.exit(1)


def cmd_note(args):
    store = DataStore(args.data)
    try:
        record = store.add_note(args.id, args.text)
        store.save()
        print(f"已添加备注到: {record['id']}")
    except ValueError as e:
        print(f"错误: {e}")
        sys.exit(1)


def cmd_report(args):
    store = DataStore(args.data)
    record = store.get_record(args.id)
    if not record:
        print(f"找不到记录: {args.id}")
        sys.exit(1)

    analyzer = ErrorAnalyzer(threshold=args.threshold)
    reporter = ReportGenerator(analyzer)
    report_text = reporter.generate_record_report(record)

    if args.output:
        reporter.save_report(report_text, args.output)
        print(f"报告已保存到: {args.output}")
    else:
        print(report_text)


def main():
    parser = argparse.ArgumentParser(description="微分方程课堂验算工具")
    parser.add_argument("-d", "--data", default="classroom_records.json",
                        help="数据文件路径（默认: classroom_records.json）")
    parser.add_argument("--threshold", type=float, default=0.001,
                        help="误差阈值/及格线（默认: 0.001）")

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # list
    p_list = subparsers.add_parser("list", help="列出记录")
    p_list.add_argument("--all", action="store_true", help="显示全部（含撤回、旧版、草稿）")
    p_list.add_argument("-v", "--verbose", action="store_true", help="显示备注")
    p_list.set_defaults(func=cmd_list)

    # show
    p_show = subparsers.add_parser("show", help="显示单条记录验算报告")
    p_show.add_argument("id", help="记录 ID")
    p_show.set_defaults(func=cmd_show)

    # summary
    p_summary = subparsers.add_parser("summary", help="汇总报告")
    p_summary.set_defaults(func=cmd_summary)

    # import
    p_import = subparsers.add_parser("import", help="导入数据文件")
    p_import.add_argument("file", help="JSON 数据文件路径")
    p_import.set_defaults(func=cmd_import)

    # gen-samples
    p_gen = subparsers.add_parser("gen-samples", help="生成样例数据")
    p_gen.add_argument("-o", "--output", help="输出文件路径")
    p_gen.set_defaults(func=cmd_gen_samples)

    # withdraw
    p_withdraw = subparsers.add_parser("withdraw", help="撤回记录")
    p_withdraw.add_argument("id", help="记录 ID")
    p_withdraw.add_argument("reason", help="撤回原因")
    p_withdraw.set_defaults(func=cmd_withdraw)

    # note
    p_note = subparsers.add_parser("note", help="加备注")
    p_note.add_argument("id", help="记录 ID")
    p_note.add_argument("text", help="备注内容")
    p_note.set_defaults(func=cmd_note)

    # report
    p_report = subparsers.add_parser("report", help="导出报告")
    p_report.add_argument("id", help="记录 ID")
    p_report.add_argument("-o", "--output", help="输出文件路径")
    p_report.set_defaults(func=cmd_report)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    args.func(args)


if __name__ == "__main__":
    main()
