import click
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt
from datetime import datetime
from ..database import (
    get_session, ExceptionRecord, Package, TaxNotice,
    SupplierStatement, AuditLog, DataSource
)


@click.group()
@click.pass_context
def fix(ctx):
    """数据修复与人工修正"""
    pass


@fix.command("list")
@click.option("--resolved", is_flag=True, help="显示已修复的")
@click.option("--batch", "-b", "batch_id", help="按批次过滤")
@click.option("--limit", "-l", default=50, help="显示数量")
@click.pass_context
def list_exceptions(ctx, resolved, batch_id, limit):
    """列出异常记录"""
    console = ctx.obj["console"]
    session = get_session()

    try:
        query = session.query(ExceptionRecord)
        if not resolved:
            query = query.filter(ExceptionRecord.is_resolved == False)
        if batch_id:
            query = query.filter(ExceptionRecord.batch_id == batch_id)

        exceptions = query.order_by(ExceptionRecord.created_at.desc()).limit(limit).all()

        if not exceptions:
            console.print("[yellow]没有找到异常记录[/yellow]")
            return

        table = Table(title=f"异常记录 ({'未修复' if not resolved else '已修复'})")
        table.add_column("ID", style="cyan")
        table.add_column("类型", style="blue")
        table.add_column("运单号", style="yellow")
        table.add_column("原始行号", justify="right")
        table.add_column("严重程度", style="magenta")
        table.add_column("状态", style="green")
        table.add_column("创建时间", style="white")

        for e in exceptions:
            status = "[green]已修复[/green]" if e.is_resolved else "[red]未修复[/red]"
            table.add_row(
                str(e.id),
                e.exception_type.value,
                e.tracking_number or "-",
                str(e.original_row) if e.original_row else "-",
                e.severity,
                status,
                e.created_at.strftime("%Y-%m-%d %H:%M")
            )

        console.print(table)
    finally:
        session.close()


@fix.command("show")
@click.argument("exception_id", type=int)
@click.pass_context
def show_exception(ctx, exception_id):
    """查看异常详情"""
    console = ctx.obj["console"]
    session = get_session()

    try:
        e = session.query(ExceptionRecord).get(exception_id)
        if not e:
            console.print(f"[red]异常记录不存在: {exception_id}[/red]")
            return

        info = f"""
[cyan]ID[/cyan]: {e.id}
[cyan]类型[/cyan]: {e.exception_type.value}
[cyan]批次[/cyan]: {e.batch_id}
[cyan]运单号[/cyan]: {e.tracking_number or '-'}
[cyan]原始行号[/cyan]: {e.original_row or '-'}
[cyan]严重程度[/cyan]: {e.severity}
[cyan]关联表[/cyan]: {e.related_table or '-'}
[cyan]关联ID[/cyan]: {e.related_id or '-'}
[cyan]字段[/cyan]: {e.field_name or '-'}
[cyan]期望值[/cyan]: {e.expected_value or '-'}
[cyan]实际值[/cyan]: {e.actual_value or '-'}
[cyan]说明[/cyan]: {e.message}
[cyan]状态[/cyan]: {'已修复' if e.is_resolved else '未修复'}
[cyan]创建时间[/cyan]: {e.created_at}
"""
        if e.is_resolved:
            info += f"""
[cyan]修复人[/cyan]: {e.resolved_by}
[cyan]修复时间[/cyan]: {e.resolved_at}
[cyan]修复备注[/cyan]: {e.resolution_note or '-'}
"""

        console.print(Panel(info, title="异常详情"))
    finally:
        session.close()


@fix.command("resolve")
@click.argument("exception_id", type=int)
@click.option("--user", "-u", default="system", help="操作人")
@click.option("--note", "-n", help="修复备注")
@click.option("--recheck", is_flag=True, help="标记后重新校验")
@click.pass_context
def resolve(ctx, exception_id, user, note, recheck):
    """标记异常为已修复"""
    console = ctx.obj["console"]
    session = get_session()

    try:
        e = session.query(ExceptionRecord).get(exception_id)
        if not e:
            console.print(f"[red]异常记录不存在: {exception_id}[/red]")
            return

        e.is_resolved = True
        e.resolved_by = user
        e.resolved_at = datetime.utcnow()
        e.resolution_note = note

        session.commit()
        console.print(f"[green]异常记录 {exception_id} 已标记为已修复[/green]")

        if recheck:
            from ..checker import run_checks
            console.print("[cyan]重新执行校验...[/cyan]")
            result = run_checks(batch_id=e.batch_id, session=session)
            console.print(f"[cyan]校验完成，发现 {result['total_exceptions']} 个异常[/cyan]")
    finally:
        session.close()


@fix.command("edit")
@click.argument("table_name", type=click.Choice(["packages", "tax_notices", "supplier_statements"]))
@click.argument("record_id", type=int)
@click.option("--field", "-f", required=True, help="字段名")
@click.option("--value", "-v", required=True, help="新值")
@click.option("--user", "-u", default="system", help="操作人")
@click.option("--remark", "-r", help="修改备注")
@click.pass_context
def edit_record(ctx, table_name, record_id, field, value, user, remark):
    """人工修改数据记录（会留下审计轨迹）"""
    console = ctx.obj["console"]
    session = get_session()

    try:
        model_map = {
            "packages": Package,
            "tax_notices": TaxNotice,
            "supplier_statements": SupplierStatement,
        }
        model = model_map[table_name]
        record = session.query(model).get(record_id)

        if not record:
            console.print(f"[red]记录不存在: {table_name}.{record_id}[/red]")
            return

        old_value = getattr(record, field, None)
        if old_value is None:
            console.print(f"[red]字段不存在: {field}[/red]")
            return

        try:
            if isinstance(old_value, (int, float)):
                new_value = type(old_value)(value)
            else:
                new_value = value
        except (ValueError, TypeError):
            console.print(f"[red]值类型转换失败[/red]")
            return

        setattr(record, field, new_value)

        audit = AuditLog(
            batch_id=getattr(record, "batch_id", None),
            table_name=table_name,
            record_id=record_id,
            action="manual_edit",
            field_name=field,
            old_value=str(old_value),
            new_value=str(new_value),
            changed_by=user,
            changed_at=datetime.utcnow(),
            comment=remark,
            original_row=getattr(record, "original_row", None)
        )
        session.add(audit)
        session.commit()

        console.print(Panel.fit(
            f"[green]修改成功！[/green]\n\n"
            f"表: {table_name}\n"
            f"记录ID: {record_id}\n"
            f"字段: {field}\n"
            f"原值: {old_value}\n"
            f"新值: {new_value}\n"
            f"操作人: {user}",
            title="人工修改"
        ))
    finally:
        session.close()


@fix.command("reimport")
@click.argument("exception_id", type=int)
@click.option("--user", "-u", default="system", help="操作人")
@click.pass_context
def reimport(ctx, exception_id, user):
    """重新导入失败的行（标记后准备重新导入）"""
    console = ctx.obj["console"]
    session = get_session()

    try:
        e = session.query(ExceptionRecord).get(exception_id)
        if not e:
            console.print(f"[red]异常记录不存在: {exception_id}[/red]")
            return

        source = session.query(DataSource).get(e.source_id)
        if not source:
            console.print("[red]找不到原始数据源[/red]")
            return

        console.print(Panel(
            f"请导出原始文件第 {e.original_row} 行，修正后使用 import 命令重新导入\n\n"
            f"文件: {source.file_name}\n"
            f"运单号: {e.tracking_number}\n"
            f"原始行号: {e.original_row}\n"
            f"问题: {e.message}",
            title="重新导入指引"
        ))
    finally:
        session.close()
