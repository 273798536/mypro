"""命令行入口 - 整数规划批量验算系统"""

import sys
import click
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.ip_checker.pipeline import VerificationPipeline
from src.ip_checker.models import DataSource
from src.ip_checker.report_generator import ReportGenerator


@click.group()
def cli():
    """整数规划批量验算系统"""
    pass


@cli.command()
@click.option('--output', '-o', default='./examples', help='报告输出目录')
def demo(output):
    """运行完整演示 - 早会彩排专用"""
    click.echo("=" * 60)
    click.echo("整数规划批量验算系统 - 现场演示")
    click.echo("=" * 60)
    click.echo()

    pipeline = VerificationPipeline(output_dir=output)
    result_df, report_files = pipeline.run_full_demo()

    click.echo()
    click.echo("🎬 演示完成！")
    click.echo()
    click.echo("查看输出:")
    click.echo(f"  1. 执行摘要: {report_files.get('summary', 'N/A')}")
    click.echo(f"  2. 状态图表: {report_files.get('status_chart', 'N/A')}")
    click.echo(f"  3. 审计报告: {report_files.get('audit_report', 'N/A')}")
    click.echo(f"  4. 结果CSV:  {report_files.get('results_csv', 'N/A')}")
    click.echo()
    if report_files.get('anomaly_traces'):
        click.echo("异常记录追溯:")
        for trace in report_files['anomaly_traces'][:3]:
            click.echo(f"  - {trace}")
        if len(report_files['anomaly_traces']) > 3:
            click.echo(f"  ... 还有 {len(report_files['anomaly_traces']) - 3} 条")


@cli.command()
@click.argument('files', nargs=-1, required=True)
@click.option('--source', '-s', type=click.Choice(['A', 'B', 'C', 'SYS']), default='A',
              help='数据来源: A=复核人A, B=复核人B, C=手动录入, SYS=系统导出')
@click.option('--formulas', '-f', default='F001,F002,F004', help='公式ID列表，逗号分隔')
@click.option('--output', '-o', default='./examples', help='报告输出目录')
@click.option('--reviewer', '-r', default='小岑', help='复核人姓名')
def verify(files, source, formulas, output, reviewer):
    """批量验算指定文件"""
    source_map = {
        'A': DataSource.DRAFT_A,
        'B': DataSource.DRAFT_B,
        'C': DataSource.DRAFT_C,
        'SYS': DataSource.SYSTEM_EXPORT,
    }
    ds = source_map[source]
    formula_ids = formulas.split(',')

    click.echo(f"开始验算，数据源: {ds.value}")
    click.echo(f"公式: {formula_ids}")
    click.echo()

    pipeline = VerificationPipeline(output_dir=output)
    ctx_id = pipeline.create_context(
        reviewer=reviewer,
        description=f"CLI批量验算 - {len(files)}个文件",
        source_documents=list(files),
    )
    click.echo(f"上下文ID: {ctx_id}")

    all_dfs = []
    for file_path in files:
        click.echo(f"  加载 {file_path}...")
        mapped = pipeline.load_and_map_data(file_path, ds)
        all_dfs.append(mapped)
        click.echo(f"    记录数: {len(mapped)}")

    import pandas as pd
    combined = pd.concat(all_dfs, ignore_index=True)
    click.echo(f"总记录数: {len(combined)}")

    click.echo("执行验算...")
    result_df = pipeline.run_verification(combined, formula_ids)

    click.echo("生成报告...")
    report_files = pipeline.report_generator.generate_all_reports(
        result_df, pipeline.engine, pipeline.spec_manager, pipeline.audit_trail, ctx_id
    )
    pipeline.audit_trail.save_to_disk()

    summary = pipeline.engine.get_summary()
    click.echo()
    click.echo("【结果汇总】")
    for status, count in summary.items():
        click.echo(f"  {status}: {count}")

    click.echo()
    click.echo("输出文件:")
    for key, value in report_files.items():
        if isinstance(value, list):
            for v in value:
                click.echo(f"  - {v}")
        else:
            click.echo(f"  - {value}")


@cli.command()
@click.argument('record_id')
@click.option('--output', '-o', default='./examples', help='报告输出目录')
def trace(record_id, output):
    """查看指定记录的计算草稿追溯"""
    from src.ip_checker.calculation_spec import CalculationSpecManager
    from src.ip_checker.audit_trail import AuditTrail

    click.echo(f"查找记录: {record_id}")

    spec_manager = CalculationSpecManager()
    audit_trail = AuditTrail()
    audit_trail.load_from_disk()

    ctx_list = spec_manager._contexts
    if not ctx_list:
        ctx_id = list(ctx_list.keys())[0] if ctx_list else "unknown"
    else:
        ctx_id = list(ctx_list.keys())[0]

    reporter = ReportGenerator(output_dir=output)
    click.echo()
    click.echo(f"上下文ID: {ctx_id}")

    record_history = audit_trail.get_history_for_record(record_id)
    if record_history:
        click.echo()
        click.echo("【操作历史】")
        for entry in record_history:
            click.echo(f"  [{entry.timestamp}] {entry.operator}: {entry.action}")
            if entry.reason:
                click.echo(f"    原因: {entry.reason}")
    else:
        click.echo("无操作历史记录")


@cli.command()
def audit():
    """查看完整审计历史"""
    from src.ip_checker.audit_trail import AuditTrail

    audit = AuditTrail()
    audit.load_from_disk()

    report = audit.generate_change_report()
    click.echo(report)

    df = audit.get_full_history_dataframe()
    if not df.empty:
        click.echo()
        click.echo("【历史记录表格】")
        click.echo(df.to_string(index=False))


@cli.command()
def test():
    """运行测试套件"""
    import pytest
    import sys

    click.echo("运行测试套件...")
    click.echo()

    exit_code = pytest.main(['-v', './tests/test_core_features.py'])
    sys.exit(exit_code)


@cli.command()
def list_rules():
    """列出所有计算规则"""
    from src.ip_checker.calculation_spec import CalculationSpecManager

    sm = CalculationSpecManager()
    click.echo("【计算规则列表】")
    click.echo()
    for rule in sm.get_all_rules():
        click.echo(f"  {rule.formula_id} (v{rule.version}): {rule.description}")
        click.echo(f"    公式: {rule.formula_expression}")
        click.echo(f"    制定人: {rule.created_by}")
        click.echo(f"    创建时间: {rule.created_at}")
        click.echo()


@cli.command()
def list_units():
    """列出支持的单位"""
    from src.ip_checker.unit_system import UnitSystem

    us = UnitSystem()
    dimensions = ["length", "weight", "currency", "quantity", "rate"]
    dim_names = {"length": "长度", "weight": "重量", "currency": "货币", "quantity": "数量", "rate": "比率"}

    click.echo("【支持的单位】")
    for dim in dimensions:
        click.echo()
        click.echo(f"{dim_names[dim]}:")
        units = us.get_available_units(dim)
        shown = set()
        for name, unit in units.items():
            if unit.symbol not in shown:
                shown.add(unit.symbol)
                click.echo(f"  {unit.name} ({unit.symbol}): 1 {unit.symbol} = {unit.conversion_factor} {unit.base_unit}")


if __name__ == "__main__":
    cli()
