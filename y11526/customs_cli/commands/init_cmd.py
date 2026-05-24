import os
import click
from rich.panel import Panel
from ..database import init_db, DB_PATH


@click.command()
@click.option("--force", "-f", is_flag=True, help="强制重新初始化（会清除所有数据）")
@click.pass_context
def init(ctx, force):
    """初始化本地数据库"""
    console = ctx.obj["console"]
    
    if force and os.path.exists(DB_PATH):
        if not click.confirm("确定要清除所有数据并重新初始化吗？", default=False):
            console.print("[yellow]已取消操作[/yellow]")
            return
        os.remove(DB_PATH)
        console.print("[yellow]已删除旧数据库[/yellow]")
    
    try:
        init_db()
        console.print(Panel.fit(
            f"[green]数据库初始化成功！[/green]\n\n"
            f"数据库路径: {DB_PATH}\n"
            f"包含表: data_sources, packages, tracking_nodes, tax_notices, "
            f"supplier_statements, approval_emails, tax_records, exception_records, "
            f"async_tasks, audit_logs",
            title="初始化完成"
        ))
    except Exception as e:
        console.print(f"[red]初始化失败: {str(e)}[/red]")
        raise
