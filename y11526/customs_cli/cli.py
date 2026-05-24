import os
import sys
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()


@click.group()
@click.version_option(version="1.0.0")
@click.pass_context
def cli(ctx):
    """跨境小包清关多源导入巡检 CLI"""
    ctx.ensure_object(dict)
    ctx.obj["console"] = console


from .commands import (
    init_cmd,
    import_cmd,
    check_cmd,
    fix_cmd,
    report_cmd,
    history_cmd,
    export_cmd,
    task_cmd,
)

cli.add_command(init_cmd.init, "init")
cli.add_command(import_cmd.import_data, "import")
cli.add_command(check_cmd.check, "check")
cli.add_command(fix_cmd.fix, "fix")
cli.add_command(report_cmd.report, "report")
cli.add_command(history_cmd.history, "history")
cli.add_command(export_cmd.export, "export")
cli.add_command(task_cmd.task, "task")


def main():
    try:
        cli(obj={})
    except KeyboardInterrupt:
        console.print("\n[yellow]操作已取消[/yellow]")
        sys.exit(0)
    except Exception as e:
        console.print(f"\n[red]错误: {str(e)}[/red]")
        if os.environ.get("DEBUG"):
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
