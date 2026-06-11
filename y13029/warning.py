#!/usr/bin/env python3
"""券商适当性风险预警 - CLI入口"""
import argparse
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import storage
from app.importer import import_custody_csv
from app.workflow import (
    confirm_warning, confirm_batch, withdraw_warning,
    resolve_conflict, resolve_all_conflicts_auto,
    add_remark, link_late_attachment,
    finalize_batch, check_batch_consistency,
)
from app.reporter import generate_markdown_report, list_reports
from app.models import WarningStatus, ConfirmReason


def _print_json(obj):
    print(json.dumps(obj, ensure_ascii=False, indent=2, default=str))


def cmd_init(args):
    storage.init_db()
    _print_json({"ok": True, "message": "数据库已初始化/迁移完成", "db_path": storage.DB_PATH})


def cmd_import(args):
    result = import_custody_csv(args.file, args.batch_id)
    _print_json(result)


def cmd_list(args):
    storage.init_db()
    if args.batch_id:
        warnings = storage.get_warnings_by_batch(args.batch_id)
    elif args.status:
        s = WarningStatus(args.status)
        warnings = storage.get_warnings_by_status(s)
    else:
        warnings = storage.get_all_warnings()
    data = []
    for w in warnings:
        r = storage.get_receipt_by_id(w.receipt_id)
        data.append({
            "id": w.id,
            "import_round": w.import_round,
            "warning_code": w.warning_code,
            "batch_id": w.batch_id,
            "type": w.warning_type,
            "investor": f"{r.investor_name}({r.investor_id})" if r else "-",
            "amount": r.amount if r else 0,
            "currency": r.currency if r else "-",
            "calibre": r.calibre if r else "-",
            "status": w.status.value,
            "confirm_reason": w.confirm_reason.value if w.confirm_reason else None,
            "confirmed_by": w.confirmed_by,
            "conclusion": w.conclusion[:60] if w.conclusion else "",
            "remark": w.remark[:60] if w.remark else "",
            "late_attachment": w.late_attachment_ref,
            "source": f"{r.source_file}:{r.row_number}" if r else "-",
        })
    if args.status or args.batch_id or args.limit is None:
        _print_json({"ok": True, "count": len(data), "items": data})
    else:
        _print_json({"ok": True, "count": len(data), "items": data[: args.limit]})


def cmd_confirm(args):
    reason = ConfirmReason(args.reason) if args.reason else None
    result = confirm_warning(
        args.warning_id, args.operator, args.conclusion,
        reason=reason, note=args.note, late_attachment_ref=args.attachment
    )
    _print_json(result)


def cmd_confirm_batch(args):
    result = confirm_batch(args.batch_id, args.operator, args.conclusion)
    _print_json(result)


def cmd_withdraw(args):
    result = withdraw_warning(args.warning_id, args.operator, args.reason)
    _print_json(result)


def cmd_remark(args):
    result = add_remark(args.warning_id, args.remark, args.operator)
    _print_json(result)


def cmd_resolve_conflict(args):
    try:
        keep_ids = [int(x.strip()) for x in args.keep.split(",") if x.strip()]
    except ValueError:
        _print_json({"ok": False, "error": "--keep 参数必须是逗号分隔的整数预警ID"})
        return
    result = resolve_conflict(args.conflict_id, args.operator, args.resolution, keep_ids)
    _print_json(result)


def cmd_resolve_all(args):
    order = None
    if args.calibre_order:
        order = [x.strip() for x in args.calibre_order.split(",") if x.strip()]
    result = resolve_all_conflicts_auto(args.batch_id, args.operator, keep_calibre_order=order)
    _print_json(result)


def cmd_finalize(args):
    order = None
    if args.calibre_order:
        order = [x.strip() for x in args.calibre_order.split(",") if x.strip()]
    result = finalize_batch(args.batch_id, args.operator, force=args.force, keep_calibre_order=order)
    _print_json(result)


def cmd_check(args):
    result = check_batch_consistency(args.batch_id)
    _print_json(result)


def cmd_link_attachment(args):
    result = link_late_attachment(args.warning_id, args.attachment, args.conclusion, args.operator)
    _print_json(result)


def cmd_history(args):
    storage.init_db()
    histories = storage.get_history_by_warning(args.warning_id)
    data = [
        {
            "id": h.id,
            "action": h.action,
            "by": h.action_by,
            "old": h.old_status,
            "new": h.new_status,
            "detail": h.detail,
            "time": h.created_at.isoformat(timespec="seconds"),
        }
        for h in histories
    ]
    _print_json({"ok": True, "warning_id": args.warning_id, "count": len(data), "items": data})


def cmd_conflicts(args):
    storage.init_db()
    if args.batch_id:
        conflicts = storage.get_conflicts_by_batch(args.batch_id)
    else:
        conflicts = storage.get_all_conflicts()
    data = [
        {
            "id": c.id,
            "import_round": c.import_round,
            "batch_id": c.batch_id,
            "investor": f"{c.investor_name}({c.investor_id})",
            "amount": c.amount,
            "calibres": c.calibres,
            "warning_ids": c.warning_ids,
            "resolved": c.resolved,
            "resolution": c.resolution,
            "created_at": c.created_at.isoformat(timespec="seconds"),
        }
        for c in conflicts
    ]
    _print_json({"ok": True, "count": len(data), "items": data})


def cmd_bad_data(args):
    storage.init_db()
    bad = storage.get_all_bad_data()
    data = [
        {
            "id": b.id,
            "import_round": b.import_round,
            "file": b.source_file,
            "row": b.row_number,
            "field": b.field_name,
            "raw_value": b.raw_value,
            "error": b.error_message,
        }
        for b in bad
    ]
    _print_json({"ok": True, "count": len(data), "items": data})


def cmd_rounds(args):
    storage.init_db()
    rounds = storage.get_import_rounds(args.batch_id)
    _print_json({"ok": True, "batch_id": args.batch_id, "count": len(rounds), "rounds": rounds})


def cmd_report(args):
    result = generate_markdown_report(args.batch_id, args.output)
    if not result.get("ok"):
        _print_json(result)
        return
    if not result.get("consistency_clean") and not args.ignore_unclosed:
        _print_json({
            "ok": False,
            "error": "导出前一致性检查未通过（存在未闭环预警或冲突），详见报告第六节。"
                     "如需强制生成请加 --ignore-unclosed，或先执行 warning.py finalize。",
            "report_path": result.get("report_path"),
            "consistency": {
                k: v for k, v in result.get("consistency", {}).items()
                if k in ("clean", "total", "confirmed", "withdrawn", "pending",
                         "conflict", "imported", "open_conflicts", "issues")
            }
        })
        return
    _print_json(result)


def cmd_list_reports(args):
    reports = list_reports()
    _print_json({"ok": True, "count": len(reports), "reports": reports})


def cmd_batches(args):
    storage.init_db()
    batches = storage.get_all_batches()
    summary = []
    for bid in batches:
        c = check_batch_consistency(bid)
        summary.append({
            "batch_id": bid,
            "total": c["total"],
            "confirmed": c["confirmed"],
            "withdrawn": c["withdrawn"],
            "pending": c["pending"],
            "conflict": c["conflict"],
            "open_conflicts": c["open_conflicts"],
            "clean": c["clean"],
        })
    _print_json({"ok": True, "count": len(batches), "batches": summary})


def build_parser():
    parser = argparse.ArgumentParser(
        prog="warning",
        description="券商适当性风险预警系统 —— 导入/确认/撤回/Markdown报告统一接入本地 SQLite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "小林核心流程（照抄）:\n"
            "  1. python3 warning.py init\n"
            "  2. python3 warning.py import sample_materials/托管回执_20260609_batch01.csv --batch-id 20260609-01\n"
            "  3. python3 warning.py import sample_materials/托管回执_晚到附件_20260609_batch01.csv --batch-id 20260609-01\n"
            "  4. python3 warning.py link-attachment <黄十三那条预警ID> --attachment '晚到附件_行1_私募基金申购确认单' --conclusion '附件已核验' --operator 小林\n"
            "  5. python3 warning.py import sample_materials/托管回执_20260609_batch01.csv --batch-id 20260609-01\n"
            "  6. python3 warning.py remark <ID> '小林备注：本批次跑两遍导入完成'\n"
            "  7. python3 warning.py finalize 20260609-01 --operator 小林     # ← 自动收尾关键命令\n"
            "  8. python3 warning.py check 20260609-01                        # ← 导出前一致性检查\n"
            "  9. python3 warning.py report 20260609-01                       # ← 生成 Markdown 报告\n"
        ),
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("init", help="初始化/迁移本地数据库")
    p.set_defaults(func=cmd_init)

    p = sub.add_parser("import", help="导入托管回执CSV（同批次同文件SHA1指纹去重，自动记录导入轮次）")
    p.add_argument("file", help="CSV文件路径")
    p.add_argument("--batch-id", required=True, help="批次号（同一份材料跑两遍用同一个batch-id）")
    p.set_defaults(func=cmd_import)

    p = sub.add_parser("list", help="列出预警")
    p.add_argument("--batch-id", help="按批次号过滤")
    p.add_argument("--status", help="按状态过滤",
                   choices=[s.value for s in WarningStatus])
    p.add_argument("--limit", type=int, default=None, help="限制返回条数")
    p.set_defaults(func=cmd_list)

    p = sub.add_parser("confirm", help="人工确认单条预警（币种错误/晚到附件等场景）")
    p.add_argument("warning_id", type=int, help="预警ID，必须是正整数")
    p.add_argument("--operator", default="小林", help="操作人，默认=小林")
    p.add_argument("--conclusion", required=True, help="确认结论，不能为空")
    p.add_argument("--reason", choices=[r.value for r in ConfirmReason],
                   help="确认原因: currency_mismatch/double_counting/late_attachment/normal/other")
    p.add_argument("--note", default="", help="补充备注（原因和下一步说明，币种错误场景必填）")
    p.add_argument("--attachment", default="", help="关联的晚到附件引用标识（文件名:行号等）")
    p.set_defaults(func=cmd_confirm)

    p = sub.add_parser("confirm-batch", help="批量确认批次内 pending_confirm / imported 预警")
    p.add_argument("batch_id", help="批次号")
    p.add_argument("--operator", default="小林", help="操作人")
    p.add_argument("--conclusion", default="已复核，风险在容忍范围内", help="统一确认结论")
    p.set_defaults(func=cmd_confirm_batch)

    p = sub.add_parser("withdraw", help="撤回一条已确认预警")
    p.add_argument("warning_id", type=int, help="预警ID")
    p.add_argument("--operator", default="小林", help="操作人")
    p.add_argument("--reason", required=True, help="撤回原因，不能为空")
    p.set_defaults(func=cmd_withdraw)

    p = sub.add_parser("remark", help="给任意状态的预警追加备注（保留历史）")
    p.add_argument("warning_id", type=int, help="预警ID")
    p.add_argument("remark", help="备注内容，不能是空字符串")
    p.add_argument("--operator", default="小林", help="操作人")
    p.set_defaults(func=cmd_remark)

    p = sub.add_parser("resolve-conflict", help="手动解决双口径冲突：指定保留哪些预警ID，其余撤回")
    p.add_argument("conflict_id", type=int, help="冲突ID（来自 conflicts 命令）")
    p.add_argument("--operator", default="小林", help="操作人")
    p.add_argument("--resolution", required=True, help="解决说明，不能为空")
    p.add_argument("--keep", required=True, help="保留的预警ID，逗号分隔，例如 --keep 1,3")
    p.set_defaults(func=cmd_resolve_conflict)

    p = sub.add_parser("resolve-all", help="按口径优先级自动解决批次内所有未解决冲突")
    p.add_argument("batch_id", help="批次号")
    p.add_argument("--operator", default="小林", help="操作人")
    p.add_argument("--calibre-order", default=None,
                   help="保留口径优先级（逗号分隔），默认=口径A-申购金额,口径A-交易流水,口径B-净资产变动...")
    p.set_defaults(func=cmd_resolve_all)

    p = sub.add_parser("finalize", help="⭐ 批次收尾关键命令：自动解决所有冲突 → 批量确认 → 一致性检查")
    p.add_argument("batch_id", help="批次号")
    p.add_argument("--operator", default="小林", help="操作人")
    p.add_argument("--calibre-order", default=None, help="解决冲突用的口径优先级")
    p.add_argument("--force", action="store_true",
                   help="即使一致性检查仍有未闭环项，也返回ok=True（谨慎使用）")
    p.set_defaults(func=cmd_finalize)

    p = sub.add_parser("check", help="⭐ 导出前一致性检查：必须clean=True才能生成正式报告")
    p.add_argument("batch_id", help="批次号")
    p.set_defaults(func=cmd_check)

    p = sub.add_parser("link-attachment", help="把晚到附件引用关联到预警，同时确认结论")
    p.add_argument("warning_id", type=int, help="预警ID")
    p.add_argument("--attachment", required=True, help="附件引用（文件名:行号等）")
    p.add_argument("--conclusion", required=True, help="基于附件的最终确认结论")
    p.add_argument("--operator", default="小林", help="操作人")
    p.set_defaults(func=cmd_link_attachment)

    p = sub.add_parser("history", help="查看单条预警的完整操作历史")
    p.add_argument("warning_id", type=int, help="预警ID")
    p.set_defaults(func=cmd_history)

    p = sub.add_parser("conflicts", help="查看双口径冲突记录")
    p.add_argument("--batch-id", help="按批次过滤")
    p.set_defaults(func=cmd_conflicts)

    p = sub.add_parser("bad-data", help="查看坏数据（带原始行号定位）")
    p.set_defaults(func=cmd_bad_data)

    p = sub.add_parser("rounds", help="查看批次的导入轮次明细")
    p.add_argument("batch_id", help="批次号")
    p.set_defaults(func=cmd_rounds)

    p = sub.add_parser("report", help="生成Markdown报告（默认：导出前一致性检查必须通过）")
    p.add_argument("batch_id", help="批次号")
    p.add_argument("--output", help="自定义输出路径（否则自动命名到reports/）")
    p.add_argument("--ignore-unclosed", action="store_true",
                   help="即使有未闭环项也强制输出报告（文件名会带UNCLOSED标记）")
    p.set_defaults(func=cmd_report)

    p = sub.add_parser("list-reports", help="列出reports/目录下已生成的Markdown报告")
    p.set_defaults(func=cmd_list_reports)

    p = sub.add_parser("batches", help="列出所有批次，并附带每个批次的一致性概览")
    p.set_defaults(func=cmd_batches)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.func(args)
    except KeyboardInterrupt:
        print("\n[已取消]")
        sys.exit(130)
    except Exception as e:
        import traceback
        _print_json({
            "ok": False,
            "error": f"未预期的错误: {type(e).__name__}: {e}",
            "traceback": traceback.format_exc(),
        })
        sys.exit(1)


if __name__ == "__main__":
    main()
