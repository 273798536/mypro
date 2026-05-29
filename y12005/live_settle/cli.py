import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import print as rprint

from .validator import MaterialLoader, ValidationError
from .tax import TaxCalculator
from .calculator import ShareCalculator
from .snapshot import SnapshotManager

console = Console()


def _print_banner():
    banner = Text("直播打赏税费拆分工具", style="bold cyan")
    banner.append("\n主播账号 · 打赏流水 · 工会协议 对齐", style="dim")
    console.print(Panel(banner, border_style="blue"))


def _print_errors(errors):
    if not errors:
        return

    error_table = Table(title="❌ 材料校验失败", show_lines=True, border_style="red")
    error_table.add_column("来源文件", style="yellow", no_wrap=True)
    error_table.add_column("行号", style="yellow", justify="right")
    error_table.add_column("字段", style="magenta")
    error_table.add_column("错误信息", style="red")

    for err in errors:
        error_table.add_row(
            err.source_file,
            str(err.source_line),
            err.field or "-",
            err.message,
        )

    console.print(error_table)
    console.print(
        Text(f"共 {len(errors)} 个错误，请修复后重试", style="bold red")
    )


def _print_warnings(warnings):
    if not warnings:
        return

    warn_table = Table(title="⚠️  材料警告", show_lines=False, border_style="yellow")
    warn_table.add_column("警告信息", style="yellow")

    for w in warnings:
        warn_table.add_row(w)

    console.print(warn_table)


def _print_summary(results, files_hash):
    from decimal import Decimal

    total_txn = len(results)
    cross_month_count = sum(1 for r in results if r.is_cross_month_refund)
    rate_switch_count = sum(1 for r in results if r.tax_rate_switched)
    warning_count = sum(1 for r in results if r.warnings)

    total_original = sum(r.original_amount for r in results)
    total_platform = sum(r.platform_amount for r in results)
    total_union = sum(r.union_amount for r in results)
    total_anchor_gross = sum(r.anchor_gross_amount for r in results)
    total_tax = sum(r.total_tax for r in results)
    total_anchor_net = sum(r.anchor_net_amount for r in results)

    summary_table = Table(title="✅ 税费拆分完成", show_lines=False, border_style="green")
    summary_table.add_column("项目", style="cyan", no_wrap=True)
    summary_table.add_column("数值", justify="right")

    summary_table.add_row("交易总数", str(total_txn))
    summary_table.add_row("跨月退款笔数", Text(str(cross_month_count), style="bold yellow" if cross_month_count else "white"))
    summary_table.add_row("税率切换笔数", Text(str(rate_switch_count), style="bold yellow" if rate_switch_count else "white"))
    summary_table.add_row("含警告笔数", Text(str(warning_count), style="bold yellow" if warning_count else "white"))
    summary_table.add_row("---", "---")
    summary_table.add_row("打赏总金额", f"¥{total_original:,.2f}")
    summary_table.add_row("平台分成", f"¥{total_platform:,.2f}")
    summary_table.add_row("工会分成", f"¥{total_union:,.2f}")
    summary_table.add_row("主播税前", f"¥{total_anchor_gross:,.2f}")
    summary_table.add_row("税费合计", Text(f"¥{total_tax:,.2f}", style="red"))
    summary_table.add_row("主播税后", Text(f"¥{total_anchor_net:,.2f}", style="bold green"))

    console.print(summary_table)

    if cross_month_count > 0 or rate_switch_count > 0 or warning_count > 0:
        alert_lines = []
        if cross_month_count > 0:
            alert_lines.append(Text(f"🔴 发现 {cross_month_count} 笔跨月退款，请人工核对", style="bold red"))
        if rate_switch_count > 0:
            alert_lines.append(Text(f"🟡 发现 {rate_switch_count} 笔税率切换，请核对税率适用", style="bold yellow"))
        if warning_count > 0:
            alert_lines.append(Text(f"🟠 有 {warning_count} 笔交易含警告信息", style="bold yellow"))

        console.print(Panel(Text("\n").join(alert_lines), title="需要人工复核", border_style="red"))

    console.print(Text(f"材料校验和: {files_hash}", style="dim"))


def _print_highlights(results):
    special_results = [
        r for r in results
        if r.is_cross_month_refund or r.tax_rate_switched or r.warnings
    ]

    if not special_results:
        return

    highlight_table = Table(
        title="🔍 需要重点关注的交易",
        show_lines=True,
        border_style="yellow",
    )
    highlight_table.add_column("交易ID", style="cyan")
    highlight_table.add_column("主播", style="magenta")
    highlight_table.add_column("金额", justify="right")
    highlight_table.add_column("结算月", style="blue")
    highlight_table.add_column("标记", style="red")
    highlight_table.add_column("说明", style="yellow")

    for r in special_results:
        tags = []
        if r.is_cross_month_refund:
            tags.append(Text("跨月退款", style="bold red"))
        if r.tax_rate_switched:
            tags.append(Text("税率切换", style="bold yellow"))
        if r.warnings:
            tags.append(Text("警告", style="bold magenta"))

        tag_text = Text(" ").join(tags)
        warn_text = Text("\n").join([Text(w) for w in r.warnings]) if r.warnings else Text("-")

        highlight_table.add_row(
            r.transaction_id,
            r.anchor_name,
            f"¥{r.original_amount:,.2f}",
            r.settle_month,
            tag_text,
            warn_text,
        )

    console.print(highlight_table)


@click.group()
@click.version_option(package_name="live-settle")
def cli():
    """直播打赏税费拆分工具 - 主播账号、打赏流水、工会协议对齐"""
    pass


@cli.command()
@click.option(
    "--input-dir", "-i",
    default="./input",
    show_default=True,
    type=click.Path(file_okay=False, path_type=Path),
    help="输入材料目录",
)
@click.option(
    "--output-dir", "-o",
    default="./output",
    show_default=True,
    type=click.Path(file_okay=False, path_type=Path),
    help="输出结果目录",
)
@click.option(
    "--batch-id", "-b",
    default=None,
    help="批次号，默认自动生成",
)
@click.option(
    "--force", "-f",
    is_flag=True,
    default=False,
    help="强制重新处理，即使材料未变更",
)
def split(input_dir: Path, output_dir: Path, batch_id: Optional[str], force: bool):
    """执行税费拆分计算"""
    _print_banner()

    input_dir = Path(input_dir).resolve()
    output_dir = Path(output_dir).resolve()

    if not input_dir.exists():
        console.print(f"[red]错误: 输入目录不存在: {input_dir}[/red]")
        sys.exit(1)

    if not batch_id:
        batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    console.print(f"[dim]批次号: {batch_id}[/dim]")
    console.print(f"[dim]输入目录: {input_dir}[/dim]")
    console.print(f"[dim]输出目录: {output_dir}[/dim]")
    console.print()

    with console.status("[cyan]正在加载并校验材料..."):
        loader = MaterialLoader(input_dir)
        success, data = loader.load_all()

    if data["warnings"]:
        _print_warnings(data["warnings"])

    if not success:
        _print_errors(data["errors"])
        sys.exit(1)

    snapshot_mgr = SnapshotManager(output_dir)

    files_hash = data["files_hash"]
    is_duplicate, existing = snapshot_mgr.check_idempotency(files_hash, force)

    if is_duplicate and existing:
        console.print()
        console.print(Panel(
            Text(
                f"检测到相同材料已处理过\n"
                f"上次处理时间: {existing['created_at']}\n"
                f"上次快照ID: {existing['snapshot_id']}\n"
                f"上次结果文件: {existing['result_file']}\n\n"
                f"如需重新处理请使用 --force 参数",
                style="yellow"
            ),
            title="幂等性保护",
            border_style="yellow",
        ))
        sys.exit(0)

    with console.status("[cyan]正在创建协议快照..."):
        snapshot = snapshot_mgr.create_snapshot(
            batch_id=batch_id,
            files_hash=files_hash,
            anchors=data["anchors"],
            tax_rates=data["tax_rates"],
            agreements=data["agreements"],
            transactions=data["transactions"],
        )

    with console.status("[cyan]正在计算税费拆分..."):
        try:
            tax_calc = TaxCalculator(data["tax_rates"])
        except ValueError as e:
            console.print(f"[red]税率表错误: {e}[/red]")
            sys.exit(1)

        share_calc = ShareCalculator(
            anchors=data["anchors"],
            agreements=data["agreements"],
            tax_calculator=tax_calc,
        )
        results = share_calc.process_all(
            transactions=data["transactions"],
            snapshot_id=snapshot.snapshot_id,
        )

    with console.status("[cyan]正在保存结果..."):
        result_file = snapshot_mgr.save_results(
            batch_id=batch_id,
            results=results,
            snapshot_id=snapshot.snapshot_id,
        )
        summary_file = snapshot_mgr.save_summary_json(
            batch_id=batch_id,
            results=results,
            snapshot_id=snapshot.snapshot_id,
        )

    console.print()
    _print_summary(results, files_hash)
    _print_highlights(results)

    console.print()
    console.print(f"[green]✓ 结果已保存:[/green] {result_file}")
    console.print(f"[green]✓ 汇总已保存:[/green] {summary_file}")
    console.print(f"[dim]快照ID: {snapshot.snapshot_id}[/dim]")


@cli.command("check")
@click.option(
    "--input-dir", "-i",
    default="./input",
    show_default=True,
    type=click.Path(file_okay=False, path_type=Path),
    help="输入材料目录",
)
def check(input_dir: Path):
    """仅校验材料，不执行计算"""
    _print_banner()

    input_dir = Path(input_dir).resolve()

    if not input_dir.exists():
        console.print(f"[red]错误: 输入目录不存在: {input_dir}[/red]")
        sys.exit(1)

    console.print(f"[dim]输入目录: {input_dir}[/dim]")
    console.print()

    with console.status("[cyan]正在校验材料..."):
        loader = MaterialLoader(input_dir)
        success, data = loader.load_all()

    if data["warnings"]:
        _print_warnings(data["warnings"])

    if success:
        console.print()
        console.print(Panel(
            Text(
                f"✓ 主播账号: {len(data['anchors'])} 条\n"
                f"✓ 税率配置: {len(data['tax_rates'])} 条\n"
                f"✓ 工会协议: {len(data['agreements'])} 条\n"
                f"✓ 打赏流水: {len(data['transactions'])} 条\n\n"
                f"材料校验和: {data['files_hash']}",
                style="green"
            ),
            title="✅ 材料校验通过",
            border_style="green",
        ))
    else:
        _print_errors(data["errors"])
        sys.exit(1)


@cli.command("list")
@click.option(
    "--output-dir", "-o",
    default="./output",
    show_default=True,
    type=click.Path(file_okay=False, path_type=Path),
    help="输出结果目录",
)
def list_snapshots(output_dir: Path):
    """列出历史处理记录"""
    output_dir = Path(output_dir).resolve()
    snapshot_mgr = SnapshotManager(output_dir)

    if not snapshot_mgr._index["snapshots"]:
        console.print("[yellow]暂无历史处理记录[/yellow]")
        return

    table = Table(title="历史处理记录", show_lines=False, border_style="blue")
    table.add_column("快照ID", style="cyan")
    table.add_column("批次号", style="magenta")
    table.add_column("处理时间", style="green")
    table.add_column("材料校验和", style="yellow")
    table.add_column("结果文件", style="dim")

    for snap_id, info in sorted(
        snapshot_mgr._index["snapshots"].items(),
        key=lambda x: x[1]["created_at"],
        reverse=True,
    ):
        table.add_row(
            snap_id,
            info["batch_id"],
            info["created_at"],
            info["files_hash"],
            info.get("result_file", "-"),
        )

    console.print(table)


@cli.command("init")
@click.option(
    "--input-dir", "-i",
    default="./input",
    show_default=True,
    type=click.Path(file_okay=False, path_type=Path),
    help="输入材料目录",
)
def init_sample(input_dir: Path):
    """创建示例输入文件，方便直接试用"""
    _print_banner()

    input_dir = Path(input_dir).resolve()
    input_dir.mkdir(parents=True, exist_ok=True)

    samples = {
        "anchors.csv": """anchor_id,anchor_name,union_id,id_card,bank_card,status,sign_date,remark
A001,张主播,U001,110***********1111,6222**********1111,active,2024-01-01,签约主播
A002,李主播,U001,110***********2222,6222**********2222,active,2024-02-15,
A003,王主播,,110***********3333,6222**********3333,active,2024-03-01,个人主播无工会
A004,赵主播,U002,110***********4444,6222**********4444,inactive,2023-06-01,已离职
""",
        "tax_rates.csv": """tax_type,tax_code,rate,effective_start,effective_end,taxable_item,deduction_threshold,quick_calculation_deduction
个人所得税,0101,0.20,2024-01-01,2024-06-30,劳务报酬,800,0
个人所得税,0101,0.30,2024-07-01,,劳务报酬,800,0
增值税,0201,0.03,2024-01-01,,服务费,0,0
附加税,0301,0.0036,2024-01-01,,城建及附加,0,0
""",
        "agreements.csv": """agreement_id,union_id,union_name,anchor_id,platform_share_rate,union_share_rate,anchor_share_rate,effective_start,effective_end
AGR001,U001,星辰工会,A001,0.30,0.20,0.50,2024-01-01,
AGR002,U001,星辰工会,A002,0.30,0.15,0.55,2024-02-15,
AGR003,U002,银河工会,A004,0.35,0.15,0.50,2023-06-01,2024-05-31
AGR004,U001,星辰工会,A001,0.30,0.15,0.55,2024-06-01,
""",
        "transactions.csv": """transaction_id,anchor_id,transaction_type,amount,transaction_date,settle_month,gift_name,viewer_id,related_transaction_id,remark
TXN001,A001,reward,1000.00,2024-03-15 20:30:00,2024-03,火箭,V001,,
TXN002,A001,reward,500.00,2024-03-16 21:00:00,2024-03,飞机,V002,,
TXN003,A002,reward,2000.00,2024-03-17 19:00:00,2024-03,超火,V003,,
TXN004,A003,reward,800.00,2024-03-18 20:00:00,2024-03,跑车,V004,,
TXN005,A001,refund,1000.00,2024-04-02 10:00:00,2024-04,,V001,TXN001,跨月退款
TXN006,A001,reward,3000.00,2024-07-10 20:00:00,2024-07,城堡,V005,,税率切换后
TXN007,A002,refund,500.00,2024-03-20 14:00:00,2024-03,,V006,TXN003,当月退款
TXN008,A004,reward,600.00,2024-03-10 15:00:00,2024-03,皇冠,V007,,已离职主播
""",
    }

    for filename, content in samples.items():
        filepath = input_dir / filename
        with open(filepath, "w", encoding="utf-8-sig") as f:
            f.write(content)
        console.print(f"[green]✓ 已创建示例文件:[/green] {filepath}")

    console.print()
    console.print(Panel(
        Text(
            "示例文件已创建，包含以下场景:\n"
            "• 正常打赏交易\n"
            "• 当月退款（TXN007）\n"
            "• 跨月退款（TXN005，关联TXN001）\n"
            "• 税率切换（2024-07-01后个税从20%变为30%）\n"
            "• 协议变更（A001主播2024-06-01后分成比例调整）\n"
            "• 已离职主播交易（A004）\n"
            "• 无工会主播（A003）\n\n"
            "下一步操作:\n"
            "  1. 校验材料: live-settle check\n"
            "  2. 执行拆分: live-settle split",
            style="cyan"
        ),
        title="示例初始化完成",
        border_style="green",
    ))


if __name__ == "__main__":
    cli()
