from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .models import CheckReport, CheckResult, CheckStatus, SampleRecord, TraceLink
from .counterexample import CounterExampleGenerator

_STATUS_COLOR = {
    CheckStatus.USABLE: "green",
    CheckStatus.PENDING: "yellow",
    CheckStatus.RECOLLECT: "red",
}

_STATUS_LABEL = {
    CheckStatus.USABLE: "可用",
    CheckStatus.PENDING: "暂缓",
    CheckStatus.RECOLLECT: "重采",
}


def render_short_summary(report: CheckReport, console: Optional[Console] = None) -> None:
    """结果说明可以短，但要说清哪些可用、暂缓、重采"""
    console = console or Console()
    console.print(
        Panel.fit(
            Text.from_markup(
                f"[bold]样条插值过冲检查 — 复核摘要[/bold]\n"
                f"共 [cyan]{report.total}[/cyan] 条  |  "
                f"[green]可用 {report.usable_count}[/green]  |  "
                f"[yellow]暂缓 {report.pending_count}[/yellow]  |  "
                f"[red]重采 {report.recollect_count}[/red]  |  "
                f"边界 {report.boundary_count}  |  "
                f"重复 {len(report.duplicates_detected)}"
            ),
            border_style="blue",
        )
    )


def render_result_table(results: list[CheckResult], console: Optional[Console] = None) -> None:
    console = console or Console()
    table = Table(title="逐样本结果", show_lines=False)
    table.add_column("样本ID", style="cyan")
    table.add_column("状态")
    table.add_column("过冲", justify="center")
    table.add_column("最大过冲", justify="right")
    table.add_column("平滑", justify="right")
    table.add_column("节点数", justify="right")
    table.add_column("边界样例", justify="center")
    for r in results:
        color = _STATUS_COLOR[r.status]
        table.add_row(
            r.sample_id,
            f"[{color}]{_STATUS_LABEL[r.status]}[/{color}]",
            "✓" if r.has_overshoot else "—",
            f"{r.max_overshoot:.4f}" if r.max_overshoot is not None else "—",
            f"{r.smoothing:.4f}",
            str(r.knots),
            "★" if r.is_boundary_case else "",
        )
    console.print(table)


def render_trace(links: list[TraceLink], console: Optional[Console] = None) -> None:
    console = console or Console()
    console.print(Panel("追溯链 (结果 → 处理 → 来源)", border_style="magenta"))
    for i, link in enumerate(links):
        prefix = "  " * i
        console.print(f"{prefix}[magenta]└─ {link.level}[/magenta] — {link.description}")
        if link.detail:
            for k, v in link.detail.items():
                console.print(f"{prefix}   [dim]• {k}: {v}[/dim]")


def render_counterexamples(gen: CounterExampleGenerator, results_map: dict, console: Optional[Console] = None) -> None:
    console = console or Console()
    console.print(Panel("反例讲解（月底/课前使用）", border_style="cyan"))
    samples = gen.generate_all()
    for s in samples:
        label = gen.explain(s)
        r = results_map.get(s.sample_id)
        status = f" → [{_STATUS_COLOR[r.status]}]{_STATUS_LABEL[r.status]}[/{_STATUS_COLOR[r.status]}]" if r else ""
        console.print(f"  • [cyan]{s.sample_id}[/cyan]{status}  {label}")


def write_report_json(report: CheckReport, out_path: Path | str) -> None:
    if hasattr(report, "model_dump"):
        data = report.model_dump(mode="json")
    else:
        data = report.dict()
    Path(out_path).write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
