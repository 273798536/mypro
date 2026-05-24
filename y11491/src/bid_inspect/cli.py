import json
import os
from datetime import datetime

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from .config import Config
from .database import init_db, SessionLocal
from .core import PermissionChecker, PermissionDeniedError, RecordManager
from .importer import ImportService
from .checker import CheckService
from .reporter import ReportGenerator, Exporter, HistoryQuery
from .models import RecordType, RecordStatus

console = Console()


def get_current_user_role():
    return os.getenv("BID_USER_ROLE", "admin")


@click.group()
@click.option("--user", "-u", help="当前用户角色 (admin/operator/viewer)")
@click.pass_context
def cli(ctx, user):
    ctx.ensure_object(dict)
    if user:
        os.environ["BID_USER_ROLE"] = user
    ctx.obj["user_role"] = get_current_user_role()


@cli.command()
@click.pass_context
def init(ctx):
    """初始化项目数据库和目录结构"""
    try:
        PermissionChecker.require_permission(ctx.obj["user_role"], "init")
    except PermissionDeniedError as e:
        console.print(f"[red]{e}[/red]")
        return

    with console.status("[bold green]正在初始化..."):
        Config.ensure_dirs()
        init_db()

        db = SessionLocal()
        check_service = CheckService(db)
        check_service.init_rules()
        db.close()

    console.print(Panel.fit("[bold green]初始化完成！", title="成功"))
    console.print(f"  数据库: {os.path.abspath(Config.DB_PATH)}")
    console.print(f"  数据目录: {Config.DATA_DIR.absolute()}")
    console.print(f"  导出目录: {Config.EXPORT_DIR.absolute()}")


@cli.command("import")
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--type", "-t", "record_type", required=True,
              type=click.Choice(["qualification", "price_version", "sealed_scan", "anomaly_photo"]),
              help="导入数据类型")
@click.option("--force", "-f", is_flag=True, help="强制重新导入（即使文件已导入过）")
@click.pass_context
def import_file(ctx, file_path, record_type, force):
    """导入数据文件"""
    try:
        PermissionChecker.require_permission(ctx.obj["user_role"], "import")
    except PermissionDeniedError as e:
        console.print(f"[red]{e}[/red]")
        return

    rtype = RecordType(record_type)
    db = SessionLocal()
    user = ctx.obj["user_role"]

    try:
        with console.status(f"[bold green]正在导入 {file_path}..."):
            service = ImportService(db, user)
            result = service.import_file(file_path, rtype, allow_duplicate=force)

        if result["is_duplicate"]:
            console.print(Panel.fit(
                f"[yellow]{result['message']}[/yellow]",
                title="重复导入"
            ))
        else:
            console.print(Panel.fit(
                f"[green]导入完成！[/green]",
                title=f"会话: {result['session_id']}"
            ))
            console.print(f"  总行数: {result['total_rows']}")
            console.print(f"  新增: {result['success_count']}")
            console.print(f"  更新: {result['update_count']}")
            console.print(f"  失败: {result['failure_count']}")

    except Exception as e:
        console.print(f"[red]导入失败: {e}[/red]")
    finally:
        db.close()


@cli.command()
@click.option("--type", "-t", "record_type",
              type=click.Choice(["qualification", "price_version", "sealed_scan", "anomaly_photo"]),
              help="指定检查类型")
@click.pass_context
def check(ctx, record_type):
    """执行数据一致性检查"""
    try:
        PermissionChecker.require_permission(ctx.obj["user_role"], "check")
    except PermissionDeniedError as e:
        console.print(f"[red]{e}[/red]")
        return

    db = SessionLocal()
    rtype = RecordType(record_type) if record_type else None

    try:
        with console.status("[bold green]正在执行检查..."):
            service = CheckService(db)
            result = service.check_all(rtype)

        console.print(Panel.fit("[bold green]检查完成！", title="检查结果"))

        table = Table(show_header=True)
        table.add_column("项目")
        table.add_column("数量", justify="right")
        table.add_row("总记录数", str(result["total"]))
        table.add_row("通过", f"[green]{result['passed']}[/green]")
        table.add_row("失败", f"[red]{result['failed']}[/red]")
        console.print(table)

        if result["failed"] > 0:
            console.print("\n[yellow]失败记录详情:[/yellow]")
            for detail in result["details"]:
                if not detail["all_passed"]:
                    failures = [r for r in detail["results"] if not r["passed"]]
                    console.print(f"  记录 {detail['record_id']}:")
                    for f in failures:
                        console.print(f"    - {f['rule_name']}: {f['detail']}")

    except Exception as e:
        console.print(f"[red]检查失败: {e}[/red]")
    finally:
        db.close()


@cli.command()
@click.argument("record_id", type=int)
@click.option("--field", "-f", "fields", multiple=True, help="修复字段，格式: 字段名=值")
@click.option("--remark", "-r", help="修复备注")
@click.pass_context
def fix(ctx, record_id, fields, remark):
    """交互式修复异常数据"""
    try:
        PermissionChecker.require_permission(ctx.obj["user_role"], "fix")
    except PermissionDeniedError as e:
        console.print(f"[red]{e}[/red]")
        return

    db = SessionLocal()
    user = ctx.obj["user_role"]

    try:
        manager = RecordManager(db, user)

        fixes = {}
        for f in fields:
            key, value = f.split("=", 1)
            fixes[key.strip()] = value.strip()

        if not fixes:
            console.print("[yellow]没有指定要修复的字段[/yellow]")
            return

        with console.status("[bold green]正在修复..."):
            record = manager.fix_record(record_id, fixes, remark)
            db.commit()

        if record:
            console.print(Panel.fit(
                f"[green]记录 {record_id} 已修复！[/green]",
                title="修复完成"
            ))
            for key, value in fixes.items():
                console.print(f"  {key} = {value}")
        else:
            console.print(f"[red]未找到记录 {record_id}[/red]")

    except Exception as e:
        console.print(f"[red]修复失败: {e}[/red]")
    finally:
        db.close()


@cli.command()
@click.option("--detail", "-d", is_flag=True, help="显示详细信息")
@click.option("--status", "-s",
              type=click.Choice(["valid", "invalid", "pending", "fixed"]),
              help="按状态筛选")
@click.pass_context
def report(ctx, detail, status):
    """生成巡检报表"""
    try:
        PermissionChecker.require_permission(ctx.obj["user_role"], "report")
    except PermissionDeniedError as e:
        console.print(f"[red]{e}[/red]")
        return

    db = SessionLocal()

    try:
        generator = ReportGenerator(db)

        if status:
            records = generator.generate_record_list(status=RecordStatus(status))
            console.print(Panel.fit(
                f"[bold]状态: {status} (共 {len(records)} 条)[/bold]",
                title="报表"
            ))
            if detail and records:
                _print_records_table(records)
        else:
            summary = generator.generate_summary()
            console.print(Panel.fit("[bold green]数据汇总[/bold green]", title="巡检报表"))

            table = Table(show_header=True)
            table.add_column("项目")
            table.add_column("数值", justify="right")
            table.add_row("生成时间", summary["generated_at"])
            table.add_row("总记录数", str(summary["total_records"]))
            table.add_row("有效", f"[green]{summary['status_breakdown']['valid']}[/green]")
            table.add_row("无效", f"[red]{summary['status_breakdown']['invalid']}[/red]")
            table.add_row("待处理", f"[yellow]{summary['status_breakdown']['pending']}[/yellow]")
            table.add_row("已修复", f"[blue]{summary['status_breakdown']['fixed']}[/blue]")
            table.add_row("未解决失败", f"[red]{summary['unresolved_failures']}[/red]")
            console.print(table)

            type_table = Table(show_header=True, title="按类型分布")
            type_table.add_column("类型")
            type_table.add_column("数量", justify="right")
            for t, count in summary["type_breakdown"].items():
                type_table.add_row(t, str(count))
            console.print(type_table)

            if detail:
                failures = generator.generate_failure_list()
                if failures:
                    console.print("\n[red]失败清单:[/red]")
                    for f in failures:
                        console.print(
                            f"  [{f['id']}] {f['source_file']} 行{f['source_row']}: "
                            f"{f['error_message']}"
                        )

    except Exception as e:
        console.print(f"[red]生成报表失败: {e}[/red]")
    finally:
        db.close()


def _print_records_table(records):
    if not records:
        console.print("[yellow]没有记录[/yellow]")
        return

    table = Table(show_header=True)
    table.add_column("ID")
    table.add_column("源文件")
    table.add_column("原始行号")
    table.add_column("供应商")
    table.add_column("类型")
    table.add_column("版本")
    table.add_column("状态")

    for r in records:
        status_color = {
            "valid": "green",
            "invalid": "red",
            "pending": "yellow",
            "fixed": "blue",
        }.get(r["status"], "white")
        table.add_row(
            str(r["id"]),
            r["source_file"],
            str(r["source_row"]),
            r["supplier_name"],
            r["record_type"],
            str(r["version"]),
            f"[{status_color}]{r['status']}[/{status_color}]",
        )
    console.print(table)


@cli.command()
@click.option("--record", "-r", type=int, help="查看指定记录的历史")
@click.option("--limit", "-n", type=int, default=20, help="显示最近N条")
@click.pass_context
def history(ctx, record, limit):
    """查看操作历史"""
    try:
        PermissionChecker.require_permission(ctx.obj["user_role"], "history")
    except PermissionDeniedError as e:
        console.print(f"[red]{e}[/red]")
        return

    db = SessionLocal()

    try:
        query = HistoryQuery(db)

        if record:
            histories = query.get_record_history(record)
            console.print(Panel.fit(
                f"[bold]记录 {record} 的历史 (共 {len(histories)} 条)[/bold]",
                title="历史记录"
            ))
            for h in histories:
                console.print(f"\n  [{h['id']}] {h['operation']} @ {h['operated_at']}")
                console.print(f"  操作人: {h['operated_by']}")
                if h["remark"]:
                    console.print(f"  备注: {h['remark']}")
        else:
            sessions = query.get_import_sessions(limit)
            console.print(Panel.fit("[bold]导入会话历史[/bold]", title="历史记录"))

            table = Table(show_header=True)
            table.add_column("时间")
            table.add_column("类型")
            table.add_column("文件")
            table.add_column("总数", justify="right")
            table.add_column("成功", justify="right")
            table.add_column("失败", justify="right")
            table.add_column("操作人")

            for s in sessions:
                table.add_row(
                    s["imported_at"][:19],
                    s["import_type"],
                    s["source_file"],
                    str(s["total_rows"]),
                    f"[green]{s['success_count']}[/green]",
                    f"[red]{s['failure_count']}[/red]",
                    s["imported_by"],
                )
            console.print(table)

    except Exception as e:
        console.print(f"[red]查询历史失败: {e}[/red]")
    finally:
        db.close()


@cli.command()
@click.option("--format", "-f", "fmt", default="excel",
              type=click.Choice(["excel", "csv"]),
              help="导出格式")
@click.option("--output", "-o", help="输出文件名")
@click.pass_context
def export(ctx, fmt, output):
    """导出数据"""
    try:
        PermissionChecker.require_permission(ctx.obj["user_role"], "export")
    except PermissionDeniedError as e:
        console.print(f"[red]{e}[/red]")
        return

    db = SessionLocal()

    try:
        exporter = Exporter(db)

        with console.status("[bold green]正在导出..."):
            if fmt == "excel":
                filepath = exporter.export_to_excel(output)
            else:
                filepath = exporter.export_valid_records_csv(output)

        console.print(Panel.fit(
            f"[green]导出完成！[/green]\n文件: {filepath}",
            title="导出成功"
        ))

    except Exception as e:
        console.print(f"[red]导出失败: {e}[/red]")
    finally:
        db.close()


if __name__ == "__main__":
    cli()
