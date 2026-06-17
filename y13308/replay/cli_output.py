"""CLI 输出展示模块：使用 rich 美化输出，分开统计各类行数"""

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from typing import List, Dict, Any
from replay.models import Record, ProcessStats
from replay.constants import PROCESS_STATUS, EVAL_RESULT, MARK_DUPLICATE, MARK_OUTLIER

console = Console()


def print_process_summary(stats: ProcessStats) -> None:
    """输出处理摘要，明确区分已处理、跳过、坏行"""
    table = Table(title="📊 病历问答误判回放 - 处理统计", show_header=True, header_style="bold blue")

    table.add_column("统计项", style="cyan", no_wrap=True)
    table.add_column("数量", justify="right", style="bold")
    table.add_column("占比", justify="right")

    total = stats.total if stats.total > 0 else 1

    table.add_row(
        "📋 总样本数",
        str(stats.total),
        "100.0%"
    )
    table.add_row(
        "✅ 已处理",
        f"[green]{stats.processed}[/green]",
        f"{stats.processed/total*100:.1f}%"
    )
    table.add_row(
        "⏭️  已跳过",
        f"[yellow]{stats.skipped}[/yellow]",
        f"{stats.skipped/total*100:.1f}%"
    )
    table.add_row(
        "❌ 坏行",
        f"[red]{stats.bad}[/red]",
        f"{stats.bad/total*100:.1f}%"
    )

    console.print()
    console.print(Panel(table, border_style="blue"))


def print_eval_breakdown(stats: ProcessStats) -> None:
    """输出评测结果细分"""
    if stats.processed == 0:
        return

    table = Table(title="🎯 已处理样本评测结果", show_header=True, header_style="bold magenta")
    table.add_column("评测结论", style="cyan")
    table.add_column("数量", justify="right", style="bold")
    table.add_column("占比", justify="right")

    processed = stats.processed if stats.processed > 0 else 1

    table.add_row(
        "✔️ 正确",
        f"[green]{stats.correct}[/green]",
        f"{stats.correct/processed*100:.1f}%"
    )
    table.add_row(
        "✖️ 误判",
        f"[red]{stats.wrong}[/red]",
        f"{stats.wrong/processed*100:.1f}%"
    )
    table.add_row(
        "❓ 不确定",
        f"[yellow]{stats.uncertain}[/yellow]",
        f"{stats.uncertain/processed*100:.1f}%"
    )
    table.add_row(
        "🔄 重复评测",
        f"[magenta]{stats.duplicates}[/magenta]",
        f"{stats.duplicates/processed*100:.1f}%"
    )

    accuracy = stats.correct / processed * 100
    table.add_row(
        "📈 准确率",
        f"[bold]{accuracy:.1f}%[/bold]",
        ""
    )

    console.print(Panel(table, border_style="magenta"))


def print_outliers(stats: ProcessStats) -> None:
    """输出拉偏结论的样本"""
    if not stats.outliers:
        console.print("[green]✅ 未检测到明显拉偏结论的样本[/green]")
        return

    table = Table(title="⚠️ 可能拉偏结论的样本", show_header=True, header_style="bold red")
    table.add_column("序号", justify="right")
    table.add_column("样本ID", style="bold yellow")

    for i, oid in enumerate(stats.outliers, 1):
        table.add_row(str(i), oid)

    console.print(Panel(table, border_style="red"))


def print_records_table(records: List[Record], limit: int = 50, show_duplicates: bool = True) -> None:
    """以表格形式展示记录列表"""
    display_records = records[:limit]

    table = Table(title=f"📝 样本详情 (共 {len(records)} 条，显示前 {len(display_records)} 条)",
                  show_header=True, header_style="bold cyan")

    table.add_column("ID", style="bold", no_wrap=True)
    table.add_column("来源", style="cyan")
    table.add_column("状态", style="magenta")
    table.add_column("评测结论", style="green")
    table.add_column("置信度", justify="right")
    table.add_column("标记", style="yellow")

    for rec in display_records:
        marks = []
        if rec.is_duplicate and show_duplicates:
            marks.append(f"[magenta]{MARK_DUPLICATE}[/magenta]")
        if rec.is_outlier:
            marks.append(f"[red]{MARK_OUTLIER}[/red]")
        mark_str = " ".join(marks) if marks else "-"

        status_style = "green" if rec.status == PROCESS_STATUS["PROCESSED"] else \
                      "yellow" if rec.status == PROCESS_STATUS["SKIPPED"] else "red"

        eval_style = "green" if rec.eval_result == EVAL_RESULT["CORRECT"] else \
                    "red" if rec.eval_result == EVAL_RESULT["WRONG"] else "yellow"

        score_str = f"{rec.score:.3f}" if rec.score is not None else "-"

        table.add_row(
            rec.record_id,
            rec.source,
            f"[{status_style}]{rec.status}[/{status_style}]",
            f"[{eval_style}]{rec.eval_result or '-'}[/{eval_style}]",
            score_str,
            mark_str
        )

    console.print()
    console.print(table)


def print_record_detail(record: Record) -> None:
    """输出单条记录的详细信息"""
    console.print()
    console.print(Panel(f"[bold cyan]样本 ID: {record.record_id}[/bold cyan]", border_style="cyan"))

    info_table = Table(show_header=False, box=None)
    info_table.add_column("字段", style="bold cyan", width=15)
    info_table.add_column("值", style="white")

    info_table.add_row("来源", record.source)
    info_table.add_row("处理状态", record.status)
    info_table.add_row("评测结论", record.eval_result or "-")
    info_table.add_row("置信度", f"{record.score:.3f}" if record.score is not None else "-")

    marks = []
    if record.is_duplicate:
        marks.append(f"[magenta]{MARK_DUPLICATE}[/magenta]")
    if record.is_outlier:
        marks.append(f"[red]{MARK_OUTLIER}[/red]")
    info_table.add_row("标记", "、".join(marks) if marks else "-")

    if record.question:
        info_table.add_row("问题", record.question[:100] + ("..." if len(record.question) > 100 else ""))
    if record.answer:
        info_table.add_row("回答", record.answer[:100] + ("..." if len(record.answer) > 100 else ""))
    if record.label:
        info_table.add_row("金标准", str(record.label))
    if record.prediction:
        info_table.add_row("预测结果", str(record.prediction))
    if record.notes:
        info_table.add_row("备注", "；".join(record.notes))

    console.print(info_table)


def print_field_mapping(column_mapping: Dict[str, Any], warnings: List[str]) -> None:
    """输出字段映射情况"""
    console.print()
    table = Table(title="🔗 字段识别与映射", show_header=True, header_style="bold green")
    table.add_column("标准字段", style="cyan")
    table.add_column("原始列名", style="white")
    table.add_column("状态", style="bold")

    for field, col in column_mapping.items():
        status = "[green]✓ 已识别[/green]" if col else "[yellow]✗ 缺失(使用默认)[/yellow]"
        table.add_row(field, col or "-", status)

    console.print(Panel(table, border_style="green"))

    if warnings:
        console.print()
        console.print("[bold yellow]⚠️  字段警告:[/bold yellow]")
        for w in warnings:
            console.print(f"  [yellow]• {w}[/yellow]")


def print_threshold_info(threshold: float) -> None:
    """输出当前阈值信息"""
    console.print()
    console.print(f"[bold]🔍 当前置信度阈值:[/bold] [cyan]{threshold}[/cyan] "
                  f"(低于此值的预测标记为不确定)")
