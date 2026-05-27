"""CLI 入口"""
import sys
import traceback
from pathlib import Path
from typing import List, Optional
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .loader import DataLoader, DataLoadError
from .processor import SettlementEngine
from .exporter import ReportExporter

console = Console()


def _print_summary(reports):
    """打印结算汇总"""
    if not reports:
        console.print("[yellow]无结算数据[/yellow]")
        return
    
    table = Table(title="结算汇总", show_header=True, header_style="bold cyan")
    table.add_column("周期")
    table.add_column("主播数", justify="right")
    table.add_column("打赏总额", justify="right")
    table.add_column("退款总额", justify="right")
    table.add_column("个税总额", justify="right")
    table.add_column("实发总额", justify="right")
    table.add_column("警告", justify="right")
    table.add_column("错误", justify="right")
    
    for report in reports:
        table.add_row(
            report.settlement_period,
            str(report.total_streamers),
            f"{report.total_rewards:,.2f}",
            f"{report.total_refunds:,.2f}",
            f"{report.total_tax:,.2f}",
            f"{report.total_streamer_net:,.2f}",
            str(len(report.warnings)),
            str(len(report.errors)),
        )
    
    console.print(table)


def _print_warnings(reports):
    """打印警告信息"""
    all_warnings = []
    for report in reports:
        for w in report.warnings:
            all_warnings.append(f"[{report.settlement_period}] {w}")
    
    if all_warnings:
        console.print()
        warn_text = Text("\n".join(all_warnings))
        console.print(Panel(warn_text, title=f"⚠️  警告 ({len(all_warnings)}条)", border_style="yellow"))


def _print_errors(reports, load_errors=None):
    """打印错误信息"""
    all_errors = []
    
    if load_errors:
        for e in load_errors:
            all_errors.append(str(e))
    
    for report in reports:
        for e in report.errors:
            all_errors.append(f"[{report.settlement_period}] {e}")
    
    if all_errors:
        console.print()
        err_text = Text("\n".join(all_errors))
        console.print(Panel(err_text, title=f"❌ 错误 ({len(all_errors)}条)", border_style="red"))


@click.group()
@click.version_option()
def cli():
    """直播打赏税费归集 CLI
    
    处理主播打赏收入、平台分成、退款和个税预扣
    """
    pass


@cli.command()
@click.option('--input', '-i', 'input_dir', required=True,
              type=click.Path(exists=True, file_okay=False, dir_okay=True),
              help='输入数据目录')
@click.option('--output', '-o', 'output_dir', required=True,
              type=click.Path(file_okay=False, dir_okay=True),
              help='输出报告目录')
@click.option('--period', '-p', 'periods', multiple=True,
              help='指定结算周期（可多次指定），不指定则处理所有周期')
@click.option('--format', '-f', 'formats', multiple=True,
              type=click.Choice(['csv', 'excel', 'json']),
              default=['csv', 'excel'],
              help='导出格式（可多选）')
@click.option('--strict/--no-strict', default=False,
              help='严格模式：有错误时不导出报告')
def run(input_dir, output_dir, periods, formats, strict):
    """运行结算流程
    
    加载数据 -> 流水归集 -> 税费试算 -> 退款回滚 -> 导出报告
    """
    console.print("[bold cyan]=== 直播打赏税费归集 ===[/bold cyan]")
    console.print(f"输入目录: {input_dir}")
    console.print(f"输出目录: {output_dir}")
    if periods:
        console.print(f"指定周期: {', '.join(periods)}")
    console.print()
    
    try:
        with console.status("[bold green]加载数据中...") as status:
            loader = DataLoader(input_dir)
            data = loader.load_all()
            
            load_errors = data.get('errors', [])
            load_warnings = data.get('warnings', [])
            
            if load_errors:
                console.print(f"[red]数据加载错误: {len(load_errors)}条[/red]")
                if strict:
                    for e in load_errors:
                        console.print(f"  {e}")
                    console.print("[red]严格模式下有错误，终止执行[/red]")
                    sys.exit(1)
            
            if load_warnings:
                console.print(f"[yellow]数据加载警告: {len(load_warnings)}条[/yellow]")
                for w in load_warnings:
                    console.print(f"  {w}")
        
        console.print(f"[green]✓ 加载完成[/green]")
        console.print(f"  主播: {len(data['streamers'])}人")
        console.print(f"  打赏流水: {len(data['rewards'])}条")
        console.print(f"  分成版本: {len(data['platform_shares'])}个")
        console.print(f"  退款记录: {len(data['refunds'])}条")
        console.print(f"  税率规则: {len(data['tax_rules'])}条")
        
        with console.status("[bold green]处理结算中...") as status:
            engine = SettlementEngine(
                streamers=data['streamers'],
                rewards=data['rewards'],
                share_versions=data['platform_shares'],
                refunds=data['refunds'],
                tax_rules=data['tax_rules'],
            )
            
            if periods:
                reports = [engine.process_period(p) for p in periods]
            else:
                reports = engine.process_all_periods()
        
        console.print(f"[green]✓ 结算处理完成[/green]")
        console.print()
        
        _print_summary(reports)
        _print_warnings(reports)
        _print_errors(reports, load_errors)
        
        has_errors = len(load_errors) > 0 or any(r.errors for r in reports)
        if has_errors and strict:
            console.print("\n[red]严格模式下有错误，不导出报告[/red]")
            sys.exit(1)
        
        with console.status("[bold green]导出报告中...") as status:
            exporter = ReportExporter(output_dir)
            exported = exporter.export_all(reports, formats=list(formats))
        
        console.print()
        console.print(f"[green]✓ 报告已导出[/green]")
        output_path = Path(output_dir).resolve()
        for fmt, files in exported.items():
            console.print(f"  {fmt.upper()}: {len(files)}个文件")
            for f in files:
                f_abs = f.resolve()
                try:
                    rel_path = f_abs.relative_to(output_path)
                except ValueError:
                    rel_path = f
                console.print(f"    - {rel_path}")
        
        console.print()
        if any(r.warnings for r in reports) or load_warnings:
            console.print("[yellow]⚠️  存在警告，请人工复核[/yellow]")
        if has_errors:
            console.print("[yellow]⚠️  存在错误，部分数据可能未正确处理[/yellow]")
        console.print("[bold cyan]=== 处理完成 ===[/bold cyan]")
        
    except DataLoadError as e:
        console.print(f"[red]数据加载失败: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]执行失败: {e}[/red]")
        console.print(Panel(traceback.format_exc(), title="错误详情", border_style="red"))
        sys.exit(1)


@cli.command()
@click.option('--input', '-i', 'input_dir', required=True,
              type=click.Path(exists=True, file_okay=False, dir_okay=True),
              help='输入数据目录')
def validate(input_dir):
    """验证输入数据格式
    
    检查数据文件是否存在、格式是否正确
    """
    console.print("[bold cyan]=== 数据验证 ===[/bold cyan]")
    console.print(f"输入目录: {input_dir}")
    console.print()
    
    try:
        loader = DataLoader(input_dir)
        
        for file_type, filenames in loader.REQUIRED_FILES.items():
            found = loader._find_file(file_type)
            if found:
                console.print(f"[green]✓ {file_type}: {found.name}[/green]")
            else:
                if file_type == 'refunds':
                    console.print(f"[yellow]○ {file_type}: 可选文件，未找到[/yellow]")
                else:
                    console.print(f"[red]✗ {file_type}: 未找到 (需要: {', '.join(filenames)})[/red]")
        
        console.print()
        with console.status("[bold green]加载验证中...") as status:
            data = loader.load_all()
        
        console.print(f"[green]✓ 加载完成[/green]")
        
        if data['errors']:
            console.print(f"\n[red]发现 {len(data['errors'])} 个错误:[/red]")
            for e in data['errors']:
                console.print(f"  {e}")
        
        if data['warnings']:
            console.print(f"\n[yellow]发现 {len(data['warnings'])} 个警告:[/yellow]")
            for w in data['warnings']:
                console.print(f"  {w}")
        
        if not data['errors'] and not data['warnings']:
            console.print("\n[green]✓ 数据验证通过，无错误和警告[/green]")
        elif not data['errors']:
            console.print("\n[yellow]△ 数据有警告但无错误，可继续执行[/yellow]")
        
    except DataLoadError as e:
        console.print(f"[red]验证失败: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]执行失败: {e}[/red]")
        console.print(Panel(traceback.format_exc(), title="错误详情", border_style="red"))
        sys.exit(1)


@cli.command()
def template():
    """生成示例数据模板
    
    在当前目录创建示例数据文件，方便快速上手
    """
    import csv
    from decimal import Decimal
    from datetime import datetime, date
    
    template_dir = Path.cwd() / "sample_data"
    template_dir.mkdir(exist_ok=True)
    
    console.print(f"[bold cyan]=== 生成示例数据 ===[/bold cyan]")
    console.print(f"输出目录: {template_dir}")
    console.print()
    
    with open(template_dir / "streamers.csv", 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['streamer_id', 'name', 'id_card', 'bank_account', 'contract_start', 'contract_end', 'tax_type', 'status'])
        writer.writerow(['S001', '张三', '110101199001011234', '6222021234567890', '2024-01-01', '', 'individual', 'active'])
        writer.writerow(['S002', '李四', '110101199002025678', '6222028765432100', '2024-01-01', '', 'individual', 'active'])
    
    with open(template_dir / "rewards.csv", 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['reward_id', 'streamer_id', 'reward_time', 'amount', 'gift_name', 'sender_id', 'room_id', 'settlement_period', 'is_refunded', 'refund_id'])
        writer.writerow(['R001', 'S001', '2025-05-01 20:30:00', '1000.00', '火箭', 'U001', 'ROOM001', '202505', 'false', ''])
        writer.writerow(['R002', 'S001', '2025-05-02 21:00:00', '500.00', '飞机', 'U002', 'ROOM001', '202505', 'false', ''])
        writer.writerow(['R003', 'S002', '2025-05-03 19:00:00', '2000.00', '超级火箭', 'U003', 'ROOM002', '202505', 'false', ''])
    
    with open(template_dir / "platform_shares.csv", 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['version_id', 'version_name', 'effective_date', 'expire_date', 'platform_ratio', 'streamer_ratio', 'guild_ratio', 'description'])
        writer.writerow(['V1', '2025年分成方案', '2025-01-01', '', '0.50', '0.45', '0.05', '平台50%，主播45%，公会5%'])
    
    with open(template_dir / "refunds.csv", 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['refund_id', 'reward_id', 'streamer_id', 'refund_time', 'refund_amount', 'reason', 'original_settlement_period', 'refund_processed_period', 'is_cross_period'])
        writer.writerow(['REF001', 'R001', 'S001', '2025-05-15 10:00:00', '100.00', '用户投诉', '202505', '202505', 'false'])
    
    with open(template_dir / "tax_rules.csv", 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['rule_id', 'tax_type', 'income_min', 'income_max', 'tax_rate', 'quick_deduction', 'effective_date', 'expire_date', 'description'])
        writer.writerow(['TAX001', 'individual', '0', '4000', '0.20', '0', '2024-01-01', '', '劳务报酬20%税率'])
        writer.writerow(['TAX002', 'individual', '4000', '20000', '0.20', '0', '2024-01-01', '', '劳务报酬20%税率(减20%费用)'])
        writer.writerow(['TAX003', 'individual', '20000', '50000', '0.30', '2000', '2024-01-01', '', '劳务报酬30%税率'])
        writer.writerow(['TAX004', 'individual', '50000', '', '0.40', '7000', '2024-01-01', '', '劳务报酬40%税率'])
    
    console.print("[green]✓ 示例数据已生成[/green]")
    console.print()
    console.print("使用方法:")
    console.print(f"  lrt validate -i {template_dir}")
    console.print(f"  lrt run -i {template_dir} -o ./output")


if __name__ == '__main__':
    cli()
