from __future__ import annotations

import argparse
import os
import sys

from .importer import confirm_work_order, load_sessions, load_work_orders, run_import
from .models import ConfirmationAction
from .report import generate_report, save_report


def _resolve_path(p: str) -> str:
    return os.path.abspath(os.path.expanduser(p))


def cmd_import(args: argparse.Namespace) -> None:
    input_dir = _resolve_path(args.input_dir)
    output_dir = _resolve_path(args.output_dir)
    data_dict_path = _resolve_path(args.data_dict) if args.data_dict else ""

    if not os.path.isdir(input_dir):
        print(f"错误: 输入目录不存在: {input_dir}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    print(f"输入目录: {input_dir}")
    print(f"输出目录: {output_dir}")
    if data_dict_path:
        print(f"数据字典: {data_dict_path}")

    session = run_import(
        input_dir=input_dir,
        output_dir=output_dir,
        data_dict_path=data_dict_path,
        operator=args.operator or "system",
        force=args.force,
        supplement=args.supplement,
    )

    print()
    print(f"导入完成 — 批次 {session.batch_id}")
    print(f"  新增: {session.new_count}")
    print(f"  重复: {session.duplicate_count}")
    print(f"  变更: {session.changed_count}")
    print(f"  待定: {session.uncertain_count}")
    print(f"  已确认: {session.confirmed_count}")

    if session.index_suggestion:
        keys = session.index_suggestion.suggested_key_fields
        confidence = session.index_suggestion.confidence
        reason = session.index_suggestion.reason
        print(f"  索引键: {', '.join(keys) or '(无)'} (置信度 {confidence:.0%}, {reason})")

    if session.previous_index_suggestion and session.previous_index_suggestion.suggested_key_fields != session.index_suggestion.suggested_key_fields:
        old_keys = session.previous_index_suggestion.suggested_key_fields
        new_keys = session.index_suggestion.suggested_key_fields
        print(f"  ⚠️ 索引键变更: {', '.join(old_keys)} → {', '.join(new_keys)}")

    report_content = generate_report(output_dir, session)
    report_path = save_report(output_dir, report_content)
    print(f"\n报告已导出: {report_path}")


def cmd_confirm(args: argparse.Namespace) -> None:
    output_dir = _resolve_path(args.output_dir)

    action_map = {
        "approve": ConfirmationAction.APPROVE,
        "reject": ConfirmationAction.REJECT,
        "defer": ConfirmationAction.DEFER,
    }
    action = action_map[args.action]

    record = confirm_work_order(
        output_dir=output_dir,
        fingerprint=args.fingerprint,
        action=action,
        operator=args.operator,
        reason=args.reason,
    )

    if record is None:
        print(f"错误: 未找到指纹为 `{args.fingerprint}` 的工单", file=sys.stderr)
        sys.exit(1)

    print(f"确认完成 — 指纹 `{record.work_order_fingerprint}`")
    print(f"  动作: {record.action.value}")
    print(f"  操作人: {record.operator}")
    print(f"  原因: {record.reason}")
    print(f"  判定变更: {record.old_verdict} → {record.new_verdict}")


def cmd_report(args: argparse.Namespace) -> None:
    output_dir = _resolve_path(args.output_dir)
    sessions = load_sessions(output_dir)
    if not sessions:
        print("错误: 暂无导入记录,请先执行导入", file=sys.stderr)
        sys.exit(1)

    session = sessions[-1]
    report_content = generate_report(output_dir, session)
    report_path = save_report(output_dir, report_content, suffix="_regen")
    print(f"报告已重新导出: {report_path}")


def cmd_list(args: argparse.Namespace) -> None:
    output_dir = _resolve_path(args.output_dir)
    orders = load_work_orders(output_dir)

    if not orders:
        print("暂无工单记录。")
        return

    status_filter = args.status
    for fp, wo in sorted(orders.items(), key=lambda x: x[1].last_seen_at, reverse=True):
        if status_filter and wo.status.value != status_filter:
            continue
        print(f"  {wo.status.value:>10}  {fp}  {wo.last_seen_at[:19]}  出现{wo.seen_count}次  判定:{wo.verdict.value}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="batch-dedup",
        description="批量导入重复拦截 — 检测并拦截 CSV 材料中的重复业务工单",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_import = sub.add_parser("import", help="执行批量导入与重复拦截")
    p_import.add_argument("-i", "--input-dir", required=True, help="输入目录(含 CSV 文件)")
    p_import.add_argument("-o", "--output-dir", required=True, help="输出目录(报告与状态)")
    p_import.add_argument("-d", "--data-dict", default="", help="数据字典 CSV 路径(可选,可晚到)")
    p_import.add_argument("--operator", default="system", help="操作人标识")
    p_import.add_argument("--force", action="store_true", help="强制重新运行(忽略幂等检查)")
    p_import.add_argument("--supplement", action="store_true", help="补录模式(增量导入)")

    p_confirm = sub.add_parser("confirm", help="人工确认工单判定")
    p_confirm.add_argument("-o", "--output-dir", required=True, help="输出目录")
    p_confirm.add_argument("-f", "--fingerprint", required=True, help="工单内容指纹")
    p_confirm.add_argument("-a", "--action", required=True, choices=["approve", "reject", "defer"], help="确认动作")
    p_confirm.add_argument("--operator", required=True, help="操作人标识")
    p_confirm.add_argument("-r", "--reason", required=True, help="确认原因")

    p_report = sub.add_parser("report", help="重新导出最新报告")
    p_report.add_argument("-o", "--output-dir", required=True, help="输出目录")

    p_list = sub.add_parser("list", help="列出工单")
    p_list.add_argument("-o", "--output-dir", required=True, help="输出目录")
    p_list.add_argument("-s", "--status", default="", help="按状态过滤(new/duplicate/changed/confirmed/rejected)")

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "import":
        cmd_import(args)
    elif args.command == "confirm":
        cmd_confirm(args)
    elif args.command == "report":
        cmd_report(args)
    elif args.command == "list":
        cmd_list(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
