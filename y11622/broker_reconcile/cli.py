import click
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

from .importer import import_all
from .calendar_aligner import detect_t1_mismatch
from .fee_attributor import detect_fee_misclassification
from .matcher import match_trades, detect_partial_executions, bucket_discrepancies
from .reporter import generate_summary, generate_all_reports
from .exceptions import ReconcileError

console = Console()


def _parse_date_arg(ctx, param, value):
    if not value:
        return date.today()
    for fmt in ["%Y-%m-%d", "%Y%m%d"]:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise click.BadParameter(f"日期格式不正确: {value}, 请使用 YYYY-MM-DD 或 YYYYMMDD")


@click.group()
@click.version_option(version="0.1.0", prog_name="broker-reconcile")
def cli():
    """券商对账差异CLI - 处理成交确认与资金流水比对"""
    pass


@cli.command()
@click.option("--data-dir", "-d", required=True, type=click.Path(exists=True, file_okay=False),
              help="数据目录, 包含 trades.csv, cash_flows.csv 等文件")
@click.option("--report-date", "-r", callback=_parse_date_arg, default=None,
              help="报告日期 (默认: 今天)")
@click.option("--output-dir", "-o", default="./output",
              help="输出目录 (默认: ./output)")
@click.option("--no-charts", is_flag=True, help="不生成图表")
def reconcile(data_dir, report_date, output_dir, no_charts):
    """执行完整对账流程"""

    console.print(Panel.fit(f"[bold blue]券商对账差异CLI[/bold blue]\n报告日期: {report_date}"))

    try:
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"),
                      console=console, transient=True) as progress:

            task = progress.add_task("导入数据文件...", total=None)
            ctx = import_all(data_dir, report_date)
            progress.update(task, description=f"已导入: {len(ctx.trades)} 条成交, {len(ctx.cash_flows)} 条流水")

            task = progress.add_task("检测T+1日期错位...", total=None)
            t1_discs = detect_t1_mismatch(ctx)
            ctx.discrepancies.extend(t1_discs)
            progress.update(task, description=f"发现 {len(t1_discs)} 个T+1日期错位")

            task = progress.add_task("检测费用归类错误...", total=None)
            fee_discs = detect_fee_misclassification(ctx)
            ctx.discrepancies.extend(fee_discs)
            progress.update(task, description=f"发现 {len(fee_discs)} 个费用归类错误")

            task = progress.add_task("检测部分成交...", total=None)
            partial_discs = detect_partial_executions(ctx)
            progress.update(task, description=f"发现 {len(partial_discs)} 个疑似部分成交")

            task = progress.add_task("匹配成交与流水...", total=None)
            matches = match_trades(ctx)
            progress.update(task, description=f"完成匹配: {len(matches)} 条")

            task = progress.add_task("生成报告...", total=None)
            reports = generate_all_reports(ctx, output_dir)
            if no_charts:
                reports["charts"] = []
            progress.update(task, description="报告生成完成")

    except ReconcileError as e:
        console.print(f"[red]对账错误: {e}[/red]")
        raise SystemExit(1)
    except Exception as e:
        console.print(f"[red]未知错误: {e}[/red]")
        raise SystemExit(1)

    _print_summary(ctx)

    console.print()
    console.print(f"[green]报告已生成:[/green] {output_dir}")
    console.print(f"  JSON结果: {reports['json']}")
    console.print(f"  文本报告: {reports['text']}")
    if reports["charts"]:
        console.print(f"  图表 ({len(reports['charts'])} 个):")
        for chart in reports["charts"]:
            console.print(f"    - {Path(chart).name}")


@cli.command()
@click.option("--data-dir", "-d", required=True, type=click.Path(exists=True, file_okay=False),
              help="数据目录")
@click.option("--report-date", "-r", callback=_parse_date_arg, default=None,
              help="报告日期")
def validate(data_dir, report_date):
    """验证数据文件格式"""

    console.print(f"[bold]验证数据目录:[/bold] {data_dir}")

    try:
        ctx = import_all(data_dir, report_date)

        table = Table(title="数据导入结果")
        table.add_column("数据类型", style="cyan")
        table.add_column("数量", justify="right")
        table.add_row("证券代码", str(len(ctx.securities)))
        table.add_row("费用科目", str(len(ctx.fee_items)))
        table.add_row("成交确认", str(len(ctx.trades)))
        table.add_row("资金流水", str(len(ctx.cash_flows)))
        table.add_row("成交日历", str(len(ctx.calendar)))
        table.add_row("已知差异", str(len(ctx.discrepancies)))
        console.print(table)

        if ctx.trades:
            sample = next(iter(ctx.trades.values()))
            console.print(f"\n[bold]成交样例:[/bold] {sample.trade_id}")
            console.print(f"  日期: {sample.trade_date} -> {sample.settlement_date}")
            console.print(f"  证券: {sample.security_code} {sample.security_name}")
            console.print(f"  金额: {sample.gross_amount:.2f} + 费用 {sample.total_fees:.2f} = {sample.net_amount:.2f}")

        if ctx.cash_flows:
            sample = next(iter(ctx.cash_flows.values()))
            console.print(f"\n[bold]流水样例:[/bold] {sample.flow_id}")
            console.print(f"  日期: {sample.trade_date} -> {sample.settlement_date}")
            console.print(f"  金额: {sample.amount:.2f} ({sample.direction})")
            if sample.fee_name:
                console.print(f"  费用: {sample.fee_name}")

        console.print("\n[green]数据验证通过[/green]")

    except ReconcileError as e:
        console.print(f"[red]数据错误: {e}[/red]")
        raise SystemExit(1)


@cli.command()
@click.option("--data-dir", "-d", required=True, type=click.Path(exists=True, file_okay=False),
              help="数据目录")
@click.option("--report-date", "-r", callback=_parse_date_arg, default=None,
              help="报告日期")
@click.option("--output-dir", "-o", default="./output", help="输出目录")
@click.option("--type", "filter_type", help="按差异类型过滤")
@click.option("--severity", help="按严重程度过滤")
def list_discrepancies(data_dir, report_date, output_dir, filter_type, severity):
    """列出所有差异"""

    ctx = import_all(data_dir, report_date)
    detect_t1_mismatch(ctx)
    detect_fee_misclassification(ctx)
    detect_partial_executions(ctx)
    match_trades(ctx)

    buckets = bucket_discrepancies(ctx)

    table = Table(title="差异清单")
    table.add_column("类型", style="cyan")
    table.add_column("严重程度", style="magenta")
    table.add_column("描述")
    table.add_column("关联成交")
    table.add_column("关联流水")

    count = 0
    for dtype, discs in sorted(buckets.items(), key=lambda x: x[0].value):
        if filter_type and filter_type not in dtype.value:
            continue
        for disc in discs:
            if severity and disc.severity != severity:
                continue
            table.add_row(
                dtype.value,
                disc.severity,
                disc.description[:60] + "..." if len(disc.description) > 60 else disc.description,
                ", ".join(disc.trade_ids)[:15],
                ", ".join(disc.flow_ids)[:15],
            )
            count += 1

    if count == 0:
        console.print("[yellow]未找到符合条件的差异[/yellow]")
    else:
        console.print(table)
        console.print(f"\n共 {count} 条差异")


def _print_summary(ctx):
    summary = generate_summary(ctx)

    console.print()
    console.print(Panel.fit("[bold]对账汇总[/bold]"))

    t = summary["trades"]
    f = summary["cash_flows"]
    d = summary["discrepancies"]

    match_rate_color = "green" if t["match_rate"] >= 0.9 else ("yellow" if t["match_rate"] >= 0.7 else "red")
    console.print(f"成交匹配率: [{match_rate_color}]{t['match_rate']:.1%}[/] ({t['matched']}/{t['total']})")
    console.print(f"流水匹配率: [{match_rate_color}]{f['match_rate']:.1%}[/] ({f['matched']}/{f['total']})")
    console.print(f"总差异数: [red]{d['total']}[/] 条")

    if d["by_severity"]:
        sev_parts = []
        for sev, cnt in d["by_severity"].items():
            color = "red" if sev == "高" else ("yellow" if sev == "中" else "blue")
            sev_parts.append(f"[{color}]{sev}: {cnt}[/]")
        console.print("严重程度: " + ", ".join(sev_parts))


if __name__ == "__main__":
    cli()
