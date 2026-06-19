import argparse
import os
import sys
from datetime import datetime

from .loader import (
    load_sample_table, load_model_results, load_late_attachments
)
from .comparator import run_compare
from .reporter import generate_terminal_summary, save_outputs
from .history import load_history, save_history, add_history_entry


def cmd_compare(args):
    input_dir = args.input
    output_dir = args.output

    sample_dir = os.path.join(input_dir, "samples")
    old_dir = os.path.join(input_dir, "old")
    new_dir = os.path.join(input_dir, "new")
    attach_dir = os.path.join(input_dir, "late_attachments")

    samples = load_sample_table(sample_dir)
    old_results = load_model_results(old_dir, "old")
    new_results = load_model_results(new_dir, "new")
    late_attachments = load_late_attachments(attach_dir)
    history = load_history(output_dir)

    result = run_compare(
        old_results=old_results,
        new_results=new_results,
        samples=samples,
        late_attachments=late_attachments,
        history=history,
    )

    save_outputs(result, output_dir)
    save_history(history, output_dir)

    print(generate_terminal_summary(result))
    print()
    print(f"输出目录: {os.path.abspath(output_dir)}")
    print(f"  - terminal_summary.txt  (终端摘要，简洁版)")
    print(f"  - screenshot_report.md  (截图说明，完整溯源版)")
    print(f"  - detail.json           (机器可读详细数据)")
    print(f"  - history.json          (历史修改记录)")

    return 0


def cmd_add_history(args):
    output_dir = args.output
    history = load_history(output_dir)

    add_history_entry(
        history=history,
        sample_id=args.sample_id,
        field=args.field,
        old_value=args.old_value,
        new_value=args.new_value,
        operator=args.operator or "unknown",
        reason=args.reason or "",
    )

    save_history(history, output_dir)
    print(f"已添加历史记录: 样本 {args.sample_id} 的 {args.field} 从 '{args.old_value}' 改为 '{args.new_value}'")
    print(f"历史记录文件: {os.path.join(output_dir, 'history.json')}")
    return 0


def cmd_view_history(args):
    output_dir = args.output
    history = load_history(output_dir)

    if not history:
        print("暂无历史记录")
        return 0

    if args.sample_id:
        history = [h for h in history if h.sample_id == args.sample_id]

    print(f"历史记录共 {len(history)} 条:")
    print("-" * 80)
    for h in history:
        print(f"[{h.timestamp}] {h.operator}")
        print(f"  样本: {h.sample_id}")
        print(f"  字段: {h.field}")
        print(f"  变更: '{h.old_value}' → '{h.new_value}'")
        print(f"  原因: {h.reason}")
        print("-" * 80)

    return 0


def main():
    parser = argparse.ArgumentParser(
        prog="gray-compare",
        description="排班推荐灰度对比工具 - 可追溯、易交接",
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    compare_parser = subparsers.add_parser("compare", help="运行灰度对比")
    compare_parser.add_argument(
        "-i", "--input", required=True,
        help="输入目录（包含 samples/ old/ new/ late_attachments/ 子目录）"
    )
    compare_parser.add_argument(
        "-o", "--output", required=True,
        help="输出目录（结果和历史记录都放这里）"
    )
    compare_parser.set_defaults(func=cmd_compare)

    hist_parser = subparsers.add_parser("add-history", help="添加人工修改历史记录")
    hist_parser.add_argument("-o", "--output", required=True, help="输出目录（历史记录存放处）")
    hist_parser.add_argument("--sample-id", required=True, help="样本ID")
    hist_parser.add_argument("--field", required=True, help="修改的字段（如 conclusion）")
    hist_parser.add_argument("--old-value", required=True, help="原值")
    hist_parser.add_argument("--new-value", required=True, help="新值")
    hist_parser.add_argument("--operator", default="unknown", help="操作人")
    hist_parser.add_argument("--reason", default="", help="修改原因")
    hist_parser.set_defaults(func=cmd_add_history)

    view_parser = subparsers.add_parser("view-history", help="查看历史记录")
    view_parser.add_argument("-o", "--output", required=True, help="输出目录")
    view_parser.add_argument("--sample-id", default=None, help="按样本ID筛选（可选）")
    view_parser.set_defaults(func=cmd_view_history)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return 1

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
