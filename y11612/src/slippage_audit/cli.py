"""CLI主入口 - 量化回测滑点审计命令行工具"""

from __future__ import annotations

import os
import sys
import json
import traceback
from datetime import datetime
from pathlib import Path
from typing import Optional

import click
import pandas as pd
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

from .data_loader import load_all_data, LoadedData
from .matching_engine import recalculate_trades
from .anomaly_detector import detect_anomalies, Anomaly, AnomalySeverity
from .audit_trail import create_audit_trail, AuditTrail
from .reporting import calculate_score, export_charts, AuditScore
from .utils import json_dump


console = Console()


def _create_output_dir(base_dir: str) -> str:
    """创建带时间戳的输出目录，避免污染旧结果"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = os.path.join(base_dir, f"audit_{timestamp}")
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def _print_data_summary(data: LoadedData):
    """打印数据加载摘要"""
    table = Table(title="数据加载摘要", show_header=True, header_style="bold cyan")
    table.add_column("数据源", style="dim")
    table.add_column("行数", justify="right")
    table.add_column("状态", justify="center")

    status_map = {
        'kline': ('K线数据', data.kline),
        'signals': ('成交信号', data.signals),
        'suspension': ('停牌日历', data.suspension),
        'backtest_report': ('原始回测报告', data.backtest_report),
        'fee_table': ('手续费表', data.fee_table),
        'slippage_params': ('滑点参数', data.slippage_params),
    }

    for name, (display_name, df_or_dict) in status_map.items():
        if isinstance(df_or_dict, pd.DataFrame):
            count = len(df_or_dict)
        else:
            count = len(df_or_dict) if df_or_dict else 0
        status = "[green]✓[/green]" if count > 0 else "[yellow]⚠[/yellow]"
        table.add_row(display_name, str(count), status)

    console.print(table)


def _print_anomalies(anomalies: list[Anomaly]):
    """打印异常列表"""
    if not anomalies:
        console.print(Panel("[green]✓ 未发现异常[/green]", title="异常检测结果"))
        return

    critical = [a for a in anomalies if a.severity == AnomalySeverity.CRITICAL]
    warning = [a for a in anomalies if a.severity == AnomalySeverity.WARNING]

    console.print(Panel(
        f"[red]严重: {len(critical)}[/red] | [yellow]警告: {len(warning)}[/yellow]",
        title=f"异常检测结果 - 共 {len(anomalies)} 项"
    ))

    if critical:
        table = Table(title="严重异常", show_header=True, header_style="bold red")
        table.add_column("#", justify="right")
        table.add_column("类型")
        table.add_column("标的")
        table.add_column("时间")
        table.add_column("描述", overflow="fold")

        for i, a in enumerate(critical[:10], 1):
            table.add_row(
                str(i),
                a.type.value,
                a.symbol or "-",
                str(a.datetime)[:19] if a.datetime else "-",
                a.message
            )
        console.print(table)
        if len(critical) > 10:
            console.print(f"[dim]... 还有 {len(critical) - 10} 项严重异常[/dim]")

    if warning:
        table = Table(title="警告", show_header=True, header_style="bold yellow")
        table.add_column("#", justify="right")
        table.add_column("类型")
        table.add_column("标的")
        table.add_column("时间")
        table.add_column("描述", overflow="fold")

        for i, a in enumerate(warning[:10], 1):
            table.add_row(
                str(i),
                a.type.value,
                a.symbol or "-",
                str(a.datetime)[:19] if a.datetime else "-",
                a.message
            )
        console.print(table)
        if len(warning) > 10:
            console.print(f"[dim]... 还有 {len(warning) - 10} 项警告[/dim]")


def _print_score(score: AuditScore):
    """打印评分结果"""
    console.print(Panel(
        f"[bold cyan]综合评分: {score.weighted_score:.1f}/100[/bold cyan]\n"
        f"[bold]评级: {score.grade}[/bold]\n\n"
        f"{score.summary}",
        title="审计评分"
    ))

    table = Table(title="评分明细", show_header=True, header_style="bold magenta")
    table.add_column("评分项")
    table.add_column("得分", justify="right")
    table.add_column("满分", justify="right")
    table.add_column("权重", justify="right")
    table.add_column("说明", overflow="fold")

    for comp in score.components:
        score_color = "green" if comp.score / comp.max_score >= 0.8 else "yellow" if comp.score / comp.max_score >= 0.6 else "red"
        table.add_row(
            comp.name,
            f"[{score_color}]{comp.score}[/{score_color}]",
            str(comp.max_score),
            f"{comp.weight:.0%}",
            comp.details.get('message', '')
        )

    console.print(table)


def _save_results(
    output_dir: str,
    data: LoadedData,
    recalculated: pd.DataFrame,
    anomalies: list[Anomaly],
    score: AuditScore,
    audit_trail: AuditTrail,
    charts: list[str],
):
    """保存所有结果到输出目录"""
    if len(recalculated) > 0:
        recalculated.to_csv(os.path.join(output_dir, "recalculated_trades.csv"), index=False)
        recalculated.to_parquet(os.path.join(output_dir, "recalculated_trades.parquet"), index=False)

    if anomalies:
        anomalies_df = pd.DataFrame([a.to_dict() for a in anomalies])
        anomalies_df.to_csv(os.path.join(output_dir, "anomalies.csv"), index=False)
        with open(os.path.join(output_dir, "anomalies.json"), 'w', encoding='utf-8') as f:
            json_dump([a.to_dict() for a in anomalies], f, ensure_ascii=False, indent=2)

    with open(os.path.join(output_dir, "score.json"), 'w', encoding='utf-8') as f:
        json_dump(score.to_dict(), f, ensure_ascii=False, indent=2)

    sources_dict = {name: src.to_dict() for name, src in data.sources.items()}
    with open(os.path.join(output_dir, "data_sources.json"), 'w', encoding='utf-8') as f:
        json_dump(sources_dict, f, ensure_ascii=False, indent=2)

    audit_summary = audit_trail.get_summary()
    with open(os.path.join(output_dir, "audit_summary.json"), 'w', encoding='utf-8') as f:
        json_dump(audit_summary, f, ensure_ascii=False, indent=2)

    summary_md = _generate_summary_markdown(data, recalculated, anomalies, score, audit_trail, charts, output_dir)
    with open(os.path.join(output_dir, "SUMMARY.md"), 'w', encoding='utf-8') as f:
        f.write(summary_md)

    console.print(f"\n[green]✓ 结果已保存到: {output_dir}[/green]")


def _generate_summary_markdown(
    data: LoadedData,
    recalculated: pd.DataFrame,
    anomalies: list[Anomaly],
    score: AuditScore,
    audit_trail: AuditTrail,
    charts: list[str],
    output_dir: str,
) -> str:
    """生成摘要Markdown"""
    md = "# 量化回测滑点审计报告\n\n"
    md += f"生成时间: {datetime.now().isoformat()}\n\n"

    md += "## 1. 数据来源\n\n"
    md += "| 数据源 | 行数 | 文件 | 哈希 |\n"
    md += "|--------|------|------|------|\n"
    for name, src in data.sources.items():
        md += f"| {name} | {src.row_count} | {src.path} | {src.file_hash} |\n"
    md += "\n"

    md += "## 2. 审计评分\n\n"
    md += f"- **综合评分**: {score.weighted_score:.1f}/100\n"
    md += f"- **评级**: {score.grade}\n\n"

    md += "### 评分明细\n\n"
    md += "| 评分项 | 得分 | 满分 | 权重 | 说明 |\n"
    md += "|--------|------|------|------|------|\n"
    for comp in score.components:
        md += f"| {comp.name} | {comp.score} | {comp.max_score} | {comp.weight:.0%} | {comp.details.get('message', '')} |\n"
    md += "\n"

    md += "## 3. 异常检测\n\n"
    md += f"共发现 **{len(anomalies)}** 项异常\n\n"
    if anomalies:
        md += "| 序号 | 严重程度 | 类型 | 标的 | 时间 | 描述 |\n"
        md += "|------|----------|------|------|------|------|\n"
        for i, a in enumerate(anomalies[:50], 1):
            md += f"| {i} | {a.severity.value} | {a.type.value} | {a.symbol or '-'} | {str(a.datetime)[:19] if a.datetime else '-'} | {a.message} |\n"
        if len(anomalies) > 50:
            md += f"\n*注: 仅显示前50项，完整列表请查看 anomalies.csv*"
    md += "\n\n"

    md += "## 4. 交易统计\n\n"
    if len(recalculated) > 0:
        md += f"- 总成交笔数: {len(recalculated)}\n"
        md += f"- 总成交额: {recalculated['amount'].sum():.2f}\n"
        md += f"- 总手续费: {recalculated['fee'].sum():.2f}\n"
        md += f"- 总滑点: {recalculated['slippage'].sum():.2f}\n"
        md += f"- 停牌期间成交: {recalculated['is_suspended'].sum()} 笔\n\n"

    md += "## 5. 审计追踪\n\n"
    audit_summary = audit_trail.get_summary()
    md += f"- 操作记录: {audit_summary['total_actions']}\n"
    md += f"- 修正记录: {audit_summary['total_corrections']}\n"
    md += f"- 参数版本: {audit_summary['total_parameter_versions']}\n\n"

    if charts:
        md += "## 6. 图表\n\n"
        for chart in charts:
            rel_path = os.path.relpath(chart, os.path.dirname(os.path.join(output_dir, "SUMMARY.md")))
            md += f"![{os.path.basename(chart)}]({rel_path})\n\n"

    md += "---\n"
    md += f"*由 slippage-audit v{__import__('slippage_audit').__version__} 生成*\n"

    return md


@click.group()
@click.version_option(version="0.1.0", prog_name="slippage-audit")
def main():
    """量化回测滑点审计CLI工具 - 审计手续费、滑点、停牌等回测细节"""
    pass


@main.command()
@click.option('--input', '-i', required=True, type=click.Path(exists=True, file_okay=False),
              help='输入数据目录')
@click.option('--output', '-o', required=True, type=click.Path(file_okay=False),
              help='输出结果目录（会自动创建时间戳子目录）')
@click.option('--tolerance', '-t', type=float, default=1.0,
              help='差异容忍度（bps），默认1bps')
@click.option('--no-charts', is_flag=True, help='不生成图表')
@click.option('--quiet', '-q', is_flag=True, help='静默模式，减少输出')
def audit(input: str, output: str, tolerance: float, no_charts: bool, quiet: bool):
    """执行回测滑点审计"""
    try:
        output_dir = _create_output_dir(output)

        audit_trail = create_audit_trail(output_dir)
        audit_trail.log_action("audit_started", {"input_dir": input, "output_dir": output_dir})

        if not quiet:
            console.print(Panel.fit(
                "[bold cyan]量化回测滑点审计[/bold cyan]\n"
                f"输入目录: {input}\n"
                f"输出目录: {output_dir}",
                border_style="cyan"
            ))

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console,
            disable=quiet,
        ) as progress:

            task = progress.add_task("加载数据...", total=100)

            data = load_all_data(input)
            audit_trail.log_action("data_loaded", {"sources": list(data.sources.keys())})
            progress.update(task, advance=20)

            if not quiet:
                _print_data_summary(data)

            if len(data.signals) == 0:
                console.print("[red]✗ 没有找到成交信号数据，无法进行审计[/red]")
                sys.exit(1)

            if len(data.kline) == 0:
                console.print("[yellow]⚠ 没有找到K线数据，将使用信号价格撮合[/yellow]")

            progress.update(task, description="撮合交易...", advance=20)

            recalculated = recalculate_trades(
                signals=data.signals,
                kline=data.kline,
                fee_config=data.fee_table,
                slippage_params=data.slippage_params,
                suspension=data.suspension,
            )
            audit_trail.log_action("trades_recalculated", {"trade_count": len(recalculated)})
            progress.update(task, advance=20)

            progress.update(task, description="检测异常...", advance=10)

            anomalies, anomaly_summary = detect_anomalies(
                recalculated=recalculated,
                original_report=data.backtest_report,
                kline=data.kline,
                suspension=data.suspension,
                fee_config=data.fee_table,
                tolerance_bps=tolerance,
            )
            audit_trail.log_action("anomalies_detected", anomaly_summary)
            progress.update(task, advance=10)

            progress.update(task, description="计算评分...", advance=10)

            score = calculate_score(recalculated, anomalies, data.backtest_report)
            audit_trail.log_action("score_calculated", {"score": score.weighted_score, "grade": score.grade})
            progress.update(task, advance=10)

            charts = []
            if not no_charts:
                progress.update(task, description="生成图表...")
                try:
                    charts = export_charts(output_dir, recalculated, data.backtest_report, anomalies, score)
                    audit_trail.log_action("charts_exported", {"chart_count": len(charts)})
                except Exception as e:
                    console.print(f"[yellow]⚠ 图表生成失败: {e}[/yellow]")
                    audit_trail.log_action("chart_export_failed", {"error": str(e)})

            progress.update(task, advance=10, description="完成")

        if not quiet:
            _print_anomalies(anomalies)
            _print_score(score)

        _save_results(output_dir, data, recalculated, anomalies, score, audit_trail, charts)

        if not quiet:
            console.print("\n[bold cyan]审计完成![/bold cyan]")

        if any(a.severity == AnomalySeverity.CRITICAL for a in anomalies):
            sys.exit(2)

    except Exception as e:
        console.print(f"[red]✗ 审计失败: {e}[/red]")
        console.print(f"[dim]{traceback.format_exc()}[/dim]")
        sys.exit(1)


@main.command()
@click.option('--output', '-o', required=True, type=click.Path(file_okay=False),
              help='示例数据输出目录')
def sample(output: str):
    """生成示例数据目录结构"""
    dirs = ['kline', 'signals', 'fee_table', 'suspension', 'slippage_params', 'backtest_report']
    for d in dirs:
        os.makedirs(os.path.join(output, d), exist_ok=True)

    sample_fee = """commission:
  buy:
    rate: 0.0003
    min_fee: 5
  sell:
    rate: 0.0013
    min_fee: 5
    stamp_duty: 0.001
tiers:
  - threshold: 1000000
    buy_rate: 0.00025
    sell_rate: 0.0011
"""
    with open(os.path.join(output, 'fee_table', 'fee.yaml'), 'w', encoding='utf-8') as f:
        f.write(sample_fee)

    sample_slip = """model: fixed
fixed:
  buy_bps: 3
  sell_bps: 3
"""
    with open(os.path.join(output, 'slippage_params', 'slippage.yaml'), 'w', encoding='utf-8') as f:
        f.write(sample_slip)

    console.print(f"[green]✓ 示例数据结构已创建在: {output}[/green]")
    console.print("[dim]请将您的数据放入对应子目录中[/dim]")


@main.command()
@click.argument('audit_dir', type=click.Path(exists=True, file_okay=False))
def summary(audit_dir: str):
    """查看已有审计结果的摘要"""
    score_file = os.path.join(audit_dir, 'score.json')
    anomalies_file = os.path.join(audit_dir, 'anomalies.json')

    if not os.path.exists(score_file):
        console.print("[red]✗ 未找到 score.json，请确认这是一个有效的审计结果目录[/red]")
        sys.exit(1)

    with open(score_file, 'r', encoding='utf-8') as f:
        score_data = json.load(f)

    console.print(Panel(
        f"[bold cyan]综合评分: {score_data['weighted_score']:.1f}/100[/bold cyan]\n"
        f"[bold]评级: {score_data['grade']}[/bold]\n\n"
        f"{score_data['summary']}",
        title=f"审计结果 - {os.path.basename(audit_dir)}"
    ))

    if os.path.exists(anomalies_file):
        with open(anomalies_file, 'r', encoding='utf-8') as f:
            anomalies = json.load(f)
        console.print(f"异常总数: {len(anomalies)}")


if __name__ == '__main__':
    main()
