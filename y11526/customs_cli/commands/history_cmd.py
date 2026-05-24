import click
from rich.table import Table
from ..database import get_session, AuditLog, DataSource


@click.group()
@click.pass_context
def history(ctx):
    """查看历史记录"""
    pass


@history.command("audit")
@click.option("--batch", "-b", "batch_id", help="按批次过滤")
@click.option("--table", "-t", "table_name", help="按表名过滤")
@click.option("--action", "-a", help="按操作类型过滤 (create/update/delete/manual_edit)")
@click.option("--user", "-u", help="按操作人过滤")
@click.option("--limit", "-l", default=100, help="显示数量")
@click.pass_context
def audit_log(ctx, batch_id, table_name, action, user, limit):
    """查看审计历史（谁在什么时候改了什么）"""
    console = ctx.obj["console"]
    session = get_session()

    try:
        query = session.query(AuditLog).order_by(AuditLog.changed_at.desc())

        if batch_id:
            query = query.filter(AuditLog.batch_id == batch_id)
        if table_name:
            query = query.filter(AuditLog.table_name == table_name)
        if action:
            query = query.filter(AuditLog.action == action)
        if user:
            query = query.filter(AuditLog.changed_by == user)

        logs = query.limit(limit).all()

        if not logs:
            console.print("[yellow]没有找到历史记录[/yellow]")
            return

        table = Table(title="审计历史")
        table.add_column("时间", style="cyan", width=16)
        table.add_column("批次", style="green", width=12)
        table.add_column("表", style="blue")
        table.add_column("记录ID", justify="right")
        table.add_column("操作", style="magenta")
        table.add_column("字段", style="yellow")
        table.add_column("原值", style="red")
        table.add_column("新值", style="green")
        table.add_column("操作人", style="white")
        table.add_column("原始行", justify="right")

        for log in logs:
            table.add_row(
                log.changed_at.strftime("%m-%d %H:%M:%S"),
                log.batch_id or "-",
                log.table_name,
                str(log.record_id),
                log.action,
                log.field_name or "-",
                (log.old_value or "")[:20],
                (log.new_value or "")[:20],
                log.changed_by,
                str(log.original_row) if log.original_row else "-"
            )

        console.print(table)
    finally:
        session.close()


@history.command("sources")
@click.option("--batch", "-b", "batch_id", help="按批次过滤")
@click.option("--limit", "-l", default=50, help="显示数量")
@click.pass_context
def sources(ctx, batch_id, limit):
    """查看数据源导入历史"""
    console = ctx.obj["console"]
    session = get_session()

    try:
        query = session.query(DataSource).order_by(DataSource.imported_at.desc())
        if batch_id:
            query = query.filter(DataSource.batch_id == batch_id)

        sources_list = query.limit(limit).all()

        if not sources_list:
            console.print("[yellow]没有找到数据源记录[/yellow]")
            return

        table = Table(title="导入历史")
        table.add_column("批次", style="green")
        table.add_column("类型", style="cyan")
        table.add_column("文件名", style="blue")
        table.add_column("策略", style="magenta")
        table.add_column("总行", justify="right")
        table.add_column("成功", justify="right", style="green")
        table.add_column("失败", justify="right", style="red")
        table.add_column("操作人", style="white")
        table.add_column("导入时间", style="white")

        for s in sources_list:
            table.add_row(
                s.batch_id,
                s.source_type.value,
                s.file_name,
                s.import_strategy.value,
                str(s.total_rows),
                str(s.success_rows),
                str(s.failed_rows),
                s.imported_by,
                s.imported_at.strftime("%Y-%m-%d %H:%M")
            )

        console.print(table)
    finally:
        session.close()
