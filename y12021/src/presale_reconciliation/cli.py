import os
import sys
from datetime import datetime
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from .data_loader import load_all_data
from .reconciliation import reconcile
from .terminal_output import print_summary, print_exception_details, print_all_results
from .report_generator import generate_all_reports

console = Console()


@click.command()
@click.option(
    "--input-dir", "-i",
    type=click.Path(exists=True, file_okay=False, dir_okay=True),
    required=True,
    help="输入数据目录，包含预售订单、定金流水、尾款支付文件",
)
@click.option(
    "--output-dir", "-o",
    type=click.Path(file_okay=False, dir_okay=True),
    default="./output",
    show_default=True,
    help="输出报告目录",
)
@click.option(
    "--grace-hours", "-g",
    type=int,
    default=0,
    show_default=True,
    help="尾款支付宽限时间（小时），超过截止时间但在宽限期内不算超时",
)
@click.option(
    "--show-all", "-a",
    is_flag=True,
    default=False,
    help="显示所有订单的对账结果，默认只显示摘要和异常",
)
@click.option(
    "--exception-limit", "-l",
    type=int,
    default=50,
    show_default=True,
    help="终端显示异常订单的最大数量",
)
@click.option(
    "--no-reports",
    is_flag=True,
    default=False,
    help="不生成报告文件，仅在终端显示",
)
@click.option(
    "--reconcile-time",
    type=str,
    default=None,
    help="指定对账时间（格式：YYYY-MM-DD HH:MM:SS），默认使用当前时间",
)
def main(
    input_dir: str,
    output_dir: str,
    grace_hours: int,
    show_all: bool,
    exception_limit: int,
    no_reports: bool,
    reconcile_time: str,
):
    """
    电商预售尾款对账工具
    
    自动对齐预售订单、定金流水、尾款支付三方数据，
    重点识别定金不退、尾款超时等异常情况，
    并明确指出问题出在哪份材料上。
    """
    
    console.print()
    console.print(Panel.fit(
        Text("🛒 电商预售尾款对账工具", style="bold blue", justify="center"),
        subtitle=f"v0.1.0 | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        border_style="blue",
    ))
    console.print()

    try:
        reconcile_dt = None
        if reconcile_time:
            try:
                reconcile_dt = datetime.strptime(reconcile_time, "%Y-%m-%d %H:%M:%S")
                console.print(f"[dim]使用指定对账时间: {reconcile_dt.strftime('%Y-%m-%d %H:%M:%S')}[/dim]")
            except ValueError:
                console.print(f"[yellow]⚠️  时间格式错误，使用当前时间。正确格式：YYYY-MM-DD HH:MM:SS[/yellow]")
        
        console.print(f"[cyan]📂 读取数据文件...[/cyan]")
        data = load_all_data(input_dir)
        
        if not data["orders"] and not data["deposits"] and not data["balances"]:
            console.print(f"[red]❌ 在输入目录中未找到任何数据文件！[/red]")
            console.print(f"[dim]请确保目录中包含文件名包含 '订单/order'、'定金/deposit'、'尾款/balance' 的CSV或Excel文件[/dim]")
            sys.exit(1)
        
        console.print(f"  ✅ 预售订单: {len(data['orders'])} 条" + (f" ({data['order_file']})" if data['order_file'] else ""))
        console.print(f"  ✅ 定金流水: {len(data['deposits'])} 条" + (f" ({data['deposit_file']})" if data['deposit_file'] else ""))
        console.print(f"  ✅ 尾款支付: {len(data['balances'])} 条" + (f" ({data['balance_file']})" if data['balance_file'] else ""))
        
        console.print()
        console.print(f"[cyan]🔍 执行对账逻辑...[/cyan]")
        
        summary = reconcile(
            orders=data["orders"],
            deposits=data["deposits"],
            balances=data["balances"],
            balance_grace_hours=grace_hours,
            current_time=reconcile_dt,
        )
        
        console.print(f"  ✅ 对账完成，共处理 {summary.total_orders} 条订单")
        
        print_summary(summary, data)
        print_exception_details(summary, limit=exception_limit)
        
        if show_all:
            print_all_results(summary)
        
        if not no_reports:
            console.print()
            console.print(f"[cyan]📄 生成报告文件...[/cyan]")
            
            os.makedirs(output_dir, exist_ok=True)
            reports = generate_all_reports(summary, output_dir, data)
            
            console.print(f"  ✅ Markdown报告: {reports['markdown']}")
            console.print(f"  ✅ HTML报告: {reports['html']}")
            console.print(f"  ✅ Excel明细: {reports['excel']}")
            
            console.print()
            console.print(Panel.fit(
                Text("✅ 对账完成！报告已生成，可以直接转发", style="bold green", justify="center"),
                border_style="green",
            ))
        
        if summary.exception_count > 0:
            console.print()
            console.print(f"[yellow]⚠️  共发现 {summary.exception_count} 条异常，请优先处理定金不退和尾款超时的订单[/yellow]")
            if summary.deposit_not_refund_count > 0:
                console.print(f"   [bold red on yellow]⚠️  定金不退: {summary.deposit_not_refund_count} 笔，需确认是否符合规则[/bold red on yellow]")
            if summary.balance_timeout_count > 0:
                console.print(f"   [bold white on red]⏰ 尾款超时: {summary.balance_timeout_count} 笔，需跟进处理[/bold white on red]")
        
        console.print()
        
    except ValueError as e:
        console.print(f"[red]❌ 数据错误: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]❌ 程序异常: {e}[/red]")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
