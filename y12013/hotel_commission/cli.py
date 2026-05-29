import click
import os
from datetime import datetime
from .importer import DataImporter
from .calculator import CommissionCalculator
from .analyzer import ChannelAnalyzer
from .exporter import ResultExporter


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """酒店渠道佣金复核工具 - 导入、检查、修正提示、导出"""
    pass


@cli.command()
@click.option('--orders', '-o', required=True, help='订单流水CSV文件路径')
@click.option('--contracts', '-c', required=True, help='渠道合同CSV文件路径')
@click.option('--rates', '-r', required=True, help='房价日历CSV文件路径')
@click.option('--output-dir', '-d', default='./output', help='输出目录')
def run(orders, contracts, rates, output_dir):
    """运行完整佣金复核流程"""
    
    click.echo("\n" + "=" * 60)
    click.echo("酒店渠道佣金复核工具")
    click.echo("=" * 60 + "\n")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        click.echo(f"✓ 创建输出目录: {output_dir}")
    
    click.echo("\n[1/5] 导入数据...")
    importer = DataImporter()
    
    order_records, order_issues = importer.import_orders(orders)
    click.echo(f"  ✓ 订单流水: {len(order_records)} 条, {len(order_issues)} 个问题")
    
    contract_records, contract_issues = importer.import_contracts(contracts)
    click.echo(f"  ✓ 渠道合同: {len(contract_records)} 条, {len(contract_issues)} 个问题")
    
    rate_records, rate_issues = importer.import_rates(rates)
    click.echo(f"  ✓ 房价日历: {len(rate_records)} 条, {len(rate_issues)} 个问题")
    
    all_issues = order_issues + contract_issues + rate_issues
    
    errors = [i for i in all_issues if i.severity == 'error']
    if errors:
        click.echo("\n✗ 发现致命错误，终止处理:")
        for err in errors:
            click.echo(f"  - [{err.source_file}] {err.message}")
        return
    
    click.echo("\n[2/5] 计算佣金...")
    calculator = CommissionCalculator(order_records, contract_records, rate_records)
    results, calc_issues = calculator.calculate_all()
    click.echo(f"  ✓ 完成 {len(results)} 条佣金计算")
    
    all_issues.extend(calc_issues)
    
    click.echo("\n[3/5] 分析差异...")
    analyzer = ChannelAnalyzer(results)
    anomalies = analyzer.detect_anomalies()
    
    issue_orders = len(anomalies.get('has_issues', []))
    diff_orders = len(anomalies.get('commission_difference', []))
    click.echo(f"  ✓ 发现 {issue_orders} 条问题订单, {diff_orders} 条佣金差异")
    
    click.echo("\n[4/5] 导出结果...")
    exporter = ResultExporter(results, all_issues)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    result_file = os.path.join(output_dir, f'commission_results_{timestamp}.csv')
    exporter.export_to_csv(result_file)
    click.echo(f"  ✓ 佣金明细: {result_file}")
    
    issues_file = os.path.join(output_dir, f'validation_issues_{timestamp}.csv')
    exporter.export_issues_to_csv(issues_file)
    click.echo(f"  ✓ 问题清单: {issues_file}")
    
    channel_summary = calculator.get_channel_summary(results)
    summary_file = os.path.join(output_dir, f'channel_summary_{timestamp}.csv')
    exporter.export_summary(summary_file, channel_summary)
    click.echo(f"  ✓ 渠道汇总: {summary_file}")
    
    report_file = os.path.join(output_dir, f'analysis_report_{timestamp}.txt')
    analysis_report = analyzer.generate_analysis_report()
    exporter.export_report(report_file, analysis_report)
    click.echo(f"  ✓ 分析报告: {report_file}")
    
    click.echo("\n" + "=" * 60)
    click.echo("复核完成！以下是重点提示：")
    click.echo("-" * 60)
    
    if 'half_day_issues' in anomalies and anomalies['half_day_issues']:
        click.echo(f"\n⚠️  半日房问题 ({len(anomalies['half_day_issues'])} 条):")
        for r in anomalies['half_day_issues'][:3]:
            click.echo(f"  - 订单{r.order_id}: {r.issues[0]}")
    
    if 'cross_night_refund' in anomalies and anomalies['cross_night_refund']:
        click.echo(f"\n⚠️  跨夜退款 ({len(anomalies['cross_night_refund'])} 条):")
        for r in anomalies['cross_night_refund'][:3]:
            click.echo(f"  - 订单{r.order_id}: 涉及材料 {', '.join(r.source_materials)}")
    
    click.echo("\n详细内容请查看导出文件。")
    click.echo("=" * 60 + "\n")


@cli.command()
@click.option('--orders', '-o', required=True, help='订单流水CSV文件路径')
def check_orders(orders):
    """仅检查订单流水格式"""
    click.echo("\n检查订单流水格式...")
    importer = DataImporter()
    records, issues = importer.import_orders(orders)
    
    click.echo(f"成功导入: {len(records)} 条")
    if issues:
        click.echo(f"发现问题: {len(issues)} 个")
        for issue in issues:
            click.echo(f"  [{issue.severity}] {issue.message}")


@cli.command()
def template():
    """显示CSV模板说明"""
    click.echo("\n" + "=" * 60)
    click.echo("CSV模板说明")
    click.echo("=" * 60)
    
    click.echo("\n【1. 订单流水 (order_records.csv)】")
    click.echo("  必要列: order_id, channel, checkin_date, checkout_date, total_amount")
    click.echo("  可选列: channel_type, guest_name, room_nights, order_type, room_rate,")
    click.echo("          refund_amount, refund_date, notes")
    click.echo("  order_type可选值: full_day(全日房), half_day(半日房), hour_room(钟点房)")
    click.echo("  channel_type可选值: ota(OTA), groupon(团购), member_direct(会员直销)")
    
    click.echo("\n【2. 渠道合同 (channel_contracts.csv)】")
    click.echo("  必要列: channel, commission_rate")
    click.echo("  可选列: channel_type, half_day_commission_rate, weekend_surcharge,")
    click.echo("          holiday_surcharge, effective_from, effective_to, notes")
    click.echo("  注意: 佣金率用小数表示(如15%填0.15)")
    
    click.echo("\n【3. 房价日历 (rate_calendar.csv)】")
    click.echo("  必要列: rate_date, base_rate")
    click.echo("  可选列: is_weekend, is_holiday, holiday_name")
    click.echo("  说明: 用于判断节假日改价后的佣金计算")
    
    click.echo("\n半日房复现方法:")
    click.echo("  1. 订单order_type设为'half_day'")
    click.echo("  2. room_nights设为0.5")
    click.echo("  3. 合同中配置half_day_commission_rate")
    
    click.echo("\n跨夜退款复现方法:")
    click.echo("  1. refund_date在checkin_date和checkout_date之间")
    click.echo("  2. refund_amount大于0")
    
    click.echo("\n" + "=" * 60 + "\n")


def main():
    cli()


if __name__ == '__main__':
    main()
