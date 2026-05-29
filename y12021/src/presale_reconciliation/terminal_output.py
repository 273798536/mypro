from typing import Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box

from .models import (
    ReconciliationSummary,
    ReconciliationItem,
    ExceptionType,
    DataSource,
)

console = Console()


def _format_exception_type(exception_type: ExceptionType) -> Text:
    if exception_type == ExceptionType.DEPOSIT_NOT_REFUND:
        return Text("⚠️ 定金不退", style="bold red on yellow")
    elif exception_type == ExceptionType.BALANCE_TIMEOUT:
        return Text("⏰ 尾款超时", style="bold white on red")
    elif exception_type in [ExceptionType.DEPOSIT_MISMATCH, ExceptionType.BALANCE_MISMATCH, ExceptionType.AMOUNT_MISMATCH]:
        return Text("💰 金额不符", style="bold yellow")
    elif exception_type in [ExceptionType.MISSING_DEPOSIT, ExceptionType.MISSING_BALANCE, ExceptionType.MISSING_ORDER]:
        return Text("📋 缺失数据", style="bold magenta")
    else:
        return Text("✅ 正常", style="bold green")


def _format_problem_source(sources: list) -> str:
    if not sources:
        return "-"
    return "、".join([s.value for s in sources])


def print_summary(summary: ReconciliationSummary, input_files: dict = None):
    console.print()
    console.print(Panel.fit(
        Text("📊 电商预售尾款对账结果摘要", style="bold blue", justify="center"),
        border_style="blue",
    ))
    console.print()

    if input_files:
        files_table = Table(title="📁 输入文件", box=box.SIMPLE, show_header=True)
        files_table.add_column("数据类型", style="cyan")
        files_table.add_column("文件路径", style="white")
        files_table.add_column("记录数", style="green", justify="right")
        
        if input_files.get("order_file"):
            files_table.add_row("预售订单", input_files["order_file"], str(len(input_files.get("orders", []))))
        else:
            files_table.add_row("预售订单", "[yellow]未找到[/yellow]", "0")
            
        if input_files.get("deposit_file"):
            files_table.add_row("定金流水", input_files["deposit_file"], str(len(input_files.get("deposits", []))))
        else:
            files_table.add_row("定金流水", "[yellow]未找到[/yellow]", "0")
            
        if input_files.get("balance_file"):
            files_table.add_row("尾款支付", input_files["balance_file"], str(len(input_files.get("balances", []))))
        else:
            files_table.add_row("尾款支付", "[yellow]未找到[/yellow]", "0")
        
        console.print(files_table)
        console.print()

    stats_table = Table(title="📈 对账统计", box=box.ROUNDED, show_header=True)
    stats_table.add_column("指标", style="cyan", no_wrap=True)
    stats_table.add_column("数值", style="white", justify="right")
    stats_table.add_column("说明", style="dim")

    match_rate = (summary.matched_count / summary.total_orders * 100) if summary.total_orders > 0 else 0
    exception_rate = (summary.exception_count / summary.total_orders * 100) if summary.total_orders > 0 else 0

    stats_table.add_row("总订单数", str(summary.total_orders), "参与对账的订单总数")
    stats_table.add_row(
        "✅ 对账通过", 
        f"[bold green]{summary.matched_count} ({match_rate:.1f}%)[/bold green]", 
        "三方数据完全一致"
    )
    stats_table.add_row(
        "❌ 存在异常", 
        f"[bold red]{summary.exception_count} ({exception_rate:.1f}%)[/bold red]", 
        "需要人工核查"
    )
    stats_table.add_row("", "", "")
    stats_table.add_row(
        "⚠️  定金不退", 
        f"[bold red on yellow]{summary.deposit_not_refund_count}[/bold red on yellow]", 
        "买家未付尾款，定金不予退还"
    )
    stats_table.add_row(
        "⏰ 尾款超时", 
        f"[bold white on red]{summary.balance_timeout_count}[/bold white on red]", 
        "超过尾款支付截止时间"
    )
    stats_table.add_row(
        "💰 金额不符", 
        f"[bold yellow]{summary.amount_mismatch_count}[/bold yellow]", 
        "金额不一致"
    )
    stats_table.add_row(
        "📋 缺失数据", 
        f"[bold magenta]{summary.missing_data_count}[/bold magenta]", 
        "缺少订单/流水/支付记录"
    )
    stats_table.add_row("", "", "")
    stats_table.add_row("📊 订单总金额", f"¥{summary.total_order_amount:,.2f}", "预售订单总额")
    stats_table.add_row("💳 定金总额", f"¥{summary.total_deposit_amount:,.2f}", "实际收到定金")
    stats_table.add_row("💵 尾款总额", f"¥{summary.total_balance_amount:,.2f}", "实际收到尾款")
    stats_table.add_row(
        "💰 累计收款", 
        f"¥{summary.total_deposit_amount + summary.total_balance_amount:,.2f}", 
        "定金+尾款合计"
    )

    console.print(stats_table)
    console.print()


def print_exception_details(summary: ReconciliationSummary, limit: int = 20):
    if not summary.exception_details:
        console.print(Panel(
            Text("🎉 恭喜！所有订单对账通过，无异常记录", style="bold green", justify="center"),
            border_style="green",
        ))
        return

    console.print()
    console.print(Panel.fit(
        Text("🔍 异常订单详情", style="bold red", justify="center"),
        border_style="red",
    ))
    console.print()

    high_priority = []
    normal_priority = []
    
    for item in summary.exception_details:
        if item.exception_type in [ExceptionType.DEPOSIT_NOT_REFUND, ExceptionType.BALANCE_TIMEOUT]:
            high_priority.append(item)
        else:
            normal_priority.append(item)

    displayed = 0

    if high_priority:
        console.print(Text("🚨 【高优先级】需要立即处理的问题", style="bold red on white"))
        console.print()
        
        for item in high_priority:
            if displayed >= limit:
                break
            _print_exception_item(item)
            displayed += 1

    if normal_priority and displayed < limit:
        console.print()
        console.print(Text("📌 【普通优先级】需要核实的问题", style="bold yellow"))
        console.print()
        
        for item in normal_priority:
            if displayed >= limit:
                break
            _print_exception_item(item)
            displayed += 1

    if len(summary.exception_details) > limit:
        console.print()
        console.print(Text(
            f"    ... 还有 {len(summary.exception_details) - limit} 条异常记录未显示，详情请查看完整报告",
            style="dim"
        ))


def _print_exception_item(item: ReconciliationItem):
    order_info = f"[cyan]订单号:[/cyan] {item.order_no}"
    
    if item.order:
        order_info += f" | [cyan]商品:[/cyan] {item.order.product_name}"
        order_info += f" | [cyan]金额:[/cyan] 定金¥{item.order.deposit_amount:.2f} + 尾款¥{item.order.balance_amount:.2f} = ¥{item.order.total_amount:.2f}"
    
    console.print(order_info)
    
    status_line = Text()
    status_line.append("    状态: ")
    status_line.append(_format_exception_type(item.exception_type))
    console.print(status_line)
    
    if item.problem_source:
        source_text = "、".join([f"[bold yellow]{s.value}[/bold yellow]" for s in item.problem_source])
        console.print(f"    问题材料: {source_text}")
    
    desc = item.exception_desc
    if "【定金不退】" in desc:
        desc = desc.replace("【定金不退】", "")
        console.print(f"    [bold red on yellow]⚠️  定金不退:[/bold red on yellow] {desc}")
    elif "【尾款超时】" in desc or "【尾款已超时未付】" in desc or "【尾款超时支付】" in desc:
        desc = desc.replace("【尾款超时】", "").replace("【尾款已超时未付】", "").replace("【尾款超时支付】", "")
        console.print(f"    [bold white on red]⏰ 尾款超时:[/bold white on red] {desc}")
    else:
        console.print(f"    说明: {desc}")
    
    if item.deposit:
        console.print(f"    定金流水: {item.deposit.transaction_no} | 金额¥{item.deposit.pay_amount:.2f} | {item.deposit.pay_time.strftime('%Y-%m-%d %H:%M') if item.deposit.pay_time else '时间未知'}")
    if item.balance:
        console.print(f"    尾款支付: {item.balance.transaction_no} | 金额¥{item.balance.pay_amount:.2f} | {item.balance.pay_time.strftime('%Y-%m-%d %H:%M') if item.balance.pay_time else '时间未知'}")
    
    console.print(Text("─" * 80, style="dim"))


def print_all_results(summary: ReconciliationSummary):
    console.print()
    console.print(Panel.fit(
        Text("📋 全部订单对账结果", style="bold blue", justify="center"),
        border_style="blue",
    ))
    console.print()

    table = Table(box=box.SIMPLE, show_header=True)
    table.add_column("订单号", style="cyan", no_wrap=True)
    table.add_column("商品", style="white")
    table.add_column("状态", style="white", no_wrap=True)
    table.add_column("问题材料", style="yellow")
    table.add_column("说明", style="white")

    for item in summary.all_results:
        product = item.order.product_name if item.order else "-"
        problem_source = _format_problem_source(item.problem_source)
        
        table.add_row(
            item.order_no,
            product[:20] + "..." if len(product) > 20 else product,
            _format_exception_type(item.exception_type),
            problem_source,
            item.exception_desc[:50] + "..." if len(item.exception_desc) > 50 else item.exception_desc,
        )

    console.print(table)
