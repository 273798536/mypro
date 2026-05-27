import os
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint

from . import __version__
from .reader import DataReader
from .processor import RecordProcessor
from .exporter import ResultExporter

console = Console()


@click.group()
@click.version_option(__version__, '-v', '--version')
def main():
    """医保个人账户划拨 CLI 工具 - 理清门诊报销和自费扣款流程"""
    pass


@main.command()
@click.option('--input', '-i', required=True, type=click.Path(exists=True, file_okay=False),
              help='输入数据目录，包含医保流水、门诊票据等文件')
@click.option('--output', '-o', required=True, type=click.Path(file_okay=False),
              help='输出结果目录')
@click.option('--quiet', '-q', is_flag=True, help='安静模式，减少输出')
def process(input, output, quiet):
    """处理医保数据，生成账户账本和分析报告"""

    if not quiet:
        console.print(Panel.fit(
            f"[bold blue]医保个人账户划拨处理工具[/bold blue]\n"
            f"版本: {__version__}",
            border_style="blue"
        ))

    output_path = Path(output)
    output_path.mkdir(parents=True, exist_ok=True)

    if not quiet:
        console.print(f"\n[cyan]📂 读取数据...[/cyan]")
        console.print(f"  输入目录: {input}")

    reader = DataReader(input)
    records = reader.read_all()

    if not quiet:
        total = sum(len(v) for v in records.values())
        console.print(f"  [green]✓ 共读取 {total} 条记录[/green]")
        for key, value in records.items():
            if value:
                console.print(f"    - {key}: {len(value)} 条")

    if not quiet:
        console.print(f"\n[cyan]🔍 分析处理中...[/cyan]")

    processor = RecordProcessor(records, input, output)
    result = processor.process()

    if not quiet:
        _print_summary_table(result)

    if not quiet:
        console.print(f"\n[cyan]📤 导出结果...[/cyan]")

    exporter = ResultExporter(output, result.run_id)
    run_dir = exporter.export_all(result, records)

    if not quiet:
        console.print(f"  [green]✓ 结果已保存到:[/green] {run_dir}")
        _print_output_structure(run_dir)

    if result.warnings and not quiet:
        console.print(f"\n[yellow]⚠️  发现 {len(result.warnings)} 个警告，请检查输出报告[/yellow]")

    if result.needs_review_records > 0 and not quiet:
        console.print(f"[red]❗ 有 {result.needs_review_records} 条记录需要人工确认[/red]")

    if not quiet:
        console.print(f"\n[bold green]✓ 处理完成！运行编号: {result.run_id}[/bold green]")

    return 0


@main.command('list-runs')
@click.option('--output', '-o', required=True, type=click.Path(exists=True, file_okay=False),
              help='输出结果目录')
def list_runs(output):
    """列出所有历史运行记录"""

    output_path = Path(output)
    if not output_path.exists():
        console.print(f"[red]错误: 目录不存在 {output}[/red]")
        return

    runs = []
    for item in output_path.iterdir():
        if item.is_dir() and item.name.startswith('run_'):
            summary_file = item / 'summary.json'
            if summary_file.exists():
                import json
                with open(summary_file, 'r', encoding='utf-8') as f:
                    summary = json.load(f)
                    runs.append(summary)

    if not runs:
        console.print("[yellow]未找到历史运行记录[/yellow]")
        return

    runs.sort(key=lambda x: x['run_time'], reverse=True)

    table = Table(title="历史运行记录")
    table.add_column("运行编号", style="cyan")
    table.add_column("运行时间", style="green")
    table.add_column("总记录", justify="right")
    table.add_column("警告", justify="right")
    table.add_column("账本数", justify="right")

    for run in runs[:10]:
        table.add_row(
            run['run_id'],
            run['run_time'][:19].replace('T', ' '),
            str(run['statistics']['total_records']),
            str(run['warning_count']),
            str(run['ledger_count'])
        )

    console.print(table)


@main.command()
@click.option('--output', '-o', required=True, type=click.Path(exists=True, file_okay=False),
              help='输出结果目录')
@click.argument('run_id')
def show(output, run_id):
    """查看指定运行的详细报告"""

    output_path = Path(output)

    run_dir = None
    for item in output_path.iterdir():
        if item.is_dir() and run_id in item.name:
            run_dir = item
            break

    if not run_dir:
        console.print(f"[red]错误: 未找到运行编号 {run_id}[/red]")
        return

    summary_file = run_dir / 'summary.txt'
    if summary_file.exists():
        with open(summary_file, 'r', encoding='utf-8') as f:
            console.print(f.read())
    else:
        console.print(f"[yellow]未找到摘要文件[/yellow]")


def _print_summary_table(result):
    table = Table(title="处理结果统计")
    table.add_column("类别", style="cyan")
    table.add_column("数量", justify="right")
    table.add_column("说明", style="dim")

    table.add_row("总记录数", str(result.total_records), "")
    table.add_row("未处理", str(result.pending_records), "待进一步确认")
    table.add_row("已确认", str(result.verified_records), "正常记录")
    table.add_row("已修正", str(result.corrected_records), "[green]自动修正[/green]")
    table.add_row("需人工确认", str(result.needs_review_records), "[yellow]待审核[/yellow]")
    table.add_row("跨月报销", str(result.cross_month_records), "[blue]特殊标记[/blue]")
    table.add_row("重复记录", str(result.duplicate_records), "[red]已排除[/red]")

    console.print(table)


def _print_output_structure(run_dir: str):
    path = Path(run_dir)
    console.print("  输出结构:")
    for item in sorted(path.iterdir()):
        if item.is_file():
            console.print(f"    ├── {item.name}")
        else:
            count = len(list(item.iterdir()))
            console.print(f"    ├── {item.name}/ ({count}个文件)")


if __name__ == '__main__':
    main()
