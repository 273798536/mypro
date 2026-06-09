"""CLI 入口。"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List, Optional

from .pipeline import InspectionPipeline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sp-inspector",
        description="图论最短路巡检 CLI 工具 — 用于排课巡检校验",
    )
    sub = parser.add_subparsers(dest="command", help="可用子命令")

    # run
    run_p = sub.add_parser("run", help="执行巡检")
    run_p.add_argument("-i", "--input", required=True, help="输入目录（存放图 JSON 和可选 drafts/ 子目录）")
    run_p.add_argument("-o", "--output", required=True, help="输出目录（结果、报告、历史）")
    run_p.add_argument("--operator", default="排课老师", help="操作员名称")
    run_p.add_argument(
        "--fail-on-missing-draft",
        action="store_true",
        help="缺草稿时直接失败该图（默认跳过草稿校验继续算）",
    )

    # confirm
    conf_p = sub.add_parser("confirm", help="人工确认/驳回某个图的结果")
    conf_p.add_argument("-i", "--input", required=True, help="输入目录")
    conf_p.add_argument("-o", "--output", required=True, help="输出目录")
    conf_p.add_argument("-g", "--graph", required=True, help="graph_id")
    conf_action = conf_p.add_mutually_exclusive_group(required=True)
    conf_action.add_argument("-a", "--approve", action="store_true", help="批准该结果")
    conf_action.add_argument("-r", "--reject", action="store_true", help="驳回该结果")
    conf_p.add_argument("--operator", default="排课老师", help="操作员名称")
    conf_p.add_argument("-m", "--comment", help="备注")

    # list
    list_p = sub.add_parser("list", help="列出待处理项")
    list_p.add_argument("-i", "--input", required=True, help="输入目录")
    list_p.add_argument("-o", "--output", required=True, help="输出目录")
    list_p.add_argument(
        "--pending",
        action="store_true",
        help="仅列出需要确认的 graph_id",
    )
    list_p.add_argument(
        "--missing-drafts",
        action="store_true",
        help="仅列出缺少草稿的 graph_id",
    )

    # supplement
    supp_p = sub.add_parser("supplement", help="补录草稿后重新计算指定图")
    supp_p.add_argument("-i", "--input", required=True, help="输入目录")
    supp_p.add_argument("-o", "--output", required=True, help="输出目录")
    supp_p.add_argument("-g", "--graph", action="append", help="指定 graph_id（可多次指定，不指定则全量重跑）")
    supp_p.add_argument("--operator", default="排课老师", help="操作员名称")

    return parser


def cmd_run(args: argparse.Namespace) -> int:
    pipe = InspectionPipeline(
        input_dir=args.input,
        output_dir=args.output,
        skip_missing_drafts=not args.fail_on_missing_draft,
    )
    report = pipe.run(operator=args.operator)
    print(f"批次: {report.batch_id}")
    print(f"时间: {report.timestamp}")
    print(f"总计 {report.total} | 已算 {report.computed} | 通过 {report.passed} | 失败 {report.failed}")
    if report.missing_draft_graphs:
        print(f"缺草稿 {len(report.missing_draft_graphs)} 个: {', '.join(report.missing_draft_graphs)}")
    if report.needs_confirmation_graphs:
        print(f"待确认 {len(report.needs_confirmation_graphs)} 个: {', '.join(report.needs_confirmation_graphs)}")
    print(f"报告写入: {Path(args.output) / 'report.json'}")
    print(f"摘要写入: {Path(args.output) / 'summary.txt'}")
    return 0 if report.passed == report.total else 1


def cmd_confirm(args: argparse.Namespace) -> int:
    pipe = InspectionPipeline(input_dir=args.input, output_dir=args.output)
    approved = bool(args.approve)
    result = pipe.confirm(
        graph_id=args.graph,
        approved=approved,
        operator=args.operator,
        comment=args.comment,
    )
    if result is None:
        print(f"[错误] 未找到 graph_id={args.graph} 的结果，请先 run。", file=sys.stderr)
        return 2
    action = "已批准" if approved else "已驳回"
    print(f"{action}: {args.graph} (by {args.operator})")
    if args.comment:
        print(f"  备注: {args.comment}")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    pipe = InspectionPipeline(input_dir=args.input, output_dir=args.output)
    if args.pending:
        items = pipe.list_confirmations_needed()
        if items:
            print("需要人工确认:")
            for it in items:
                print(f"  - {it}")
        else:
            print("无需确认。")
    elif args.missing_drafts:
        items = pipe.list_missing_drafts()
        if items:
            print("缺少计算草稿:")
            for it in items:
                print(f"  - {it}")
        else:
            print("草稿齐全。")
    else:
        pending = pipe.list_confirmations_needed()
        missing = pipe.list_missing_drafts()
        print(f"待确认: {len(pending)} 个")
        if pending:
            for p in pending:
                print(f"  [确认] {p}")
        print(f"缺草稿: {len(missing)} 个")
        if missing:
            for m in missing:
                print(f"  [草稿] {m}")
    return 0


def cmd_supplement(args: argparse.Namespace) -> int:
    pipe = InspectionPipeline(input_dir=args.input, output_dir=args.output)
    if args.graph:
        print(f"补录后重算: {', '.join(args.graph)}")
    else:
        print("补录后全量重跑")
    report = pipe.run(operator=args.operator)
    print(f"总计 {report.total} | 通过 {report.passed} | 失败 {report.failed}")
    if report.needs_confirmation_graphs:
        print(f"待确认: {', '.join(report.needs_confirmation_graphs)}")
    return 0 if report.passed == report.total else 1


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.command:
        parser.print_help()
        return 0
    handlers = {
        "run": cmd_run,
        "confirm": cmd_confirm,
        "list": cmd_list,
        "supplement": cmd_supplement,
    }
    return handlers[args.command](args)


if __name__ == "__main__":
    raise SystemExit(main())
