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
@click.option('--show-steps/--no-steps', default=True, help='是否显示计算步骤')
def trace(record_id, output, show_steps):
    """查看指定记录的计算草稿追溯 - 点击异常记录后看这里"""
    from src.ip_checker.audit_trail import AuditTrail
    from src.ip_checker.verification_engine import VerificationEngine
    from src.ip_checker.unit_system import UnitSystem
    from src.ip_checker.calculation_spec import CalculationSpecManager

    click.echo()
    click.echo("=" * 70)
    click.echo(f"整数规划批量验算 - 计算草稿追溯")
    click.echo("=" * 70)
    click.echo()
    click.echo(f"记录ID: {record_id}")

    output_path = Path(output)

    trace_file = None
    if output_path.exists():
        details_dir = output_path / 'details'
        if details_dir.exists():
            candidate = details_dir / f"{record_id}_trace.txt"
            if candidate.exists():
                trace_file = candidate

    results_json = output_path / 'verification_results.json'
    engine_result = None
    context_trace = None
    context_id = None

    if results_json.exists():
        try:
            import json as _json
            with open(results_json, 'r', encoding='utf-8') as f:
                saved = _json.load(f)
            context_id = saved.get('context_id')
            context_trace = saved.get('context_trace')
            for r_data in saved.get('results', []):
                if r_data.get('record_id') == record_id:
                    engine_result = r_data
                    break
        except Exception:
            pass

    if trace_file:
        click.echo(f"追溯文件: {trace_file}")
        click.echo()
        click.echo("=" * 70)
        with open(trace_file, 'r', encoding='utf-8') as f:
            content = f.read()
        click.echo(content)
    else:
        click.echo()
        click.echo(f"⚠️  未找到追溯文件: {output_path / 'details' / (record_id + '_trace.txt')}")
        click.echo()
        click.echo("可能原因:")
        click.echo("  1. 尚未运行 demo 或 verify 命令，请先执行: python cli.py demo")
        click.echo("  2. 该 record_id 不存在")
        click.echo()

        if engine_result:
            click.echo("=" * 70)
            click.echo("从已保存的验算结果中重建追溯信息:")
            click.echo("=" * 70)
            _print_reconstructed_trace(engine_result, context_trace)

    click.echo()
    click.echo("=" * 70)
    click.echo("【该记录的操作历史（审计日志）】")
    click.echo("=" * 70)
    audit_trail = AuditTrail(str(output_path.parent / 'data' / 'audit_log.json'))
    try:
        audit_trail.load_from_disk()
    except Exception:
        pass

    record_history = audit_trail.get_history_for_record(record_id)
    if record_history:
        for i, entry in enumerate(record_history, 1):
            click.echo()
            click.echo(f"  {i}. [{entry.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] "
                       f"{entry.operator}: {entry.action}")
            if entry.old_value is not None and entry.new_value is not None:
                click.echo(f"     变更: {entry.old_value} → {entry.new_value}")
            if entry.reason:
                click.echo(f"     原因: {entry.reason}")
    else:
        click.echo("  （无针对该记录的操作历史）")
        all_entries = audit_trail._entries if hasattr(audit_trail, '_entries') else []
        if all_entries:
            click.echo()
            click.echo(f"  系统共有 {len(all_entries)} 条全局审计记录")
            click.echo("  可通过 python cli.py audit 查看全部")

    click.echo()
    click.echo("=" * 70)
    click.echo("【下一步操作】")
    click.echo("=" * 70)
    click.echo("  - 查看所有异常记录列表: python cli.py anomalies")
    click.echo("  - 查看全部审计历史:     python cli.py audit")
    click.echo("  - 重新运行完整演示:     python cli.py demo")
    click.echo()


def _print_reconstructed_trace(result_data, context_trace):
    """从保存的结果数据重建追溯输出"""
    import click
    click.echo()
    click.echo(f"记录ID: {result_data.get('record_id')}")
    click.echo(f"验算状态: 【{result_data.get('result_status')}】")
    anomaly = result_data.get('anomaly_type')
    error = result_data.get('error_message')
    if anomaly:
        click.echo(f"⚠️  异常类型: {anomaly}")
    if error:
        click.echo(f"❌ 错误信息: {error}")
    click.echo("-" * 70)

    if context_trace:
        click.echo("【本次计算口径】")
        click.echo(f"  计算时间: {context_trace.get('calculation_date')}")
        click.echo(f"  复核人: {context_trace.get('reviewer')}")
        click.echo(f"  说明: {context_trace.get('description')}")
        click.echo(f"  假设条件: {context_trace.get('assumptions')}")
        docs = context_trace.get('source_documents', [])
        click.echo(f"  来源文档: {', '.join(docs) if docs else 'N/A'}")
        click.echo()

        rules = context_trace.get('applied_rules', [])
        if rules:
            click.echo("【应用的计算规则】")
            for rule in rules:
                click.echo(f"  - {rule.get('formula_id')} (v{rule.get('version')}): {rule.get('description')}")
                click.echo(f"    制定人: {rule.get('created_by')}")
            click.echo()

    raw_inputs = result_data.get('raw_inputs', {})
    if raw_inputs:
        click.echo("【原始输入】")
        for k, v in raw_inputs.items():
            if not str(k).endswith("_converted"):
                click.echo(f"  {k} = {v}")
        click.echo()

    steps = result_data.get('processing_steps', [])
    if steps:
        click.echo("【计算步骤追溯】")
        for step in steps:
            status = step.get('status', '')
            marker = ""
            if status == '异常':
                marker = " ❌"
            elif status == '失败':
                marker = " ⚠️"
            elif status == '警告':
                marker = " ⚡"
            elif status == '通过':
                marker = " ✅"

            click.echo(f"  步骤{step.get('step')}{marker}: {step.get('action')}")
            click.echo(f"         详情: {step.get('detail')}")
            click.echo(f"         状态: {status}")
            click.echo()

    unit_convs = result_data.get('unit_conversions', [])
    if unit_convs:
        click.echo("【单位转换记录】")
        for uc in unit_convs:
            click.echo(f"  字段: {uc.get('field')}")
            click.echo(f"    {uc.get('original_value')} {uc.get('from_unit')} "
                       f"→ {uc.get('converted_value'):.4f} {uc.get('to_unit')}")
            click.echo(f"    换算系数: ×{uc.get('to_base_factor')} ÷{uc.get('from_base_factor')}")
        click.echo()

    click.echo("【验算结果】")
    click.echo(f"  计算值: {result_data.get('calculated_value')}")
    click.echo(f"  期望值: {result_data.get('expected_value')}")
    calc = result_data.get('calculated_value')
    exp = result_data.get('expected_value')
    tol = result_data.get('tolerance')
    if calc is not None and exp is not None and exp not in (0, None):
        diff = abs(float(calc) - float(exp))
        rel_diff = diff / abs(float(exp)) if float(exp) != 0 else float('inf')
        click.echo(f"  绝对偏差: {diff:.6f}")
        click.echo(f"  相对偏差: {rel_diff:.4%}")
    if tol is not None:
        click.echo(f"  容差设置: {float(tol):.0%}")
    ts = result_data.get('timestamp')
    if ts:
        click.echo(f"  记录时间: {ts}")
    click.echo("=" * 70)


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
@click.option('--output', '-o', default='./examples', help='报告输出目录')
@click.option('--limit', '-l', default=20, help='显示异常记录的最大数量')
def anomalies(output, limit):
    """列出所有异常记录 - 点到异常时先看这里"""
    import json as _json
    from pathlib import Path

    click.echo()
    click.echo("=" * 70)
    click.echo("整数规划批量验算 - 异常记录列表")
    click.echo("=" * 70)
    click.echo()

    output_path = Path(output)
    results_json = output_path / 'verification_results.json'

    results_csv = None
    for f in output_path.glob("verification_results_*.csv"):
        results_csv = f
        break

    anomalies_list = []

    if results_json.exists():
        try:
            with open(results_json, 'r', encoding='utf-8') as f:
                saved = _json.load(f)
            for r_data in saved.get('results', []):
                if r_data.get('anomaly_type') or r_data.get('result_status') in ('异常', '失败'):
                    anomalies_list.append(r_data)
        except Exception:
            pass

    if not anomalies_list and results_csv and results_csv.exists():
        try:
            import pandas as pd
            df = pd.read_csv(results_csv)
            anomaly_cols = [c for c in df.columns if c.endswith('_anomaly')]
            status_col = '_overall_status'
            for _, row in df.iterrows():
                if status_col in df.columns and row[status_col] in ('异常', '失败'):
                    anomaly_types = [row[c] for c in anomaly_cols
                                     if pd.notna(row[c]) and str(row[c]).strip()]
                    rec_id_col = [c for c in df.columns if c.endswith('_record_id')]
                    rid = row[rec_id_col[0]] if rec_id_col else f"row_{_}"
                    anomalies_list.append({
                        'record_id': rid,
                        'result_status': row[status_col] if status_col in df.columns else '未知',
                        'anomaly_type': "、".join(anomaly_types) if anomaly_types else row.get(status_col, '未知'),
                        'raw_inputs': {},
                        'error_message': None,
                    })
        except Exception:
            pass

    if not anomalies_list:
        click.echo("未找到异常记录。可能原因：")
        click.echo("  1. 尚未运行 demo 或 verify 命令，请先执行: python cli.py demo")
        click.echo("  2. 所有记录都通过了验算（恭喜！）")
        click.echo()
        return

    click.echo(f"共发现 {len(anomalies_list)} 条异常记录（最多显示前 {limit} 条）:")
    click.echo()

    for i, a in enumerate(anomalies_list[:limit], 1):
        rid = a.get('record_id', '未知')
        status = a.get('result_status', '未知')
        atype = a.get('anomaly_type') or status
        err = a.get('error_message')

        marker = "🔴" if status == '异常' else "⚠️"
        click.echo(f"{marker}  [{i}] 记录ID: {rid}")
        click.echo(f"    状态: 【{status}】  异常类型: {atype}")
        if err:
            click.echo(f"    错误: {err}")

        raw = a.get('raw_inputs', {})
        if raw:
            brief_parts = []
            for k, v in raw.items():
                if not str(k).endswith('_converted') and v is not None and str(v).strip():
                    brief_parts.append(f"{k}={v}")
            if brief_parts:
                click.echo(f"    原始输入: {' | '.join(brief_parts[:5])}")

        click.echo(f"    👉 查看追溯: python cli.py trace {rid}")
        click.echo()

    total = len(anomalies_list)
    if total > limit:
        click.echo(f"... 还有 {total - limit} 条异常记录未显示")
    click.echo()
    click.echo("=" * 70)
    click.echo(f"💡 操作提示: 对任意异常记录执行 python cli.py trace <记录ID>")
    click.echo("   可查看完整的计算草稿、计算口径、单位转换、步骤追溯")
    click.echo("=" * 70)
    click.echo()


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
