import os
import sys
from collections import defaultdict
from pathlib import Path
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .data_io import DataReader, ResultWriter
from .calculator import SkuProcessor
from .models import CalculationSummary, WarningType


console = Console()


def print_banner():
    banner = Text()
    banner.append("╔══════════════════════════════════════════════════════════════╗\n", style="bold blue")
    banner.append("║                库存安全水位优化 CLI 工具                      ║\n", style="bold blue")
    banner.append("║          Safety Stock Optimization Command Line Tool        ║\n", style="bold blue")
    banner.append("╚══════════════════════════════════════════════════════════════╝\n", style="bold blue")
    console.print(banner)


def print_summary(summary: CalculationSummary):
    panel = Panel.fit(
        f"[bold]处理摘要[/bold]\n\n"
        f"总 SKU 数:     {summary.total_skus}\n"
        f"成功计算:     [green]{summary.successful_calculations}[/green]\n"
        f"失败数量:     [red]{summary.failed_calculations}[/red]\n"
        f"输出目录:     [cyan]{summary.output_directory}[/cyan]\n"
        f"计算时间:     {summary.timestamp}",
        title="计算完成",
        border_style="green"
    )
    console.print(panel)
    
    if summary.warnings_count:
        warning_table = Table(title="警告统计", show_header=True, header_style="bold yellow")
        warning_table.add_column("警告类型", style="cyan")
        warning_table.add_column("数量", style="magenta", justify="right")
        for wtype, count in summary.warnings_count.items():
            warning_table.add_row(wtype, str(count))
        console.print(warning_table)


def print_errors(errors):
    if not errors:
        return
    
    error_table = Table(title="数据错误", show_header=True, header_style="bold red")
    error_table.add_column("SKU", style="cyan")
    error_table.add_column("错误类型", style="magenta")
    error_table.add_column("错误信息", style="red")
    error_table.add_column("来源", style="yellow")
    
    for e in errors[:10]:
        source = f"{e.source_file or 'unknown'}:{e.source_line or '?'}"
        error_table.add_row(
            e.sku_id or "N/A",
            e.error_type,
            e.error_message[:50] + "..." if len(e.error_message) > 50 else e.error_message,
            source
        )
    
    console.print(error_table)
    
    if len(errors) > 10:
        console.print(f"[yellow]... 还有 {len(errors) - 10} 个错误，请查看 errors.csv[/yellow]")


@click.group()
@click.version_option(version="0.1.0", prog_name="safety-stock")
def main():
    """库存安全水位优化 CLI 工具 - 基于销量波动的智能安全库存计算"""
    pass


@main.command()
@click.option('--input-dir', '-i', required=True, type=click.Path(exists=True, file_okay=False),
              help='输入数据目录，包含各数据源 CSV 文件')
@click.option('--output-dir', '-o', required=True, type=click.Path(file_okay=False),
              help='输出结果目录，每次运行会创建带时间戳的子目录')
@click.option('--default-service-level', '-s', type=float, default=0.95,
              help='默认服务水平 (0.5-0.9999)，默认 0.95')
@click.option('--verbose', '-v', is_flag=True, help='显示详细输出')
def calculate(input_dir, output_dir, default_service_level, verbose):
    """计算安全库存并生成补货建议"""
    print_banner()
    
    input_path = Path(input_dir)
    console.print(f"[cyan]读取输入目录:[/cyan] {input_path}")
    
    reader = DataReader(input_dir)
    all_errors = []
    
    with console.status("[bold green]读取数据..."):
        sales_records, sales_errors = reader.read_sales()
        all_errors.extend(sales_errors)
        console.print(f"  [green]✓[/green] 销量数据: {len(sales_records)} 条记录")
        
        cycle_records, cycle_errors = reader.read_replenishment_cycles()
        all_errors.extend(cycle_errors)
        console.print(f"  [green]✓[/green] 补货周期: {len(cycle_records)} 条配置")
        
        sl_records, sl_errors = reader.read_service_levels()
        all_errors.extend(sl_errors)
        console.print(f"  [green]✓[/green] 服务水平: {len(sl_records)} 条配置")
        
        stockout_records, stockout_errors = reader.read_stockouts()
        all_errors.extend(stockout_errors)
        console.print(f"  [green]✓[/green] 缺货记录: {len(stockout_records)} 条记录")
        
        capacity_records, capacity_errors = reader.read_warehouse_capacities()
        all_errors.extend(capacity_errors)
        console.print(f"  [green]✓[/green] 仓库容量: {len(capacity_records)} 条配置")
        
        suggestion_records, suggestion_errors = reader.read_manual_suggestions()
        all_errors.extend(suggestion_errors)
        console.print(f"  [green]✓[/green] 人工建议: {len(suggestion_records)} 条记录")
    
    if all_errors:
        console.print(f"[yellow]⚠ 数据读取阶段发现 {len(all_errors)} 个错误[/yellow]")
        if verbose:
            print_errors(all_errors)
    
    sku_ids = set()
    for r in sales_records:
        sku_ids.add(r.sku_id)
    for r in cycle_records:
        sku_ids.add(r.sku_id)
    for r in sl_records:
        sku_ids.add(r.sku_id)
    for r in capacity_records:
        sku_ids.add(r.sku_id)
    for r in suggestion_records:
        sku_ids.add(r.sku_id)
    
    if not sku_ids:
        console.print("[red]错误: 未找到任何 SKU 数据[/red]")
        sys.exit(1)
    
    console.print(f"\n[cyan]开始处理 {len(sku_ids)} 个 SKU...[/cyan]")
    
    cycle_map = {r.sku_id: r for r in cycle_records}
    sl_map = {r.sku_id: r for r in sl_records}
    capacity_map = {r.sku_id: r for r in capacity_records}
    suggestion_map = {r.sku_id: r for r in suggestion_records}
    
    results = []
    warnings_count = defaultdict(int)
    
    with console.status("[bold green]计算安全库存..."):
        for sku_id in sorted(sku_ids):
            processor = SkuProcessor(sku_id)
            processor.add_sales(sales_records)
            
            if sku_id in cycle_map:
                processor.set_replenishment_cycle(cycle_map[sku_id])
            if sku_id in sl_map:
                processor.set_service_level(sl_map[sku_id])
            if sku_id in capacity_map:
                processor.set_warehouse_capacity(capacity_map[sku_id])
            if sku_id in suggestion_map:
                processor.set_manual_suggestion(suggestion_map[sku_id])
            
            processor.add_stockout_records(stockout_records)
            
            result = processor.process(default_service_level=default_service_level)
            if result:
                results.append(result)
                for w in result.warnings:
                    warnings_count[w.get('type', 'unknown')] += 1
    
    failed_count = len(sku_ids) - len(results)
    
    with console.status("[bold green]写入结果..."):
        writer = ResultWriter(output_dir, create_timestamp_dir=True)
        
        summary = CalculationSummary(
            total_skus=len(sku_ids),
            successful_calculations=len(results),
            failed_calculations=failed_count,
            warnings_count=dict(warnings_count),
            output_directory=str(writer.output_dir)
        )
        
        output_files = writer.write_results(results, all_errors, summary)
        suggestions_file = writer.write_replenishment_suggestions(results)
        output_files['suggestions'] = suggestions_file
    
    print_summary(summary)
    
    console.print("\n[cyan]生成的文件:[/cyan]")
    for name, path in output_files.items():
        console.print(f"  [green]✓[/green] {name}: {path}")
    
    if failed_count > 0:
        console.print(f"\n[yellow]⚠ 有 {failed_count} 个 SKU 计算失败，请检查错误日志[/yellow]")
    
    console.print("\n[bold green]计算完成！[/bold green]")


@main.command()
@click.argument('input_dir', type=click.Path(exists=True, file_okay=False))
def validate(input_dir):
    """验证输入数据格式是否正确"""
    print_banner()
    
    reader = DataReader(input_dir)
    all_errors = []
    
    console.print(f"[cyan]验证输入目录:[/cyan] {input_dir}")
    
    required_files = ['sales.csv']
    optional_files = ['replenishment_cycles.csv', 'service_levels.csv', 
                      'stockouts.csv', 'warehouse_capacities.csv', 'manual_suggestions.csv']
    
    input_path = Path(input_dir)
    
    for f in required_files:
        if not (input_path / f).exists():
            console.print(f"[red]✗ 缺少必需文件: {f}[/red]")
            sys.exit(1)
        else:
            console.print(f"[green]✓ 必需文件: {f}[/green]")
    
    for f in optional_files:
        if (input_path / f).exists():
            console.print(f"[green]✓ 可选文件: {f}[/green]")
        else:
            console.print(f"[yellow]○ 可选文件: {f} (未提供)[/yellow]")
    
    console.print("\n[cyan]读取并验证数据...[/cyan]")
    
    with console.status("[bold green]验证数据..."):
        sales_records, sales_errors = reader.read_sales()
        all_errors.extend(sales_errors)
        console.print(f"  销量数据: {len(sales_records)} 条有效记录, {len(sales_errors)} 个错误")
        
        cycle_records, cycle_errors = reader.read_replenishment_cycles()
        all_errors.extend(cycle_errors)
        
        sl_records, sl_errors = reader.read_service_levels()
        all_errors.extend(sl_errors)
        
        stockout_records, stockout_errors = reader.read_stockouts()
        all_errors.extend(stockout_errors)
        
        capacity_records, capacity_errors = reader.read_warehouse_capacities()
        all_errors.extend(capacity_errors)
        
        suggestion_records, suggestion_errors = reader.read_manual_suggestions()
        all_errors.extend(suggestion_errors)
    
    sku_ids = set(r.sku_id for r in sales_records)
    console.print(f"\n[cyan]发现 {len(sku_ids)} 个唯一 SKU[/cyan]")
    
    if all_errors:
        console.print(f"\n[red]发现 {len(all_errors)} 个数据错误:[/red]")
        print_errors(all_errors)
        sys.exit(1)
    else:
        console.print("\n[bold green]✓ 数据验证通过！[/bold green]")


@main.command()
def template():
    """显示输入数据文件模板说明"""
    print_banner()
    
    templates = {
        'sales.csv (必需)': [
            'sku_id,date,quantity',
            'SKU001,2024-01-01,15.5',
            'SKU001,2024-01-02,18.0',
            'SKU002,2024-01-01,25.0'
        ],
        'replenishment_cycles.csv (可选)': [
            'sku_id,lead_time_days,review_period_days',
            'SKU001,7,7',
            'SKU002,14,3'
        ],
        'service_levels.csv (可选)': [
            'sku_id,service_level',
            'SKU001,0.95',
            'SKU002,0.99'
        ],
        'warehouse_capacities.csv (可选)': [
            'sku_id,max_capacity,current_capacity',
            'SKU001,500,100',
            'SKU002,1000,200'
        ],
        'manual_suggestions.csv (可选)': [
            'sku_id,suggested_safety_stock,note',
            'SKU001,100,促销期间手动调整',
            'SKU002,,仅备注'
        ],
        'stockouts.csv (可选)': [
            'sku_id,date,duration_hours,estimated_lost_sales',
            'SKU001,2024-01-15,8,20',
            'SKU002,2024-02-20,4,15'
        ]
    }
    
    for filename, lines in templates.items():
        console.print(f"\n[bold cyan]{filename}[/bold cyan]")
        for line in lines:
            console.print(f"  {line}")
    
    console.print("\n[yellow]提示: 可选文件不提供时使用默认值[/yellow]")


if __name__ == '__main__':
    main()
