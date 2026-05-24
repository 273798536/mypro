import click
import json
from rich.table import Table
from rich.panel import Panel
from ..task_manager import TaskManager
from ..database import TaskStatus


@click.group()
@click.pass_context
def task(ctx):
    """异步任务管理"""
    pass


@task.command("list")
@click.option("--status", "-s", type=click.Choice(["pending", "processing", "wait_retry",
                                                     "wait_manual", "permanent_failed", "completed"]),
              help="按状态过滤")
@click.option("--limit", "-l", default=20, help="显示数量")
@click.pass_context
def list_tasks(ctx, status, limit):
    """列出任务"""
    console = ctx.obj["console"]
    status_enum = TaskStatus(status) if status else None

    with TaskManager() as tm:
        tasks = tm.list_tasks(status=status_enum, limit=limit)

        if not tasks:
            console.print("[yellow]没有找到任务[/yellow]")
            return

        table = Table(title="任务列表")
        table.add_column("任务ID", style="cyan")
        table.add_column("类型", style="blue")
        table.add_column("批次号", style="green")
        table.add_column("状态", style="magenta")
        table.add_column("进度", style="yellow")
        table.add_column("重试", justify="center")
        table.add_column("创建时间", style="white")

        status_colors = {
            TaskStatus.PENDING: "white",
            TaskStatus.PROCESSING: "blue",
            TaskStatus.WAIT_RETRY: "yellow",
            TaskStatus.WAIT_MANUAL: "bright_yellow",
            TaskStatus.PERMANENT_FAILED: "red",
            TaskStatus.COMPLETED: "green",
        }

        for t in tasks:
            color = status_colors.get(t.status, "white")
            table.add_row(
                t.task_id,
                t.task_type,
                t.batch_id or "-",
                f"[{color}]{t.status.value}[/{color}]",
                f"{t.progress}%",
                f"{t.retry_count}/{t.max_retries}",
                t.created_at.strftime("%Y-%m-%d %H:%M")
            )

        console.print(table)


@task.command("run")
@click.argument("task_id", required=False)
@click.option("--all", is_flag=True, help="运行所有待处理任务")
@click.pass_context
def run_task(ctx, task_id, all):
    """运行任务"""
    console = ctx.obj["console"]

    if not task_id and not all:
        console.print("[red]请指定任务ID或使用 --all 运行所有任务[/red]")
        return

    with TaskManager() as tm:
        if all:
            console.print("[cyan]运行所有待处理任务...[/cyan]")
            results = tm.run_pending_tasks()
            for r in results:
                console.print(f"  {r['task_id']}: {r['status']}")
        else:
            result = tm.run_task(task_id)
            error_msg = f"错误: {result.get('error', '')}" if 'error' in result else ""
            console.print(Panel.fit(
                f"任务ID: {task_id}\n"
                f"状态: {result['status']}\n"
                f"{error_msg}",
                title="任务执行结果"
            ))


@task.command("show")
@click.argument("task_id")
@click.pass_context
def show_task(ctx, task_id):
    """查看任务详情"""
    console = ctx.obj["console"]

    with TaskManager() as tm:
        task = tm.get_task(task_id)
        if not task:
            console.print(f"[red]任务不存在: {task_id}[/red]")
            return

        info = f"""
[cyan]任务ID[/cyan]: {task.task_id}
[cyan]类型[/cyan]: {task.task_type}
[cyan]批次号[/cyan]: {task.batch_id or '-'}
[cyan]状态[/cyan]: {task.status.value}
[cyan]进度[/cyan]: {task.progress}%
[cyan]重试次数[/cyan]: {task.retry_count}/{task.max_retries}
[cyan]创建人[/cyan]: {task.created_by}
[cyan]创建时间[/cyan]: {task.created_at}
[cyan]开始时间[/cyan]: {task.started_at or '-'}
[cyan]完成时间[/cyan]: {task.completed_at or '-'}
"""
        if task.error_message:
            info += f"\n[red]错误信息[/red]: {task.error_message}"

        if task.result:
            try:
                result_json = json.dumps(json.loads(task.result), indent=2, ensure_ascii=False)
                info += f"\n[green]执行结果[/green]:\n{result_json}"
            except:
                info += f"\n[green]执行结果[/green]: {task.result}"

        console.print(Panel(info, title="任务详情"))


@task.command("reset")
@click.argument("task_id")
@click.pass_context
def reset(ctx, task_id):
    """重置任务状态"""
    console = ctx.obj["console"]

    with TaskManager() as tm:
        if tm.reset_task(task_id):
            console.print(f"[green]任务 {task_id} 已重置为 pending 状态[/green]")
        else:
            console.print(f"[red]任务不存在: {task_id}[/red]")


@task.command("manual")
@click.argument("task_id")
@click.option("--note", "-n", help="备注信息")
@click.pass_context
def mark_manual(ctx, task_id, note):
    """标记为等待人工处理"""
    console = ctx.obj["console"]

    with TaskManager() as tm:
        if tm.mark_manual(task_id, note):
            console.print(f"[green]任务 {task_id} 已标记为等待人工处理[/green]")
        else:
            console.print(f"[red]任务不存在: {task_id}[/red]")


@task.command("resume")
@click.pass_context
def resume(ctx):
    """恢复中断的任务（服务重启后）"""
    console = ctx.obj["console"]

    with TaskManager() as tm:
        count = tm.resume_tasks()
        if count > 0:
            console.print(f"[green]已恢复 {count} 个中断的任务[/green]")
        else:
            console.print("[yellow]没有需要恢复的任务[/yellow]")
