import click
from rich.table import Table
from rich.panel import Panel
from ..importer import import_file
from ..database import DataSourceType, ImportStrategy


@click.command("import")
@click.argument("filepath", type=click.Path(exists=True))
@click.option("--type", "-t", "source_type", required=True,
              type=click.Choice(["declaration", "tracking", "tax_notice",
                                 "supplier_statement", "approval_email", "split_package"]),
              help="数据类型: declaration(申报表), tracking(轨迹节点), "
                   "tax_notice(补税通知), supplier_statement(供应商对账单), "
                   "approval_email(审批邮件), split_package(拆分包裹)")
@click.option("--strategy", "-s", default="append",
              type=click.Choice(["ignore", "overwrite", "append"]),
              help="导入策略: ignore(忽略重复), overwrite(覆盖), append(追加)")
@click.option("--batch", "-b", "batch_id", help="指定批次号，不指定则自动生成")
@click.option("--user", "-u", default="system", help="操作人")
@click.option("--async", "async_mode", is_flag=True, help="异步模式")
@click.pass_context
def import_data(ctx, filepath, source_type, strategy, batch_id, user, async_mode):
    """导入数据文件（CSV/Excel）"""
    console = ctx.obj["console"]

    type_map = {
        "declaration": DataSourceType.DECLARATION,
        "tracking": DataSourceType.TRACKING,
        "tax_notice": DataSourceType.TAX_NOTICE,
        "supplier_statement": DataSourceType.SUPPLIER_STATEMENT,
        "approval_email": DataSourceType.APPROVAL_EMAIL,
        "split_package": DataSourceType.DECLARATION,
    }
    strategy_map = {
        "ignore": ImportStrategy.IGNORE,
        "overwrite": ImportStrategy.OVERWRITE,
        "append": ImportStrategy.APPEND,
    }

    type_names = {
        "declaration": "申报表",
        "tracking": "轨迹节点",
        "tax_notice": "补税通知",
        "supplier_statement": "供应商对账单",
        "approval_email": "审批邮件",
        "split_package": "拆分包裹",
    }

    console.print(f"[cyan]正在导入[/cyan]: {filepath}")
    console.print(f"[cyan]数据类型[/cyan]: {type_names[source_type]}")
    console.print(f"[cyan]导入策略[/cyan]: {strategy}")

    try:
        result = import_file(
            filepath=filepath,
            source_type=type_map[source_type],
            strategy=strategy_map[strategy],
            batch_id=batch_id,
            user=user,
            async_mode=async_mode
        )

        if async_mode:
            console.print(Panel.fit(
                f"[green]异步任务创建成功！[/green]\n\n"
                f"任务ID: {result['task_id']}\n"
                f"批次号: {result['batch_id']}\n"
                f"状态: {result['status']}",
                title="异步导入"
            ))
        else:
            table = Table(title="导入结果")
            table.add_column("项目", style="cyan")
            table.add_column("值", style="green")
            table.add_row("批次号", result["batch_id"])
            table.add_row("数据源ID", str(result["source_id"]))
            table.add_row("总行数", str(result["total_rows"]))
            table.add_row("成功行数", str(result["success_rows"]))
            table.add_row("失败行数", str(result["failed_rows"]))
            console.print(table)

            if result["failed_details"]:
                failed_table = Table(title="失败明细", show_lines=True)
                failed_table.add_column("原始行号", style="red", justify="right")
                failed_table.add_column("错误信息", style="red")
                for row_num, error in result["failed_details"]:
                    failed_table.add_row(str(row_num), error)
                console.print(failed_table)

    except Exception as e:
        console.print(f"[red]导入失败: {str(e)}[/red]")
        raise
