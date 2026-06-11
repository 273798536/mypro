"""
命令行接口 - 信用卡争议款异常回放
参数名和错误提示保持稳定，供复核人日常脚本化调用。
"""
import sys
import json
from pathlib import Path
from typing import Optional

import click
from tabulate import tabulate

from .database import Database, RECORD_STATUS
from .models import (
    TrustReceiptImporter, ApproverManager, DisputeReplayer,
    NoteManager, ImportReceiptError, NoteDeleteError
)
from .report import ReportExporter

ERROR_EXIT_CODE = 1
SUCCESS_EXIT_CODE = 0


def _print_error(msg: str) -> None:
    click.echo(f"[ERROR] {msg}", err=True)


def _print_warning(msg: str) -> None:
    click.echo(f"[WARN] {msg}", err=True)


def _print_info(msg: str) -> None:
    click.echo(f"[INFO] {msg}")


@click.group(help="信用卡争议款异常回放系统")
@click.option("--db-path", type=click.Path(path_type=Path), default=None,
              help="数据库文件路径（默认: ./cc_dispute.db）")
@click.pass_context
def cli(ctx: click.Context, db_path: Optional[Path]) -> None:
    ctx.ensure_object(dict)
    ctx.obj["db"] = Database(db_path)
    ctx.obj["db"].initialize()


# ---------------------------------------------------------------------------
# 数据库初始化
# ---------------------------------------------------------------------------
@cli.command("init-db", help="初始化数据库（幂等操作）")
@click.pass_context
def cmd_init_db(ctx: click.Context) -> None:
    db: Database = ctx.obj["db"]
    try:
        db.initialize()
        _print_info(f"数据库初始化完成: {db.db_path}")
        sys.exit(SUCCESS_EXIT_CODE)
    except Exception as e:
        _print_error(f"[INIT_DB_FAILED] 数据库初始化失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


# ---------------------------------------------------------------------------
# 托管回执导入
# ---------------------------------------------------------------------------
@cli.command("import-receipt", help="导入托管回执 CSV（保留原始脏数据，不清洗）")
@click.option("--csv-file", required=True, type=click.Path(path_type=Path, exists=True),
              help="托管回执 CSV 文件路径")
@click.option("--source-label", default=None, type=str,
              help="来源文件标签（默认使用 CSV 文件名）")
@click.pass_context
def cmd_import_receipt(ctx: click.Context, csv_file: Path, source_label: Optional[str]) -> None:
    db: Database = ctx.obj["db"]
    importer = TrustReceiptImporter(db)
    try:
        success, skipped, warnings = importer.import_from_csv(csv_file, source_label)
        _print_info(f"导入完成: 成功 {success} 条，跳过 {skipped} 条")
        for w in warnings:
            _print_warning(w)
        sys.exit(SUCCESS_EXIT_CODE)
    except ImportReceiptError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[IMPORT_RECEIPT_UNEXPECTED] 导入异常: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("list-receipt", help="列出托管回执")
@click.option("--only-dirty", is_flag=True, default=False,
              help="只列出含脏数据的回执")
@click.pass_context
def cmd_list_receipt(ctx: click.Context, only_dirty: bool) -> None:
    db: Database = ctx.obj["db"]
    importer = TrustReceiptImporter(db)
    try:
        rows = importer.list_receipts(only_dirty=only_dirty)
        table = []
        for r in rows:
            table.append([
                r["id"], r["receipt_no"], r["source_file"],
                "是" if r["is_dirty"] else "否",
                r["dirty_fields"] or "",
                r["imported_at"]
            ])
        click.echo(tabulate(
            table,
            headers=["ID", "回执编号", "来源文件", "脏数据", "脏字段", "导入时间"],
            tablefmt="simple"
        ))
        sys.exit(SUCCESS_EXIT_CODE)
    except Exception as e:
        _print_error(f"[LIST_RECEIPT_FAILED] 列表查询失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


# ---------------------------------------------------------------------------
# 审批人管理
# ---------------------------------------------------------------------------
@cli.command("add-approver", help="新增审批人")
@click.option("--name", required=True, type=str, help="审批人当前姓名")
@click.option("--prev-names", default=None, type=str,
              help="曾用名（JSON 数组，如 '[\"旧名1\",\"旧名2\"]'）")
@click.pass_context
def cmd_add_approver(ctx: click.Context, name: str, prev_names: Optional[str]) -> None:
    db: Database = ctx.obj["db"]
    mgr = ApproverManager(db)
    try:
        prev_list: list = json.loads(prev_names) if prev_names else []
        new_id = mgr.add_approver(name, prev_list)
        _print_info(f"审批人已新增，ID={new_id}，姓名={name}")
        sys.exit(SUCCESS_EXIT_CODE)
    except json.JSONDecodeError:
        _print_error("[APPROVER_PREV_NAMES_INVALID] --prev-names 必须是合法 JSON 数组")
        sys.exit(ERROR_EXIT_CODE)
    except ValueError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[ADD_APPROVER_UNEXPECTED] 新增异常: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("rename-approver", help="审批人改名（会自动挂起相关争议记录）")
@click.option("--approver-id", required=True, type=int, help="审批人 ID")
@click.option("--new-name", required=True, type=str, help="新姓名")
@click.pass_context
def cmd_rename_approver(ctx: click.Context, approver_id: int, new_name: str) -> None:
    db: Database = ctx.obj["db"]
    mgr = ApproverManager(db)
    try:
        mgr.rename_approver(approver_id, new_name)
        _print_info(f"审批人 ID={approver_id} 已改名，相关记录已标记为挂起待确认")
        sys.exit(SUCCESS_EXIT_CODE)
    except ValueError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[RENAME_APPROVER_UNEXPECTED] 改名异常: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("list-approver", help="列出所有审批人")
@click.pass_context
def cmd_list_approver(ctx: click.Context) -> None:
    db: Database = ctx.obj["db"]
    mgr = ApproverManager(db)
    try:
        rows = mgr.list_approvers()
        table = []
        for r in rows:
            table.append([
                r["id"], r["current_name"],
                r["previous_names"] or "[]",
                "在职" if r["is_active"] else "离职",
                r["created_at"], r["updated_at"]
            ])
        click.echo(tabulate(
            table,
            headers=["ID", "当前姓名", "曾用名", "状态", "创建时间", "更新时间"],
            tablefmt="simple"
        ))
        sys.exit(SUCCESS_EXIT_CODE)
    except Exception as e:
        _print_error(f"[LIST_APPROVER_FAILED] 查询失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


# ---------------------------------------------------------------------------
# 争议回放
# ---------------------------------------------------------------------------
@cli.command("replay-create", help="根据托管回执批量创建争议处理记录")
@click.pass_context
def cmd_replay_create(ctx: click.Context) -> None:
    db: Database = ctx.obj["db"]
    replayer = DisputeReplayer(db)
    try:
        created, existed, warnings = replayer.create_records_from_receipts()
        _print_info(f"回放完成: 新增 {created} 条，已存在 {existed} 条")
        for w in warnings:
            _print_warning(w)
        sys.exit(SUCCESS_EXIT_CODE)
    except Exception as e:
        _print_error(f"[REPLAY_CREATE_FAILED] 回放失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("list-record", help="列出争议处理记录")
@click.option("--status", default=None, type=click.Choice(list(RECORD_STATUS.keys())),
              help=f"按状态过滤: {list(RECORD_STATUS.keys())}")
@click.option("--suspended-only", is_flag=True, default=False,
              help="只列出挂起待确认的记录")
@click.pass_context
def cmd_list_record(ctx: click.Context, status: Optional[str], suspended_only: bool) -> None:
    db: Database = ctx.obj["db"]
    replayer = DisputeReplayer(db)
    try:
        rows = replayer.list_records(status=status, suspended_only=suspended_only)
        table = []
        for r in rows:
            table.append([
                r["id"], r["receipt_no"],
                r["card_no"] or "",
                f"{r['dispute_amount']:.2f}" if r["dispute_amount"] is not None else "",
                r["approver_name_snapshot"] or "",
                RECORD_STATUS.get(r["status"], r["status"]),
                r["conclusion"] or "",
                "是" if r["is_suspended"] else "否",
                r["updated_at"]
            ])
        click.echo(tabulate(
            table,
            headers=["ID", "回执编号", "卡号", "金额", "审批人", "状态", "结论", "挂起", "更新时间"],
            tablefmt="simple"
        ))
        sys.exit(SUCCESS_EXIT_CODE)
    except ValueError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[LIST_RECORD_FAILED] 查询失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("confirm-record", help="确认/更新争议记录结论")
@click.option("--record-id", required=True, type=int, help="争议记录 ID")
@click.option("--conclusion", required=True, type=str, help="处理结论")
@click.option("--operator", required=True, type=str, help="操作人")
@click.option("--change-reason", default=None, type=str,
              help="改判原因（结论变更时必填）")
@click.option("--new-note", default=None, type=str, help="新备注")
@click.pass_context
def cmd_confirm_record(ctx: click.Context, record_id: int, conclusion: str,
                       operator: str, change_reason: Optional[str], new_note: Optional[str]) -> None:
    db: Database = ctx.obj["db"]
    replayer = DisputeReplayer(db)
    try:
        replayer.confirm_record(record_id, conclusion, operator, change_reason, new_note)
        _print_info(f"争议记录 ID={record_id} 已确认结论")
        sys.exit(SUCCESS_EXIT_CODE)
    except ValueError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[CONFIRM_RECORD_FAILED] 确认失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("resume-suspended", help="恢复挂起记录（复核人确认后）")
@click.option("--record-id", required=True, type=int, help="争议记录 ID")
@click.option("--operator", required=True, type=str, help="操作人")
@click.option("--approver-id", default=None, type=int, help="关联审批人 ID")
@click.option("--need-evidence", is_flag=True, default=False,
              help="标记为待补证据（而不是待处理）")
@click.pass_context
def cmd_resume_suspended(ctx: click.Context, record_id: int, operator: str,
                         approver_id: Optional[int], need_evidence: bool) -> None:
    db: Database = ctx.obj["db"]
    replayer = DisputeReplayer(db)
    try:
        replayer.resume_suspended(record_id, operator, approver_id, need_evidence)
        status = "待补证据" if need_evidence else "待处理"
        _print_info(f"争议记录 ID={record_id} 已恢复，当前状态: {status}")
        sys.exit(SUCCESS_EXIT_CODE)
    except ValueError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[RESUME_SUSPENDED_FAILED] 恢复失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("mark-evidence", help="标记为待补证据")
@click.option("--record-id", required=True, type=int, help="争议记录 ID")
@click.option("--operator", required=True, type=str, help="操作人")
@click.option("--note", default=None, type=str, help="需补充的证据说明")
@click.pass_context
def cmd_mark_evidence(ctx: click.Context, record_id: int, operator: str, note: Optional[str]) -> None:
    db: Database = ctx.obj["db"]
    replayer = DisputeReplayer(db)
    try:
        replayer.mark_need_evidence(record_id, operator, note)
        _print_info(f"争议记录 ID={record_id} 已标记为待补证据")
        sys.exit(SUCCESS_EXIT_CODE)
    except ValueError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[MARK_EVIDENCE_FAILED] 标记失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("record-detail", help="查看争议记录完整详情（托管回执+备注+历史）")
@click.option("--record-id", required=True, type=int, help="争议记录 ID")
@click.pass_context
def cmd_record_detail(ctx: click.Context, record_id: int) -> None:
    db: Database = ctx.obj["db"]
    replayer = DisputeReplayer(db)
    try:
        detail = replayer.get_record_detail(record_id)
        click.echo(json.dumps(detail, ensure_ascii=False, indent=2, default=str))
        sys.exit(SUCCESS_EXIT_CODE)
    except ValueError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[RECORD_DETAIL_FAILED] 查询失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


# ---------------------------------------------------------------------------
# 手工备注
# ---------------------------------------------------------------------------
@cli.command("add-note", help="追加手工备注（只允许追加，不允许硬删除）")
@click.option("--record-id", required=True, type=int, help="争议记录 ID")
@click.option("--content", required=True, type=str, help="备注内容")
@click.option("--operator", required=True, type=str, help="操作人")
@click.pass_context
def cmd_add_note(ctx: click.Context, record_id: int, content: str, operator: str) -> None:
    db: Database = ctx.obj["db"]
    mgr = NoteManager(db)
    try:
        note_id = mgr.add_note(record_id, content, operator)
        _print_info(f"备注已追加，ID={note_id}")
        sys.exit(SUCCESS_EXIT_CODE)
    except ValueError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[ADD_NOTE_FAILED] 追加备注失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("soft-delete-note", help="软删除备注（保留痕迹，不可硬删）")
@click.option("--note-id", required=True, type=int, help="备注 ID")
@click.option("--operator", required=True, type=str, help="操作人")
@click.pass_context
def cmd_soft_delete_note(ctx: click.Context, note_id: int, operator: str) -> None:
    db: Database = ctx.obj["db"]
    mgr = NoteManager(db)
    try:
        mgr.soft_delete_note(note_id, operator)
        _print_info(f"备注 ID={note_id} 已软删除（痕迹保留）")
        sys.exit(SUCCESS_EXIT_CODE)
    except ValueError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[SOFT_DELETE_NOTE_FAILED] 软删除失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


# ---------------------------------------------------------------------------
# 报表导出
# ---------------------------------------------------------------------------
@cli.command("export-status", help="导出处理状态总览（复核人日常用）")
@click.option("--output", required=True, type=click.Path(path_type=Path),
              help="输出 CSV 文件路径")
@click.pass_context
def cmd_export_status(ctx: click.Context, output: Path) -> None:
    db: Database = ctx.obj["db"]
    exporter = ReportExporter(db)
    try:
        path = exporter.export_status_overview(output)
        _print_info(f"状态总览已导出: {path}")
        sys.exit(SUCCESS_EXIT_CODE)
    except Exception as e:
        _print_error(f"[EXPORT_STATUS_FAILED] 导出失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("export-detail", help="导出争议处理 CSV 明细")
@click.option("--output", required=True, type=click.Path(path_type=Path),
              help="输出 CSV 文件路径")
@click.option("--status", default=None, type=click.Choice(list(RECORD_STATUS.keys())),
              help="按状态过滤")
@click.pass_context
def cmd_export_detail(ctx: click.Context, output: Path, status: Optional[str]) -> None:
    db: Database = ctx.obj["db"]
    exporter = ReportExporter(db)
    try:
        path = exporter.export_detail_csv(output, status)
        _print_info(f"CSV 明细已导出: {path}")
        sys.exit(SUCCESS_EXIT_CODE)
    except Exception as e:
        _print_error(f"[EXPORT_DETAIL_FAILED] 导出失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("export-receipt", help="导出托管回执对照表（含原始脏数据）")
@click.option("--output", required=True, type=click.Path(path_type=Path),
              help="输出 CSV 文件路径")
@click.pass_context
def cmd_export_receipt(ctx: click.Context, output: Path) -> None:
    db: Database = ctx.obj["db"]
    exporter = ReportExporter(db)
    try:
        path = exporter.export_receipt_mapping(output)
        _print_info(f"托管回执对照已导出: {path}")
        sys.exit(SUCCESS_EXIT_CODE)
    except Exception as e:
        _print_error(f"[EXPORT_RECEIPT_FAILED] 导出失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("export-record-history", help="导出单条记录完整档案（阿禾交付用）")
@click.option("--record-id", required=True, type=int, help="争议记录 ID")
@click.option("--output", required=True, type=click.Path(path_type=Path),
              help="输出 CSV 文件路径")
@click.pass_context
def cmd_export_record_history(ctx: click.Context, record_id: int, output: Path) -> None:
    db: Database = ctx.obj["db"]
    exporter = ReportExporter(db)
    try:
        path = exporter.export_record_history(record_id, output)
        _print_info(f"记录档案已导出: {path}")
        sys.exit(SUCCESS_EXIT_CODE)
    except ValueError as e:
        _print_error(str(e))
        sys.exit(ERROR_EXIT_CODE)
    except Exception as e:
        _print_error(f"[EXPORT_RECORD_HISTORY_FAILED] 导出失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


@cli.command("export-package", help="一键导出完整交付包（阿禾给别人看用）")
@click.option("--output-dir", required=True, type=click.Path(path_type=Path),
              help="输出目录路径")
@click.pass_context
def cmd_export_package(ctx: click.Context, output_dir: Path) -> None:
    db: Database = ctx.obj["db"]
    exporter = ReportExporter(db)
    try:
        paths = exporter.export_full_package(output_dir)
        _print_info("完整交付包已导出:")
        for key, path in paths.items():
            click.echo(f"  - {key}: {path}")
        sys.exit(SUCCESS_EXIT_CODE)
    except Exception as e:
        _print_error(f"[EXPORT_PACKAGE_FAILED] 导出失败: {e}")
        sys.exit(ERROR_EXIT_CODE)


def main() -> None:
    cli(obj={})


if __name__ == "__main__":
    main()
