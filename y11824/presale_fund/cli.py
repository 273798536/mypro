import os
import sys
from datetime import datetime
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from .data_loader import DataLoader
from .calculator import DisbursementCalculator
from .comparison import ChangeDetector
from .query import QueryEngine
from .exporter import ResultExporter

console = Console()


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """预售房监管资金拨付CLI工具"""
    pass


@cli.command()
@click.option('--input', '-i', required=True, help='输入文件或目录路径')
@click.option('--output', '-o', required=True, help='输出目录路径')
@click.option('--batch', '-b', help='批次号，默认自动生成')
@click.option('--compare/--no-compare', default=True, help='是否与上一批次对比')
@click.option('--history-dir', help='历史记录目录，默认在输出目录下的history子目录')
def run(input, output, batch, compare, history_dir):
    """计算预售房监管资金拨付"""
    
    if not batch:
        batch = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    if not history_dir:
        history_dir = os.path.join(output, 'history')
    
    console.print(Panel(f"[bold blue]开始计算预售房监管资金拨付[/bold blue]\n批次号: {batch}"))
    
    try:
        console.print("[yellow]正在加载数据...[/yellow]")
        nodes, invoices, accounts = DataLoader.load_excel(input)
        console.print(f"[green]数据加载完成:[/green]")
        console.print(f"  - 工程节点: {len(nodes)} 个")
        console.print(f"  - 发票: {len(invoices)} 张")
        console.print(f"  - 监管账户: {len(accounts)} 个")
        
        console.print("\n[yellow]正在计算拨付...[/yellow]")
        calculator = DisbursementCalculator(batch)
        disbursements = calculator.calculate_disbursements(nodes, invoices, accounts)
        console.print(f"[green]计算完成:[/green] 生成 {len(disbursements)} 条拨付记录")
        
        console.print("\n[yellow]正在保存历史记录...[/yellow]")
        change_detector = ChangeDetector(history_dir)
        change_detector.save_run_records(disbursements, batch)
        
        comparison_results = []
        if compare:
            console.print("[yellow]正在与上一批次对比...[/yellow]")
            comparison_results = change_detector.compare_with_previous(disbursements)
            changed_count = sum(1 for c in comparison_results if c.has_changes)
            console.print(f"[green]对比完成:[/green] {changed_count}/{len(comparison_results)} 条记录有变更")
        
        console.print("\n[yellow]正在导出结果...[/yellow]")
        exporter = ResultExporter(output)
        report_path = exporter.export_detailed_report(disbursements, comparison_results)
        console.print(f"[green]结果已导出:[/green] {report_path}")
        
        console.print("\n[bold green]✓ 拨付计算完成![/bold green]")
        
        _display_results(disbursements, comparison_results)
        
    except Exception as e:
        console.print(f"[bold red]✗ 执行失败: {str(e)}[/bold red]")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def _display_results(disbursements, comparison_results):
    if not disbursements:
        return
    
    table = Table(title="拨付结果汇总")
    table.add_column("项目名称", style="cyan")
    table.add_column("申请总额", justify="right", style="green")
    table.add_column("批准总额", justify="right", style="green")
    table.add_column("明细数", justify="right")
    table.add_column("状态", style="yellow")
    table.add_column("变更", style="magenta")
    
    comp_map = {c.disbursement_id: c for c in comparison_results}
    
    for record in disbursements:
        comp = comp_map.get(record.disbursement_id)
        has_change = "是" if (comp and comp.has_changes) else "否"
        
        table.add_row(
            record.project_name,
            f"{record.total_request_amount:,.2f}",
            f"{record.total_approved_amount:,.2f}",
            str(len(record.items)),
            record.status.value,
            has_change
        )
    
    console.print(table)


@cli.command()
@click.option('--batch', '-b', help='指定批次号进行对比')
@click.option('--history-dir', default='./output/history', help='历史记录目录')
@click.option('--output', '-o', default='./output', help='输出目录')
def compare(batch, history_dir, output):
    """对比批次间的变化"""
    
    console.print(Panel("[bold blue]批次对比[/bold blue]"))
    
    try:
        change_detector = ChangeDetector(history_dir)
        query_engine = QueryEngine(history_dir)
        
        all_batches = query_engine.get_all_batches()
        if not all_batches:
            console.print("[yellow]没有找到历史批次记录[/yellow]")
            return
        
        console.print(f"[green]可用批次:[/green] {', '.join(all_batches)}")
        
        if len(all_batches) < 2:
            console.print("[yellow]至少需要两个批次才能对比[/yellow]")
            return
        
        if batch:
            if batch not in all_batches:
                console.print(f"[red]批次不存在: {batch}[/red]")
                return
            batch1_idx = all_batches.index(batch)
            if batch1_idx > 0:
                batch1, batch2 = all_batches[batch1_idx - 1], batch
            else:
                console.print("[yellow]指定批次是第一个批次，无法对比[/yellow]")
                return
        else:
            batch1, batch2 = all_batches[-2], all_batches[-1]
        
        console.print(f"\n[cyan]对比批次:[/cyan] {batch1} -> {batch2}")
        
        records1 = query_engine.query_by_batch(batch1)
        records2 = query_engine.query_by_batch(batch2)
        
        console.print(f"  批次1记录数: {len(records1)}")
        console.print(f"  批次2记录数: {len(records2)}")
        
        comparison_results = change_detector.compare_with_previous(
            records2, batch1
        )
        
        exporter = ResultExporter(output)
        comp_path = exporter.export_comparison(comparison_results, f'compare_{batch1}_vs_{batch2}.xlsx')
        console.print(f"\n[green]对比结果已导出:[/green] {comp_path}")
        
        _display_comparison(comparison_results)
        
    except Exception as e:
        console.print(f"[bold red]✗ 对比失败: {str(e)}[/bold red]")
        sys.exit(1)


def _display_comparison(comparison_results):
    table = Table(title="变更详情")
    table.add_column("拨付记录ID", style="cyan")
    table.add_column("字段", style="blue")
    table.add_column("原值", style="yellow")
    table.add_column("新值", style="green")
    table.add_column("类型", style="magenta")
    table.add_column("原因", style="white")
    
    has_changes = False
    for result in comparison_results:
        if result.has_changes:
            has_changes = True
            for change in result.changes:
                table.add_row(
                    result.disbursement_id[:8] + "...",
                    change.field_name,
                    change.old_value,
                    change.new_value,
                    change.change_type,
                    change.reason or ""
                )
    
    if has_changes:
        console.print(table)
    else:
        console.print("[green]✓ 没有发现变更[/green]")


@cli.command()
@click.argument('query_type', type=click.Choice(['node', 'account', 'project', 'invoice', 'disbursement', 'batch', 'trace', 'rtrace']))
@click.argument('query_value')
@click.option('--history-dir', default='./output/history', help='历史记录目录')
@click.option('--output', '-o', help='导出结果到Excel')
def query(query_type, query_value, history_dir, output):
    """查询历史记录
    
    QUERY_TYPE: node(节点), account(账户), project(项目), invoice(发票), 
                disbursement(拨付), batch(批次), trace(正向追溯), rtrace(反向追溯)
    """
    
    console.print(Panel(f"[bold blue]查询: {query_type} = {query_value}[/bold blue]"))
    
    try:
        query_engine = QueryEngine(history_dir)
        
        results = []
        if query_type == 'node':
            results = query_engine.query_by_node(query_value)
        elif query_type == 'account':
            results = query_engine.query_by_account(query_value)
        elif query_type == 'project':
            results = query_engine.query_by_project(query_value)
        elif query_type == 'invoice':
            results = query_engine.query_by_invoice(query_value)
        elif query_type == 'disbursement':
            result = query_engine.query_by_disbursement(query_value)
            results = [result] if result else []
        elif query_type == 'batch':
            results = query_engine.query_by_batch(query_value)
        elif query_type == 'trace':
            trace_result = query_engine.get_trace_path(query_value)
            _display_trace(trace_result, reverse=False)
            return
        elif query_type == 'rtrace':
            trace_result = query_engine.get_reverse_trace_path(query_value)
            _display_trace(trace_result, reverse=True)
            return
        
        if not results:
            console.print("[yellow]没有找到匹配的记录[/yellow]")
            return
        
        console.print(f"[green]找到 {len(results)} 条记录[/green]")
        
        if output:
            exporter = ResultExporter(output)
            export_path = exporter.export_query_result(results, query_type)
            console.print(f"[green]结果已导出:[/green] {export_path}")
        else:
            _display_query_results(results, query_type)
        
    except Exception as e:
        console.print(f"[bold red]✗ 查询失败: {str(e)}[/bold red]")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def _display_query_results(results, query_type):
    if not results:
        return
    
    table = Table(title="查询结果")
    
    if query_type == 'node':
        table.add_column("拨付记录ID", style="cyan")
        table.add_column("项目名称", style="green")
        table.add_column("节点名称", style="blue")
        table.add_column("金额", justify="right", style="yellow")
        table.add_column("状态", style="magenta")
        
        for r in results:
            table.add_row(r['disbursement_id'][:8], r['project_name'], r['node_name'],
                         f"{r['amount']:.2f}", r['status'])
    
    elif query_type == 'account':
        table.add_column("拨付记录ID", style="cyan")
        table.add_column("项目名称", style="green")
        table.add_column("总额", justify="right", style="yellow")
        table.add_column("明细数", justify="right")
        table.add_column("批次", style="magenta")
        
        for r in results:
            table.add_row(r['disbursement_id'][:8], r['project_name'],
                         f"{r['total_amount']:.2f}", str(r['item_count']), r['batch_no'])
    
    elif query_type == 'project':
        table.add_column("拨付记录ID", style="cyan")
        table.add_column("总额", justify="right", style="yellow")
        table.add_column("状态", style="magenta")
        table.add_column("批次", style="blue")
        
        for r in results:
            table.add_row(r['disbursement_id'][:8], f"{r['total_amount']:.2f}",
                         r['status'], r['batch_no'])
    
    elif query_type == 'invoice':
        table.add_column("拨付记录ID", style="cyan")
        table.add_column("项目名称", style="green")
        table.add_column("节点名称", style="blue")
        table.add_column("发票金额", justify="right", style="yellow")
        table.add_column("拨付金额", justify="right", style="green")
        
        for r in results:
            table.add_row(r['disbursement_id'][:8], r['project_name'], r['node_name'],
                         f"{r['invoice_amount']:.2f}", f"{r['disbursement_amount']:.2f}")
    
    console.print(table)


def _display_trace(trace_result, reverse=False):
    if not trace_result['found']:
        console.print("[yellow]没有找到追溯路径[/yellow]")
        return
    
    direction = "正向追溯 (节点→拨付→账户)" if not reverse else "反向追溯 (账户→拨付→节点)"
    console.print(f"\n[bold cyan]{direction}[/bold cyan]")
    
    for i, path in enumerate(trace_result['path'], 1):
        console.print(f"\n[yellow]路径 {i}:[/yellow]")
        _print_path_item(path, 0)


def _print_path_item(item, level):
    indent = "  " * level
    if 'step' in item:
        console.print(f"{indent}[cyan]●[/cyan] {item['step']}: [bold]{item.get('id', item.get('node_id', ''))}[/bold]")
        if 'name' in item:
            console.print(f"{indent}  名称: {item['name']}")
        if 'project' in item:
            console.print(f"{indent}  项目: {item['project']}")
        if 'amount' in item:
            console.print(f"{indent}  金额: {item['amount']:.2f}")
        if 'total_amount' in item:
            console.print(f"{indent}  总额: {item['total_amount']:.2f}")
        if 'node_name' in item:
            console.print(f"{indent}  节点: {item['node_name']}")
    
    if 'next' in item:
        _print_path_item(item['next'], level + 1)
    if 'items' in item:
        for sub_item in item['items']:
            _print_path_item(sub_item, level + 1)


@cli.command()
@click.option('--year-month', '-m', help='年月 (YYYY-MM)，默认当月')
@click.option('--history-dir', default='./output/history', help='历史记录目录')
def summary(year_month, history_dir):
    """查看月度汇总"""
    
    if not year_month:
        year_month = datetime.now().strftime('%Y-%m')
    
    console.print(Panel(f"[bold blue]月度汇总 - {year_month}[/bold blue]"))
    
    try:
        query_engine = QueryEngine(history_dir)
        summary_data = query_engine.get_monthly_summary(year_month)
        
        console.print(f"[green]拨付总额:[/green] {summary_data['total_amount']:,.2f}")
        console.print(f"[green]拨付记录数:[/green] {summary_data['record_count']}")
        console.print(f"[green]涉及项目数:[/green] {summary_data['project_count']}")
        
        all_batches = query_engine.get_all_batches()
        console.print(f"\n[cyan]历史批次:[/cyan]")
        for batch in all_batches:
            console.print(f"  - {batch}")
        
    except Exception as e:
        console.print(f"[bold red]✗ 查询失败: {str(e)}[/bold red]")
        sys.exit(1)


if __name__ == '__main__':
    cli()
