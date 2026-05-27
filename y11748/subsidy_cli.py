#!/usr/bin/env python3
import click
from datetime import datetime
from pathlib import Path
from subsidy.data_reader import DataReader
from subsidy.processor import SubsidyProcessor
from subsidy.exporter import ResultExporter


def parse_date(date_str: str):
    for fmt in ['%Y-%m-%d', '%Y%m%d', '%Y/%m/%d']:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise click.BadParameter(f"无法解析日期: {date_str}")


@click.group()
def cli():
    """新能源补贴里程处理工具 - 网约车新能源补贴申报数据校验与计算"""
    pass


@cli.command()
@click.option('--data-dir', '-d', default='sample_data', help='数据文件目录')
@click.option('--start', '-s', help='统计开始日期 (YYYY-MM-DD)')
@click.option('--end', '-e', help='统计结束日期 (YYYY-MM-DD)')
@click.option('--output', '-o', default='output', help='输出目录')
@click.option('--sample', is_flag=True, help='使用样例数据并显示详细处理过程')
def process(data_dir, start, end, output, sample):
    """处理新能源补贴里程数据"""
    
    if sample:
        data_dir = 'sample_data'
        if not Path(data_dir).exists():
            click.echo("生成样例数据...")
            _generate_sample_data(data_dir)
    
    if not start or not end:
        start = '2026-04-01'
        end = '2026-04-03'
    
    start_date = parse_date(start)
    end_date = parse_date(end)
    
    click.echo(f"\n{'='*60}")
    click.echo("  新能源补贴里程处理工具")
    click.echo(f"{'='*60}")
    click.echo(f"统计周期: {start_date} 至 {end_date}")
    click.echo(f"数据目录: {data_dir}")
    click.echo(f"{'='*60}\n")
    
    data = DataReader.read_sample_data(data_dir)
    
    click.echo(f"[读取完成] 车辆档案: {len(data['vehicles'])} 条")
    click.echo(f"[读取完成] 里程记录: {len(data['mileage'])} 条")
    click.echo(f"[读取完成] 充电记录: {len(data['charging'])} 条")
    click.echo(f"[读取完成] 营运日历: {len(data['calendar'])} 条")
    click.echo(f"[读取完成] 补贴规则: {len(data['rules'])} 条\n")
    
    processor = SubsidyProcessor(
        vehicles=data['vehicles'],
        mileage_records=data['mileage'],
        charging_records=data['charging'],
        calendar_records=data['calendar'],
        rules=data['rules'],
        period_start=start_date,
        period_end=end_date
    )
    
    click.echo("[处理中] 开始校验和计算...\n")
    results = processor.process_all()
    
    for r in results:
        _display_vehicle_result(r, show_details=sample)
    
    exporter = ResultExporter(output_dir=output)
    exported = exporter.export_all(results)
    exporter.export_declaration_report(results)
    
    click.echo(f"\n{'='*60}")
    click.echo("  导出完成")
    click.echo(f"{'='*60}")
    for name, filepath in exported.items():
        click.echo(f"  {name}: {filepath}")
    click.echo(f"{'='*60}\n")


def _display_vehicle_result(result, show_details=False):
    vehicle = result.vehicle_id
    has_errors = any(a.severity == "error" for a in result.all_anomalies)
    
    status_icon = "✗" if has_errors else "✓"
    status_color = "red" if has_errors else "green"
    
    click.echo(click.style(f"  {status_icon} 车辆 {vehicle}", fg=status_color, bold=True))
    click.echo(f"     ├─ 总里程: {result.total_mileage:.1f} km | 有效里程: {result.valid_mileage:.1f} km")
    click.echo(f"     ├─ 充电量: {result.total_charged_kwh:.1f} kWh | 营运天数: {result.operating_days} 天")
    click.echo(f"     ├─ 有效天数: {result.valid_days} 天 | 预估补贴: ¥{result.estimated_subsidy:.2f}")
    click.echo(f"     └─ 异常: {len(result.all_anomalies)} 个 | 修正: {len(result.all_corrections)} 次")
    
    if show_details and result.all_anomalies:
        click.echo("\n     【异常明细】")
        for a in result.all_anomalies:
            severity_color = "red" if a.severity == "error" else "yellow" if a.severity == "warning" else "cyan"
            click.echo(click.style(f"       • [{a.date}] {a.description}", fg=severity_color))
        
        if result.all_corrections:
            click.echo("\n     【修正痕迹】")
            for c in result.all_corrections:
                click.echo(f"       • [{c.date}] {c.reason} ({c.original_value} → {c.corrected_value})")
        
        click.echo("")


def _generate_sample_data(data_dir):
    Path(data_dir).mkdir(exist_ok=True)
    
    vehicles_csv = """vehicle_id,plate_number,vehicle_type,battery_capacity,join_date,exit_date
VH001,粤A12345,比亚迪E6,70,2024-01-15,
VH002,粤B67890,广汽AION,60,2024-03-20,
VH003,粤C11111,特斯拉Model3,75,2024-05-10,"""
    
    mileage_csv = """vehicle_id,record_date,start_mileage,end_mileage
VH001,2026-04-01,100500,100850
VH001,2026-04-02,100850,101200
VH001,2026-04-03,101200,101580
VH002,2026-04-01,85200,85550
VH002,2026-04-02,85600,85400
VH002,2026-04-03,85550,85900
VH003,2026-04-01,50300,50400
VH003,2026-04-02,50400,50450
VH003,2026-04-03,50450,50480"""
    
    charging_csv = """vehicle_id,charge_date,start_time,end_time,charged_kwh,start_soc,end_soc
VH001,2026-04-01,2026-04-01 18:30:00,2026-04-01 20:15:00,52.5,20,95
VH001,2026-04-02,2026-04-02 19:00:00,2026-04-02 21:00:00,48.0,25,98
VH001,2026-04-03,2026-04-03 17:45:00,2026-04-03 19:30:00,55.0,18,96
VH002,2026-04-01,2026-04-01 20:00:00,2026-04-01 22:00:00,45.0,22,97
VH002,2026-04-03,2026-04-03 21:00:00,2026-04-03 23:00:00,42.0,30,95
VH003,2026-04-01,2026-04-01 14:00:00,2026-04-01 15:00:00,15.0,70,90"""
    
    calendar_csv = """vehicle_id,operation_date,is_operating,online_hours
VH001,2026-04-01,1,11.5
VH001,2026-04-02,1,10.0
VH001,2026-04-03,1,12.0
VH002,2026-04-01,1,9.5
VH002,2026-04-02,0,0
VH002,2026-04-03,1,10.5
VH003,2026-04-01,0,0
VH003,2026-04-02,1,0.5
VH003,2026-04-03,1,0.3"""
    
    rules_csv = """rule_id,effective_date,expiry_date,min_daily_mileage,min_monthly_days,subsidy_per_km,max_monthly_subsidy,min_charge_ratio
RULE_2026,2026-01-01,2026-12-31,200,22,0.80,5000,0.8"""
    
    with open(Path(data_dir) / 'vehicles.csv', 'w', encoding='utf-8') as f:
        f.write(vehicles_csv)
    with open(Path(data_dir) / 'mileage.csv', 'w', encoding='utf-8') as f:
        f.write(mileage_csv)
    with open(Path(data_dir) / 'charging.csv', 'w', encoding='utf-8') as f:
        f.write(charging_csv)
    with open(Path(data_dir) / 'calendar.csv', 'w', encoding='utf-8') as f:
        f.write(calendar_csv)
    with open(Path(data_dir) / 'rules.csv', 'w', encoding='utf-8') as f:
        f.write(rules_csv)


@cli.command()
@click.argument('data_dir', default='sample_data')
def init_sample(data_dir):
    """创建样例数据文件"""
    _generate_sample_data(data_dir)
    click.echo(f"样例数据已创建在: {data_dir}/")
    click.echo("\n样例说明:")
    click.echo("  VH001 - 正常数据: 里程连续、充电充足、营运正常")
    click.echo("  VH002 - 边界数据: 含里程倒挂、充电缺口、停运日误计")
    click.echo("  VH003 - 异常数据: 里程过低、营运状态异常")


if __name__ == '__main__':
    cli()
