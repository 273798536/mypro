import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import click
import yaml
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .tracker import FederationTracker
from .models import TaskRecord, GrayConfig, ProcessingResult, RecordIssue
from .storage import StateStorage

console = Console()


def _load_config(config_path: str) -> GrayConfig:
    with open(config_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return GrayConfig(**data)


def _print_result(result: ProcessingResult) -> None:
    console.print()
    console.print(Panel.fit(
        Text("联邦客户端任务追踪 - 处理结果", style="bold cyan"),
        border_style="cyan",
    ))
    console.print()

    stats_table = Table(title="📊 处理统计", show_header=True, header_style="bold magenta")
    stats_table.add_column("类别", style="dim", width=12)
    stats_table.add_column("数量", justify="right", width=8)
    stats_table.add_column("占比", justify="right", width=10)
    stats_table.add_column("状态", justify="center", width=10)

    total = result.total
    if total > 0:
        stats_table.add_row(
            "总数",
            str(total),
            "100.00%",
            "✅",
        )
        stats_table.add_row(
            "[green]已处理[/green]",
            f"[green]{result.processed}[/green]",
            f"[green]{result.processed/total*100:.2f}%[/green]",
            "[green]✓[/green]",
        )
        stats_table.add_row(
            "[yellow]跳过[/yellow]",
            f"[yellow]{result.skipped}[/yellow]",
            f"[yellow]{result.skipped/total*100:.2f}%[/yellow]",
            "[yellow]⚠[/yellow]",
        )
        stats_table.add_row(
            "[red]坏行[/red]",
            f"[red]{result.bad_records}[/red]",
            f"[red]{result.bad_records/total*100:.2f}%[/red]",
            "[red]✗[/red]",
        )
        stats_table.add_row(
            "[blue]改判[/blue]",
            f"[blue]{result.revised}[/blue]",
            f"[blue]{result.revised/total*100:.2f}%[/blue]",
            "[blue]↺[/blue]",
        )

    console.print(stats_table)
    console.print()

    if result.skipped_ids:
        skip_table = Table(title="⚠️  跳过记录详情", show_header=True, header_style="bold yellow")
        skip_table.add_column("任务 ID", style="yellow")
        skip_table.add_column("跳过原因", style="white")
        for tid in result.skipped_ids:
            skip_table.add_row(tid, result.skip_reasons.get(tid, "未知原因"))
        console.print(skip_table)
        console.print()

    if result.bad_record_details:
        bad_table = Table(title="❌ 坏行记录详情", show_header=True, header_style="bold red")
        bad_table.add_column("任务 ID", style="red")
        bad_table.add_column("问题类型", style="red")
        bad_table.add_column("问题描述", style="white", overflow="fold")
        for detail in result.bad_record_details:
            bad_table.add_row(
                detail["task_id"],
                detail["issue"],
                detail["description"],
            )
        console.print(bad_table)
        console.print()

    if result.revision_explanations:
        console.print(Panel.fit(
            Text("🔄 改判解释（v2 模型修正 v1 误判）", style="bold blue"),
            border_style="blue",
        ))
        for task_id, explanation in result.revision_explanations.items():
            console.print(f"[blue]{explanation}[/blue]")
            console.print()

    console.print(f"[dim]运行 ID: {result.run_id}[/dim]")
    console.print(f"[dim]开始时间: {result.started_at.strftime('%Y-%m-%d %H:%M:%S')}[/dim]")
    if result.finished_at:
        duration = (result.finished_at - result.started_at).total_seconds()
        console.print(f"[dim]完成时间: {result.finished_at.strftime('%Y-%m-%d %H:%M:%S')}[/dim]")
        console.print(f"[dim]耗时: {duration:.2f}s[/dim]")
    console.print()

    if result.bad_records > 0:
        console.print(
            Panel.fit(
                Text(
                    "坏材料排查指引:\n"
                    "  1. 查看 .fed_tracker_state/task_records.json → 完整记录\n"
                    "  2. 查看 .fed_tracker_state/historical_notes.json → 历史备注\n"
                    "  3. 查看 .fed_tracker_state/task_summary.json → 页面摘要\n"
                    "  4. 运行 fed-tracker verify → 校验状态一致性",
                    style="yellow",
                ),
                border_style="yellow",
                title="🔍 排查路径",
            )
        )


@click.group()
def cli():
    """联邦客户端任务追踪系统"""
    pass


@cli.command()
@click.argument("config_path", type=click.Path(exists=True))
@click.option("--run-id", help="指定运行 ID，不指定则自动生成")
@click.option("--clear-state", is_flag=True, help="运行前清除历史状态")
def run(config_path: str, run_id: Optional[str], clear_state: bool):
    """运行联邦客户端任务追踪，使用指定灰度配置"""
    if clear_state:
        storage = StateStorage()
        storage.clear()
        console.print("[yellow]已清除历史状态[/yellow]")

    try:
        config = _load_config(config_path)
    except Exception as e:
        console.print(f"[red]配置加载失败: {e}[/red]")
        raise click.Abort()

    if not config.enabled:
        console.print(f"[yellow]配置 '{config.name}' 已禁用，跳过处理[/yellow]")
        return

    console.print(f"[cyan]加载灰度配置: {config.name}[/cyan]")
    console.print(f"[dim]{config.description}[/dim]")
    console.print(f"[dim]共 {len(config.records)} 条记录[/dim]")

    tracker = FederationTracker()
    result = tracker.process(config.records, run_id=run_id)
    _print_result(result)


@cli.command("run-sample")
@click.option("--clear-state", is_flag=True, help="运行前清除历史状态")
def run_sample(clear_state: bool):
    """使用内置灰度样本运行（贴近现场的混合样例）"""
    sample_path = Path(__file__).parent.parent / "config" / "gray" / "sample_gray_config.yaml"
    if not sample_path.exists():
        console.print(f"[red]样本配置不存在: {sample_path}[/red]")
        raise click.Abort()

    config_path = str(sample_path)
    if clear_state:
        storage = StateStorage()
        storage.clear()
        console.print("[yellow]已清除历史状态[/yellow]")

    config = _load_config(config_path)
    console.print(f"[cyan]加载灰度配置: {config.name}[/cyan]")
    console.print(f"[dim]{config.description}[/dim]")
    console.print(f"[dim]共 {len(config.records)} 条记录[/dim]")

    tracker = FederationTracker()
    result = tracker.process(config.records)
    _print_result(result)


@cli.command()
def summary():
    """查看当前任务摘要"""
    tracker = FederationTracker()
    s = tracker.get_summary()
    if not s:
        console.print("[yellow]暂无任务摘要，请先运行追踪任务[/yellow]")
        return

    console.print()
    console.print(Panel.fit(
        Text("📋 任务摘要", style="bold cyan"),
        border_style="cyan",
    ))
    console.print()

    t = Table(show_header=False, box=None)
    t.add_column("字段", style="dim", width=16)
    t.add_column("值")
    t.add_row("运行 ID", s.run_id)
    t.add_row("状态", "[green]完成[/green]" if s.status == "completed" else "[yellow]有问题[/yellow]")
    t.add_row("总数", str(s.total))
    t.add_row("已处理", f"[green]{s.processed}[/green]")
    t.add_row("跳过", f"[yellow]{s.skipped}[/yellow]")
    t.add_row("坏行", f"[red]{s.bad_records}[/red]")
    t.add_row("改判", f"[blue]{s.revised}[/blue]")
    t.add_row("开始时间", s.started_at.strftime("%Y-%m-%d %H:%M:%S"))
    if s.finished_at:
        t.add_row("完成时间", s.finished_at.strftime("%Y-%m-%d %H:%M:%S"))
    console.print(t)
    console.print()

    console.print(Panel(
        Text(s.page_summary, style="white"),
        title="📄 页面摘要",
        border_style="green",
    ))
    console.print()

    if s.historical_notes:
        notes_panel = Panel(
            "\n".join(s.historical_notes[-10:]),
            title="📝 最近历史备注",
            border_style="blue",
        )
        console.print(notes_panel)


@cli.command()
def verify():
    """校验状态一致性（重启/重跑后验证）"""
    tracker = FederationTracker()
    result = tracker.verify_state()

    console.print()
    console.print(Panel.fit(
        Text("🔍 状态一致性校验", style="bold magenta"),
        border_style="magenta",
    ))
    console.print()

    all_ok = True
    for key, value in result.items():
        status = "[green]✓ 一致[/green]" if value else "[red]✗ 不一致[/red]"
        if not value:
            all_ok = False
        console.print(f"  {key}: {status}")

    console.print()
    if all_ok:
        console.print("[green]✅ 所有状态一致，历史备注、当前状态、页面摘要均对齐[/green]")
    else:
        console.print("[red]❌ 存在不一致，请检查 .fed_tracker_state/ 目录下的文件[/red]")


@cli.command()
@click.option("--force", is_flag=True, help="强制清除，不提示确认")
def clear(force: bool):
    """清除所有历史状态"""
    if not force:
        confirm = click.confirm("确定要清除所有历史状态吗？此操作不可撤销")
        if not confirm:
            return

    storage = StateStorage()
    storage.clear()
    console.print("[green]✓ 已清除所有历史状态[/green]")


if __name__ == "__main__":
    cli()
