from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .detector import ConflictDetector, TimecodeValidator
from .history import HistoryManager
from .models import (
    ConflictType,
    ItemStatus,
    ProcessingResult,
)
from .parser import DataParser
from .report import CONFLICT_TYPE_LABELS, DutyViewGenerator, TimelineGenerator

console = Console()


class FestivalScheduler:
    def __init__(
        self,
        schedule_file: str,
        audio_dir: str,
        history_dir: str,
    ):
        self.schedule_file = schedule_file
        self.audio_dir = audio_dir
        self.history_dir = history_dir

        self.result = ProcessingResult()
        self.parser = DataParser(self.result)
        self.detector = ConflictDetector(self.result)
        self.history_manager = HistoryManager(history_dir, self.result)
        self.timeline_generator = TimelineGenerator(self.result)
        self.duty_view_generator = DutyViewGenerator(self.result)

    def load_existing_history(self):
        self.history_manager.load_history()

    def run(self, auto_process: bool = True, interactive: bool = False):
        console.print(Panel.fit(
            "[bold cyan]🎵 音乐节摊位排期冲突检测[/bold cyan]\n"
            f"[dim]曲目表: {self.schedule_file}[/dim]\n"
            f"[dim]音频目录: {self.audio_dir}[/dim]",
            border_style="cyan",
        ))
        console.print()

        with console.status("[bold green]正在解析曲目表..."):
            schedule_items, bad_rows, skipped_rows = self.parser.parse_schedule(self.schedule_file)
            self.result.schedule_items = schedule_items
            self.result.bad_rows = bad_rows
            self.result.skipped_rows = skipped_rows
            self.result.stats.total = len(schedule_items)

        console.print(f"✅ 曲目表解析完成: [green]{len(schedule_items)}[/green] 条有效条目")

        with console.status("[bold green]正在扫描音频文件..."):
            audio_files = self.parser.scan_audio_files(self.audio_dir)
            self.result.audio_files = audio_files

        media_files = [af for af in audio_files if not af.is_screenshot and not af.is_note]
        screenshot_files = [af for af in audio_files if af.is_screenshot]
        note_files = [af for af in audio_files if af.is_note]

        console.print(
            f"✅ 音频文件扫描完成: "
            f"[green]{len(media_files)}[/green] 个音频文件, "
            f"[blue]{len(screenshot_files)}[/blue] 张截图, "
            f"[yellow]{len(note_files)}[/yellow] 个备注文件"
        )
        console.print()

        self._print_parsing_stats(bad_rows, skipped_rows)

        with console.status("[bold green]正在检测冲突..."):
            conflicts = self.detector.detect_all(schedule_items, audio_files)

        console.print(f"⚠️  检测到 [red]{len(conflicts)}[/red] 个冲突")
        console.print()

        self._print_conflicts_by_type(conflicts)
        self._print_confirmation_required(conflicts, interactive)

        if auto_process:
            self._auto_mark_processed()

        self.history_manager._persist_history()
        self._print_final_stats()

    def _print_parsing_stats(self, bad_rows, skipped_rows):
        table = Table(title="📊 解析统计", show_header=True, header_style="bold magenta")
        table.add_column("类别", style="cyan")
        table.add_column("数量", justify="right")
        table.add_column("详情", style="dim")

        table.add_row(
            "✅ 已处理",
            str(len(self.result.schedule_items)),
            "有效条目",
        )
        table.add_row(
            "⏭️  已跳过",
            str(len(skipped_rows)),
            "缺少必要字段" if skipped_rows else "-",
        )
        table.add_row(
            "❌ 坏行",
            str(len(bad_rows)),
            "解析错误" if bad_rows else "-",
        )

        console.print(table)
        console.print()

        if bad_rows:
            console.print(Panel.fit(
                "[bold red]❌ 坏行详情:[/bold red]",
                border_style="red",
            ))
            for idx, bad in enumerate(bad_rows[:5], 1):
                row_num = bad.get("row", bad.get("line", "?"))
                error = bad.get("error", "未知错误")
                data = str(bad.get("data", ""))[:50]
                console.print(f"  {idx}. 行 {row_num}: {error}")
                console.print(f"     数据: {data}...")
            if len(bad_rows) > 5:
                console.print(f"  ... 还有 {len(bad_rows) - 5} 条坏行")
            console.print()

        if skipped_rows:
            console.print(Panel.fit(
                "[bold yellow]⏭️  跳过行详情:[/bold yellow]",
                border_style="yellow",
            ))
            for idx, skip in enumerate(skipped_rows[:5], 1):
                row_num = skip.get("row", skip.get("line", "?"))
                reason = skip.get("reason", "未知原因")
                console.print(f"  {idx}. 行 {row_num}: {reason}")
            if len(skipped_rows) > 5:
                console.print(f"  ... 还有 {len(skipped_rows) - 5} 条跳过行")
            console.print()

    def _print_conflicts_by_type(self, conflicts):
        from collections import defaultdict
        by_type = defaultdict(list)
        for c in conflicts:
            by_type[c.conflict_type].append(c)

        table = Table(title="⚠️  冲突分类统计", show_header=True, header_style="bold magenta")
        table.add_column("冲突类型", style="cyan")
        table.add_column("数量", justify="right")
        table.add_column("严重程度", style="dim")

        for ctype, clist in sorted(by_type.items()):
            label = CONFLICT_TYPE_LABELS.get(ctype, ctype.value)
            severity = clist[0].severity
            severity_style = {
                "error": "[red]错误[/red]",
                "warning": "[yellow]警告[/yellow]",
                "info": "[blue]提示[/blue]",
            }.get(severity, severity)
            table.add_row(label, str(len(clist)), severity_style)

        console.print(table)
        console.print()

    def _print_confirmation_required(self, conflicts, interactive):
        need_confirm = [c for c in conflicts if c.requires_manual_confirmation]

        if not need_confirm:
            console.print("[green]✅ 无需人工确认[/green]")
            console.print()
            return

        console.print(Panel.fit(
            f"[bold yellow]👤 需要人工确认 ({len(need_confirm)} 项):[/bold yellow]",
            border_style="yellow",
        ))
        console.print()

        for idx, conflict in enumerate(need_confirm, 1):
            label = CONFLICT_TYPE_LABELS.get(conflict.conflict_type, conflict.conflict_type.value)
            console.print(f"[bold]{idx}. {label}[/bold]")
            console.print(f"   {conflict.description}")
            console.print()
            console.print(f"   [dim]原因: {conflict.confirmation_reason}[/dim]")
            console.print()
            console.print("   [bold]下一步:[/bold]")
            for step in conflict.next_steps or []:
                console.print(f"   • {step}")
            console.print()

            if interactive:
                if click.confirm("   是否现在处理此确认？", default=False):
                    confirmation = click.prompt("   请输入确认内容")
                    actor = click.prompt("   请输入操作者", default="值班人员")
                    self.history_manager.manual_confirm(conflict, confirmation, actor)
                    console.print(f"   [green]✅ 已记录确认: {confirmation}[/green]")
                    console.print()

        console.print()

    def _auto_mark_processed(self):
        for item in self.result.schedule_items:
            item_conflicts = [
                c for c in self.result.conflicts
                if c.schedule_item_id == item.id
            ]
            if item.status == ItemStatus.PENDING and not item_conflicts:
                self.history_manager.update_status(
                    item,
                    ItemStatus.PROCESSED,
                    actor="system",
                    reason="无冲突，自动标记为已处理",
                )

    def _print_final_stats(self):
        self.result.stats.end_time = datetime.now()

        processed = sum(1 for i in self.result.schedule_items if i.status == ItemStatus.PROCESSED)
        needs_evidence = sum(1 for i in self.result.schedule_items if i.status == ItemStatus.NEEDS_EVIDENCE)
        needs_confirmation = sum(1 for i in self.result.schedule_items if i.status == ItemStatus.NEEDS_CONFIRMATION)
        pending = sum(1 for i in self.result.schedule_items if i.status == ItemStatus.PENDING)

        grid = Table.grid(expand=True)
        grid.add_column(justify="center")
        grid.add_column(justify="center")
        grid.add_column(justify="center")
        grid.add_column(justify="center")

        grid.add_row(
            Panel(f"[bold green]✅ 已处理[/bold green]\n[green]{processed}[/green]",
                  border_style="green"),
            Panel(f"[bold red]❌ 坏行[/bold red]\n[red]{self.result.stats.bad}[/red]",
                  border_style="red"),
            Panel(f"[bold yellow]⏭️  已跳过[/bold yellow]\n[yellow]{self.result.stats.skipped}[/yellow]",
                  border_style="yellow"),
            Panel(f"[bold blue]📎 待补证据[/bold blue]\n[blue]{needs_evidence}[/blue]",
                  border_style="blue"),
        )
        grid.add_row(
            Panel(f"[bold magenta]👤 待确认[/bold magenta]\n[magenta]{needs_confirmation}[/magenta]",
                  border_style="magenta"),
            Panel(f"[bold white]⏳ 待处理[/bold white]\n[white]{pending}[/white]",
                  border_style="white"),
            Panel(f"[bold yellow]⚠️  冲突总数[/bold yellow]\n[yellow]{self.result.stats.conflicts_detected}[/yellow]",
                  border_style="yellow"),
            Panel(f"[bold green]✅ 已解决[/bold green]\n[green]{self.result.stats.conflicts_resolved}[/green]",
                  border_style="green"),
        )

        console.print(Panel(grid, title="🎯 最终统计", border_style="bold"))
        console.print()

        console.print(f"[dim]处理耗时: {self.result.stats.elapsed:.2f} 秒[/dim]")
        console.print()

    def add_note(self, track_id: str, note: str, actor: str = "system"):
        item = self.history_manager.find_schedule_by_track_id(track_id)
        if not item:
            console.print(f"[red]❌ 未找到 TRACK ID: {track_id}[/red]")
            return

        entry = self.history_manager.add_note(item, note, actor)
        console.print(f"[green]✅ 已添加备注到 '{item.title}': {note}[/green]")

    def add_screenshot(self, track_id: str, screenshot_path: str, caption: str = "", actor: str = "system"):
        item = self.history_manager.find_schedule_by_track_id(track_id)
        if not item:
            console.print(f"[red]❌ 未找到 TRACK ID: {track_id}[/red]")
            return

        if not Path(screenshot_path).exists():
            console.print(f"[red]❌ 截图文件不存在: {screenshot_path}[/red]")
            return

        entry = self.history_manager.add_screenshot(item, screenshot_path, actor, caption)
        console.print(f"[green]✅ 已添加截图到 '{item.title}'[/green]")
        if caption:
            console.print(f"   说明: {caption}")

    def update_status(self, track_id: str, status: str, reason: str = "", actor: str = "system"):
        item = self.history_manager.find_schedule_by_track_id(track_id)
        if not item:
            console.print(f"[red]❌ 未找到 TRACK ID: {track_id}[/red]")
            return

        try:
            status_enum = ItemStatus(status)
        except ValueError:
            valid = ", ".join([s.value for s in ItemStatus])
            console.print(f"[red]❌ 无效状态: {status}。有效状态: {valid}[/red]")
            return

        entry = self.history_manager.update_status(item, status_enum, actor, reason)
        console.print(f"[green]✅ '{item.title}' 状态已更新为 {status_enum.value}[/green]")
        if reason:
            console.print(f"   原因: {reason}")

    def generate_timeline(self, output_path: str):
        content = self.timeline_generator.generate_markdown(output_path)
        console.print(f"[green]✅ 历史时间线已生成: {output_path}[/green]")

    def generate_duty_view(self, output_path: str):
        content = self.duty_view_generator.generate_markdown(output_path)
        console.print(f"[green]✅ 值班视图已生成: {output_path}[/green]")

    def show_status(self):
        processed = sum(1 for i in self.result.schedule_items if i.status == ItemStatus.PROCESSED)
        needs_evidence = sum(1 for i in self.result.schedule_items if i.status == ItemStatus.NEEDS_EVIDENCE)
        needs_confirmation = sum(1 for i in self.result.schedule_items if i.status == ItemStatus.NEEDS_CONFIRMATION)
        pending = sum(1 for i in self.result.schedule_items if i.status == ItemStatus.PENDING)

        table = Table(title="📋 条目状态一览", show_header=True, header_style="bold magenta")
        table.add_column("TRACK ID", style="cyan")
        table.add_column("曲目", style="white")
        table.add_column("摊位", style="blue")
        table.add_column("日期", style="yellow")
        table.add_column("状态", style="bold")

        for item in self.result.schedule_items:
            status_icon = {
                ItemStatus.PROCESSED: "✅",
                ItemStatus.NEEDS_EVIDENCE: "📎",
                ItemStatus.NEEDS_CONFIRMATION: "👤",
                ItemStatus.PENDING: "⏳",
                ItemStatus.SKIPPED: "⏭️",
                ItemStatus.BAD: "❌",
            }.get(item.status, "•")

            table.add_row(
                item.track_id,
                item.title,
                item.booth,
                f"第{item.day}天",
                f"{status_icon} {item.status.value}",
            )

        console.print(table)


@click.group()
@click.version_option()
def main():
    """🎵 音乐节摊位排期冲突检测工具"""
    pass


@main.command()
@click.option("--schedule", "-s", required=True, help="曲目表文件路径 (CSV/JSON/JSONL)")
@click.option("--audio-dir", "-a", required=True, help="音频文件夹路径")
@click.option("--history-dir", "-h", default="./data/history", help="历史记录目录")
@click.option("--interactive/--no-interactive", default=False, help="交互式处理人工确认")
@click.option("--load-history/--no-load-history", default=True, help="加载已有历史")
def run(schedule, audio_dir, history_dir, interactive, load_history):
    """运行排期冲突检测"""
    scheduler = FestivalScheduler(schedule, audio_dir, history_dir)
    if load_history:
        scheduler.load_existing_history()
    scheduler.run(interactive=interactive)


@main.command("add-note")
@click.option("--track-id", "-t", required=True, help="TRACK ID")
@click.option("--note", "-n", required=True, help="备注内容")
@click.option("--actor", default="值班人员", help="操作者")
@click.option("--schedule", "-s", required=True, help="曲目表文件路径")
@click.option("--audio-dir", "-a", required=True, help="音频文件夹路径")
@click.option("--history-dir", "-h", default="./data/history", help="历史记录目录")
def add_note_cmd(track_id, note, actor, schedule, audio_dir, history_dir):
    """为指定曲目添加备注（进入历史记录）"""
    scheduler = FestivalScheduler(schedule, audio_dir, history_dir)
    scheduler.load_existing_history()
    scheduler.add_note(track_id, note, actor)


@main.command("add-screenshot")
@click.option("--track-id", "-t", required=True, help="TRACK ID")
@click.option("--screenshot", "-p", required=True, help="截图文件路径")
@click.option("--caption", "-c", default="", help="截图说明")
@click.option("--actor", default="值班人员", help="操作者")
@click.option("--schedule", "-s", required=True, help="曲目表文件路径")
@click.option("--audio-dir", "-a", required=True, help="音频文件夹路径")
@click.option("--history-dir", "-h", default="./data/history", help="历史记录目录")
def add_screenshot_cmd(track_id, screenshot, caption, actor, schedule, audio_dir, history_dir):
    """为指定曲目添加截图（进入历史记录）"""
    scheduler = FestivalScheduler(schedule, audio_dir, history_dir)
    scheduler.load_existing_history()
    scheduler.add_screenshot(track_id, screenshot, caption, actor)


@main.command("update-status")
@click.option("--track-id", "-t", required=True, help="TRACK ID")
@click.option("--status", "-S", required=True, type=click.Choice([s.value for s in ItemStatus]), help="新状态")
@click.option("--reason", "-r", default="", help="变更原因")
@click.option("--actor", default="值班人员", help="操作者")
@click.option("--schedule", "-s", required=True, help="曲目表文件路径")
@click.option("--audio-dir", "-a", required=True, help="音频文件夹路径")
@click.option("--history-dir", "-h", default="./data/history", help="历史记录目录")
def update_status_cmd(track_id, status, reason, actor, schedule, audio_dir, history_dir):
    """更新指定曲目的状态（进入历史记录）"""
    scheduler = FestivalScheduler(schedule, audio_dir, history_dir)
    scheduler.load_existing_history()
    scheduler.update_status(track_id, status, reason, actor)


@main.command("timeline")
@click.option("--output", "-o", default="./timeline.md", help="输出文件路径")
@click.option("--schedule", "-s", required=True, help="曲目表文件路径")
@click.option("--audio-dir", "-a", required=True, help="音频文件夹路径")
@click.option("--history-dir", "-h", default="./data/history", help="历史记录目录")
def timeline_cmd(output, schedule, audio_dir, history_dir):
    """生成历史时间线Markdown报告"""
    scheduler = FestivalScheduler(schedule, audio_dir, history_dir)
    scheduler.load_existing_history()
    scheduler.generate_timeline(output)


@main.command("duty-view")
@click.option("--output", "-o", default="./duty_view.md", help="输出文件路径")
@click.option("--schedule", "-s", required=True, help="曲目表文件路径")
@click.option("--audio-dir", "-a", required=True, help="音频文件夹路径")
@click.option("--history-dir", "-h", default="./data/history", help="历史记录目录")
def duty_view_cmd(output, schedule, audio_dir, history_dir):
    """生成算法值班视图报告"""
    scheduler = FestivalScheduler(schedule, audio_dir, history_dir)
    scheduler.load_existing_history()
    scheduler.generate_duty_view(output)


@main.command("status")
@click.option("--schedule", "-s", required=True, help="曲目表文件路径")
@click.option("--audio-dir", "-a", required=True, help="音频文件夹路径")
@click.option("--history-dir", "-h", default="./data/history", help="历史记录目录")
def status_cmd(schedule, audio_dir, history_dir):
    """显示所有条目的当前状态"""
    scheduler = FestivalScheduler(schedule, audio_dir, history_dir)
    scheduler.load_existing_history()
    scheduler.show_status()


if __name__ == "__main__":
    main()
