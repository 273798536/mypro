import click
from rich.table import Table
from rich.panel import Panel
from ..checker import run_checks


@click.command()
@click.option("--batch", "-b", "batch_id", help="指定批次号，不指定则检查全部")
@click.option("--async", "async_mode", is_flag=True, help="异步模式")
@click.pass_context
def check(ctx, batch_id, async_mode):
    """数据一致性校验"""
    console = ctx.obj["console"]

    if async_mode:
        import json
        import uuid
        from datetime import datetime
        from ..database import get_session, AsyncTask, TaskStatus

        session = get_session()
        task_id = f"TASK{uuid.uuid4().hex[:12].upper()}"

        task = AsyncTask(
            task_id=task_id,
            task_type="check",
            batch_id=batch_id,
            status=TaskStatus.PENDING,
            payload=json.dumps({"batch_id": batch_id}),
            created_by="system",
        )
        session.add(task)
        session.commit()
        session.close()

        console.print(Panel.fit(
            f"[green]异步任务创建成功！[/green]\n\n"
            f"任务ID: {task_id}\n"
            f"批次号: {batch_id or '全部'}\n"
            f"状态: pending",
            title="异步校验"
        ))
        return

    console.print(f"[cyan]正在校验数据...[/cyan]")
    if batch_id:
        console.print(f"[cyan]批次号: {batch_id}[/cyan]")

    result = run_checks(batch_id=batch_id)

    summary = Table(title="校验结果汇总")
    summary.add_column("检查项", style="cyan")
    summary.add_column("异常数", style="red", justify="right")

    check_names = {
        "missing_declarations": "有补税但无申报",
        "missing_tracking": "有申报但无轨迹",
        "tax_discrepancies": "税费差异",
        "supplier_mismatches": "供应商不一致",
        "split_package_issues": "拆分包裹税问题",
    }

    for key, name in check_names.items():
        count = result["breakdown"].get(key, 0)
        style = "red" if count > 0 else "green"
        summary.add_row(name, f"[{style}]{count}[/{style}]")

    summary.add_row("=" * 20, "=" * 10)
    total_style = "red" if result["total_exceptions"] > 0 else "green"
    summary.add_row("总计", f"[{total_style}]{result['total_exceptions']}[/{total_style}]")

    console.print(summary)

    if result["exceptions"]:
        detail_table = Table(title="异常明细", show_lines=True)
        detail_table.add_column("类型", style="cyan")
        detail_table.add_column("运单号", style="yellow")
        detail_table.add_column("严重程度", style="magenta")
        detail_table.add_column("说明", style="white")

        for exc in result["exceptions"]:
            severity_color = "red" if exc["severity"] == "error" else "yellow"
            detail_table.add_row(
                exc["type"],
                exc["tracking_number"],
                f"[{severity_color}]{exc['severity']}[/{severity_color}]",
                exc["message"]
            )

        console.print(detail_table)

    console.print(f"\n[cyan]校验时间: {result['check_time']}[/cyan]")
