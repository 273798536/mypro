"""控制台美化输出 - 用 Rich 做日常工具风格的终端输出"""

from typing import Any, Dict, List

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich import box
from rich.syntax import Syntax

from .models import (
    AnalysisDataset, AnomalyAction, AnomalySeverity, BatchCVResult
)
from .review import ReviewChecklistItem

console = Console()


def print_header(run_id: str, timestamp_str: str) -> None:
    txt = Text()
    txt.append("🧪 试剂盒批间差分析", style="bold cyan")
    txt.append("  |  实验室日常工具版", style="dim")
    console.print(Panel(txt, subtitle=f"Run: {run_id}  ·  {timestamp_str}",
                        border_style="cyan", expand=False))


def print_load_summary(
    reagent_n: int, exp_n: int, weight_n: int,
    reaction_n: int, temp_n: int, batch_n: int,
    historical_runs: int, supplements: Dict[str, List[str]],
) -> None:
    table = Table(title="输入材料加载情况", box=box.SIMPLE, show_header=True,
                  header_style="bold magenta")
    table.add_column("模块", style="cyan", no_wrap=True)
    table.add_column("记录数", justify="right", style="green")
    table.add_column("状态", style="")
    table.add_row("试剂台账", str(reagent_n), "✅" if reagent_n else "⛔ 缺失")
    table.add_row("实验记录", str(exp_n), "✅" if exp_n else "⛔ 缺失")
    table.add_row("称量单", str(weight_n), "✅" if weight_n else "⛔ 缺失")
    table.add_row("反应时间", str(reaction_n), "✅" if reaction_n else "⛔ 缺失")
    table.add_row("温度曲线", str(temp_n), "✅" if temp_n else "⚠️ 可选")
    table.add_row("涉及批次", str(batch_n), "")
    console.print(table)
    if historical_runs:
        console.print(f"  [dim]📜 历史分析：本工作目录已执行过 {historical_runs} 轮，状态文件会自动衔接[/dim]")
    if supplements:
        lines = []
        for bn, mods in supplements.items():
            lines.append(f"  • 批次 {bn}：新增 {'、'.join(mods)}")
        console.print(Panel(
            "\n".join(lines),
            title="[green]🆕 本轮新补录材料（相对上轮）",
            border_style="green",
            expand=False,
        ))


def print_anomaly_dashboard(
    unresolved: int, resolved: int,
    by_severity: Dict[str, int], by_action: Dict[str, int],
    dedup_info: tuple,
) -> None:
    orig, dedup = dedup_info
    grid = Table.grid(padding=(0, 2))
    grid.add_column(justify="center", style="bold")
    grid.add_column(justify="center", style="bold")
    grid.add_column(justify="center", style="bold")
    sev_line = "  ".join(
        f"[{'red' if s == '严重' else 'yellow' if s == '警告' else 'blue'}]{s}={n}[/]"
        for s, n in by_severity.items()
    ) or "(无)"
    grid.add_row(
        f"[red]🔴 未解决 {unresolved}[/]",
        f"[green]🟢 已解决 {resolved}[/]",
        f"[dim]去重: {orig}→{dedup}[/]" if orig != dedup else "",
    )
    console.print(Panel(grid, title="异常总览", subtitle=sev_line,
                        border_style="magenta", expand=False))
    if by_action:
        lines = []
        icons = {
            "拦截放行": "🚫", "补材料": "📦", "改口径": "✏️",
            "复测": "🔁", "待审核": "👀"
        }
        for act_label, count in by_action.items():
            icon = icons.get(act_label, "•")
            lines.append(f"  {icon} [bold]{act_label}[/bold]：{count} 项")
        console.print(Panel(
            "\n".join(lines),
            title="👉 下一步动作分布（不是一堆红色数字）",
            border_style="yellow", expand=False,
        ))


def print_per_batch(checklist: List[ReviewChecklistItem]) -> None:
    if not checklist:
        console.print("[yellow]⚠️  无可分析的批次[/yellow]")
        return
    table = Table(title="逐批次复核清单（同一轮：台账+实验+称量+反应时间）",
                  box=box.ROUNDED, show_lines=True,
                  header_style="bold blue")
    table.add_column("批次号", style="cyan", no_wrap=True)
    table.add_column("状态", style="bold", no_wrap=True)
    table.add_column("5类材料", style="", overflow="fold")
    table.add_column("空白对照", style="", no_wrap=True)
    table.add_column("异常", justify="right", no_wrap=True)
    table.add_column("👉 下一步", style="yellow", overflow="fold")
    table.add_column("复测建议", style="magenta", overflow="fold")
    for item in checklist:
        status_style = "green" if item.critical_count == 0 and item.warning_count == 0 else (
            "red" if item.critical_count else "yellow"
        )
        modules_parts = []
        icons = {"正常": "✅", "异常": "⚠️", "缺失": "⛔"}
        for k, v in item.modules_status.items():
            modules_parts.append(f"{icons.get(v, '•')}{k}")
        modules_str = " ".join(modules_parts)
        blank_style = "green" if item.blank_control_pass else "red"
        blank_str = (f"[{blank_style}]{item.blank_control_total}/"
                     f"{item.blank_control_required}[/{blank_style}]")
        anomaly_parts = []
        for k, v in item.anomaly_summary.items():
            if v:
                color = "red" if k == "严重" else ("yellow" if k == "警告" else "blue")
                anomaly_parts.append(f"[{color}]{k}={v}[/]")
        anomaly_str = " ".join(anomaly_parts) or "-"
        unique_actions = set()
        for line in item.actions_needed:
            if line.startswith("【") and "】" in line:
                unique_actions.add(line.split("】")[0].replace("【", ""))
        act_preview = "、".join(sorted(unique_actions)) or (
            "[green]通过[/green]" if item.critical_count + item.warning_count == 0 else ""
        )
        recheck = ("、".join(item.recheck_suggestions)
                   if item.recheck_suggestions else "-")
        table.add_row(
            item.batch_no,
            f"[{status_style}]{item.current_status}[/{status_style}]",
            modules_str,
            blank_str,
            anomaly_str,
            act_preview,
            recheck,
        )
    console.print(table)


def print_blank_control_blocking_detail(dataset: AnalysisDataset) -> None:
    """单独高亮空白对照缺失的拦截说明 - CLI交付用"""
    target = [a for a in dataset.anomalies
              if "空白对照" in a.anomaly_type and not a.resolved]
    if not target:
        return
    console.print()
    for a in target:
        title_style = "bold red" if a.severity == AnomalySeverity.CRITICAL else "bold yellow"
        body = Text()
        body.append("【问题描述】\n", style="bold dim")
        body.append(a.detail_message + "\n\n")
        body.append("【为什么被拦下】\n", style="bold dim")
        body.append(a.blocking_reason + "\n\n")
        body.append("【下一步】", style="bold dim")
        body.append("  " + a.action_label())
        console.print(Panel(body, title=f"[{title_style}]🚫 {a.batch_no} · {a.title}[/{title_style}]",
                            border_style="red", expand=True))


def print_cv_summary(cv_results: List[BatchCVResult]) -> None:
    if not cv_results:
        return
    table = Table(title="批间差 CV 计算结果", box=box.SIMPLE,
                  header_style="bold green")
    table.add_column("批次", style="cyan")
    table.add_column("指标")
    table.add_column("n", justify="right")
    table.add_column("Mean", justify="right")
    table.add_column("SD", justify="right")
    table.add_column("CV%", justify="right", style="bold")
    table.add_column("阈值%", justify="right")
    table.add_column("判定", justify="center")
    for c in cv_results:
        judge = "[green]✅[/green]" if c.is_pass else "[red]❌[/red]"
        cv_style = "red" if not c.is_pass else "green"
        table.add_row(
            c.batch_no, c.indicator_name,
            str(c.sample_count),
            f"{c.mean_value:.3f}", f"{c.std_value:.3f}",
            f"[{cv_style}]{c.cv_percent:.2f}%[/{cv_style}]",
            f"{c.pass_threshold:.1f}%",
            judge,
        )
    console.print(table)


def print_output_paths(paths: Dict[str, Any]) -> None:
    lines = []
    names = {
        "report": "📄 主分析报告（5个Sheet）",
        "anomalies": "📋 异常清单（全量/未解决）",
        "review_checklist": "✅ 复核清单",
        "cv_results": "📊 CV 明细",
        "batch_tracking": "🔍 批次追踪轨迹",
    }
    for key, path in paths.items():
        label = names.get(key, key)
        lines.append(f"  {label}  →  [bold cyan]{path}[/bold cyan]")
    console.print(Panel(
        "\n".join(lines),
        title="[green]💾 输出文件已生成",
        border_style="green", expand=False,
    ))


def print_footer(batch_count: int, unresolved_count: int) -> None:
    if unresolved_count == 0:
        msg = "[bold green]🎉 所有批次材料齐全，无未解决异常，可进入复核签字环节。[/bold green]"
    else:
        msg = (f"[bold yellow]⚠️  仍有 {unresolved_count} 项未解决异常需要处理，"
               f"涉及 {batch_count} 个批次。补录后重新运行即可增量更新。[/bold yellow]")
    console.print(Panel(msg, border_style="dim", expand=False))


def print_next_step_hints(supplements: Dict[str, List[str]]) -> None:
    if not supplements:
        return
    lines = [
        "[dim]💡 提示：补录已检测到，以下建议会随新材料刷新：",
        "   · 温度曲线补录后 → \"温度曲线超差\"复测建议会自动清除",
        "   · 反应时间补录后 → \"反应时间漏记\"不再出现在动作看板",
        "   · 空白对照补录后 → 空白对照CV会重新纳入统计[/dim]"
    ]
    console.print("\n".join(lines))
