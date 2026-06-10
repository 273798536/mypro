#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import click

from core import BatchManager, DataImporter, IonBalanceAnalyzer, ReportGenerator


def _get_sample_dir():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_data")


def _get_output_dir():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")


def _get_data_file():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "batch_data.json")


def _load_manager():
    mgr = BatchManager()
    data_file = _get_data_file()
    if os.path.exists(data_file):
        mgr.load(data_file)
    return mgr


def _save_manager(mgr):
    data_file = _get_data_file()
    mgr.save(data_file)


@click.group(help="电镀液离子平衡分析工具 - 谱图判读与批次追踪共用同一批处理记录")
def cli():
    pass


@cli.command("demo", help="一键运行完整演示：导入样例数据 → 分析 → 生成报告")
@click.option("--reset", is_flag=True, help="演示前重置所有数据")
def demo(reset):
    """使用样例数据运行完整流程演示"""
    click.echo("=" * 60)
    click.echo("  电镀液离子平衡分析 - 完整流程演示")
    click.echo("=" * 60)
    click.echo()
    
    sample_dir = _get_sample_dir()
    output_dir = _get_output_dir()
    
    if reset:
        data_file = _get_data_file()
        if os.path.exists(data_file):
            os.remove(data_file)
            click.echo("已重置历史数据")
            click.echo()
    
    batch_manager = _load_manager()
    importer = DataImporter(batch_manager)
    analyzer = IonBalanceAnalyzer()
    reporter = ReportGenerator(output_dir)
    
    if batch_manager.get_batch_count() > 0:
        click.echo(f"当前已有 {batch_manager.get_batch_count()} 个批次数据")
        click.echo()
    
    click.echo("【第1步】导入称量单...")
    weighing_file = os.path.join(sample_dir, "称量单.csv")
    batches = importer.import_weighing_sheet(weighing_file)
    for log in importer.get_import_log():
        click.echo(f"  {log}")
    click.echo()
    
    click.echo("【第2步】导入各批次谱图数据...")
    spectrum_files = [
        ("谱图_DY-20240610-01_镀铜液.csv", "DY-20240610-01"),
        ("谱图_DY-20240610-02_镍锌镀液.csv", "DY-20240610-02"),
        ("谱图_DY-20240610-03_装饰铬.csv", "DY-20240610-03"),
        ("谱图_DY-20240610-04_碱性镀锌.csv", "DY-20240610-04"),
    ]
    for filename, batch_no in spectrum_files:
        filepath = os.path.join(sample_dir, filename)
        importer.import_spectrum_data(filepath, batch_no)
        for log in importer.get_import_log():
            if "导入" in log and "个谱图" in log:
                click.echo(f"  {log}")
    click.echo()
    
    click.echo("【第3步】导入试剂台账...")
    reagent_file = os.path.join(sample_dir, "试剂台账.csv")
    importer.import_reagent_ledger(reagent_file)
    for log in importer.get_import_log():
        if "导入" in log and "条试剂" in log:
            click.echo(f"  {log}")
    click.echo()
    
    click.echo("【第4步】运行离子平衡分析...")
    latest_batches = batch_manager.get_all_latest()
    for batch in latest_batches:
        analyzer.analyze_batch(batch)
        status_cn = {"normal": "正常", "warning": "需关注", "abnormal": "异常", "pending": "待检测"}.get(batch.overall_status, batch.overall_status)
        abnormal_count = sum(1 for r in batch.analysis_results if r.status == "abnormal")
        ion_count = len(batch.analysis_results)
        click.echo(f"  批号 {batch.batch_no}: {status_cn}，检测到 {ion_count} 种离子，异常 {abnormal_count} 种")
    click.echo()
    
    _save_manager(batch_manager)
    
    click.echo("【第5步】生成异常批次详细报告...")
    report_count = 0
    for batch in latest_batches:
        if batch.overall_status in ["abnormal", "warning"]:
            report_path = reporter.generate_batch_report(batch)
            click.echo(f"  已生成: {os.path.basename(report_path)}")
            report_count += 1
    if report_count == 0:
        click.echo("  无异常批次，所有批次均正常")
    click.echo()
    
    click.echo("【第6步】生成汇总报告...")
    summary_path = reporter.generate_summary_report(latest_batches)
    click.echo(f"  已生成: {os.path.basename(summary_path)}")
    click.echo()
    
    click.echo("【演示：模拟重复导入同一批号（第二次复检）】")
    click.echo("  场景：对 DY-20240610-02 批次重新取样检测，导入新数据")
    click.echo()
    
    importer.import_weighing_sheet(weighing_file, batch_no="DY-20240610-02")
    for log in importer.get_import_log():
        if "DY-20240610-02" in log and "已存在" in log:
            click.echo(f"  {log}")
    
    spectrum_file2 = os.path.join(sample_dir, "谱图_DY-20240610-02_镍锌镀液.csv")
    importer.import_spectrum_data(spectrum_file2, "DY-20240610-02")
    
    batch_v2 = batch_manager.get_latest("DY-20240610-02")
    if batch_v2:
        analyzer.analyze_batch(batch_v2)
        _save_manager(batch_manager)
        
        versions = batch_manager.get_all_versions("DY-20240610-02")
        click.echo()
        click.echo(f"  该批号共有 {len(versions)} 个运行版本：")
        for i, v in enumerate(versions, 1):
            latest_tag = " ← 最新版本" if v.is_latest else ""
            status_cn = {"normal": "正常", "warning": "需关注", "abnormal": "异常"}.get(v.overall_status, v.overall_status)
            click.echo(f"    版本{i}: 运行ID={v.run_id} | {v.run_time} | {status_cn}{latest_tag}")
        
        click.echo()
        click.echo("  说明：同一批号多次导入时，自动创建新版本，不会出现两份互相矛盾的结论。")
        click.echo("        报告文件名包含运行ID，可区分不同次运行。")
        
        report_v2 = reporter.generate_batch_report(batch_v2)
        click.echo()
        click.echo(f"  已生成新版本报告: {os.path.basename(report_v2)}")
    click.echo()
    
    click.echo("【演示：异常追溯】")
    abnormal_batches = batch_manager.get_abnormal_batches()
    if abnormal_batches:
        batch = abnormal_batches[0]
        for result in batch.analysis_results:
            if result.status == "abnormal":
                trace = analyzer.get_abnormal_trace(batch, result.ion_name)
                if trace:
                    click.echo(f"  从异常离子「{result.ion_name}」往回查：")
                    click.echo(f"    1. 批号: {trace['batch_no']}，运行编号: {trace['run_id']}")
                    click.echo(f"    2. 检测浓度: {trace['concentration']} {trace['unit']}")
                    click.echo(f"    3. 异常原因: {trace['remark']}")
                    click.echo(f"    4. 对应谱图数据: {len(trace['spectrum_points'])} 个原始数据点")
                    click.echo(f"    5. 相关试剂记录: {len(trace['reagent_records'])} 条")
                    click.echo(f"    6. 处理意见: {trace['analysis_opinion'].split(chr(10))[0]}")
                    click.echo(f"    7. 数据来源文件: {trace['source_file']}")
                break
    click.echo()
    
    click.echo("=" * 60)
    click.echo(f"  演示完成！报告已输出到: {output_dir}")
    click.echo(f"  数据已保存到: {_get_data_file()}")
    click.echo("=" * 60)
    click.echo()
    click.echo("常用命令：")
    click.echo("  python3 main.py status             查看所有批次状态")
    click.echo("  python3 main.py status --abnormal   只看异常批次")
    click.echo("  python3 main.py trace --batch DY-20240610-02 --ion 锌离子(Zn²⁺)")
    click.echo("  python3 main.py report --batch DY-20240610-02")


@cli.command("import", help="导入数据文件（称量单/谱图/试剂台账）")
@click.option("--type", "data_type", required=True,
              type=click.Choice(["weighing", "spectrum", "reagent"]),
              help="数据类型: weighing(称量单), spectrum(谱图), reagent(试剂台账)")
@click.option("--file", "file_path", required=True, type=click.Path(exists=True),
              help="数据文件路径 (.csv 或 .xlsx)")
@click.option("--batch", "batch_no", default=None,
              help="指定批号（谱图和试剂台账文件不含批号列时使用）")
def import_data(data_type, file_path, batch_no):
    """导入数据文件"""
    batch_manager = _load_manager()
    importer = DataImporter(batch_manager)
    
    click.echo(f"正在导入 {data_type} 数据: {file_path}")
    
    if data_type == "weighing":
        batches = importer.import_weighing_sheet(file_path, batch_no)
        click.echo(f"成功处理 {len(batches)} 个批次")
    elif data_type == "spectrum":
        if not batch_no:
            click.echo("错误：导入谱图数据需指定 --batch 参数")
            return
        importer.import_spectrum_data(file_path, batch_no)
    elif data_type == "reagent":
        if not batch_no:
            importer.import_reagent_ledger(file_path)
        else:
            importer.import_reagent_ledger(file_path, batch_no)
    
    for log in importer.get_import_log():
        click.echo(f"  {log}")
    
    _save_manager(batch_manager)
    click.echo(f"数据已保存，当前共 {batch_manager.get_batch_count()} 个批次")


@cli.command("analyze", help="对已导入的批次运行离子平衡分析")
@click.option("--batch", "batch_no", default=None,
              help="指定批号分析，不指定则分析所有批次")
def analyze(batch_no):
    """运行离子平衡分析"""
    batch_manager = _load_manager()
    analyzer = IonBalanceAnalyzer()
    
    if batch_manager.get_batch_count() == 0:
        click.echo("暂无数据，请先导入数据")
        return
    
    if batch_no:
        batch = batch_manager.get_latest(batch_no)
        if not batch:
            click.echo(f"未找到批号: {batch_no}")
            return
        analyzer.analyze_batch(batch)
        status_cn = {"normal": "正常", "warning": "需关注", "abnormal": "异常", "pending": "待检测"}
        click.echo(f"完成分析: {batch_no} - {status_cn.get(batch.overall_status, batch.overall_status)}")
    else:
        batches = batch_manager.get_all_latest()
        for batch in batches:
            analyzer.analyze_batch(batch)
            status_cn = {"normal": "正常", "warning": "需关注", "abnormal": "异常", "pending": "待检测"}
            click.echo(f"完成分析: {batch.batch_no} - {status_cn.get(batch.overall_status, batch.overall_status)}")
    
    _save_manager(batch_manager)


@cli.command("report", help="生成Excel报告")
@click.option("--batch", "batch_no", default=None,
              help="指定批号生成单批次报告，不指定则生成汇总报告")
@click.option("--output", "output_dir", default=None,
              help="输出目录，默认为 ./output")
@click.option("--include-spectrum/--no-spectrum", default=True,
              help="是否包含原始谱图数据（默认包含）")
def report(batch_no, output_dir, include_spectrum):
    """生成报告"""
    if not output_dir:
        output_dir = _get_output_dir()
    
    batch_manager = _load_manager()
    reporter = ReportGenerator(output_dir)
    
    if batch_manager.get_batch_count() == 0:
        click.echo("暂无数据，请先导入数据")
        return
    
    if batch_no:
        batch = batch_manager.get_latest(batch_no)
        if not batch:
            click.echo(f"未找到批号: {batch_no}")
            return
        path = reporter.generate_batch_report(batch, include_spectrum=include_spectrum)
        click.echo(f"报告已生成: {path}")
    else:
        batches = batch_manager.get_all_latest()
        path = reporter.generate_summary_report(batches)
        click.echo(f"汇总报告已生成: {path}")


@cli.command("status", help="查看当前批次状态")
@click.option("--batch", "batch_no", default=None,
              help="查看指定批号的详细信息（含所有历史版本）")
@click.option("--abnormal-only", is_flag=True,
              help="只显示异常批次")
def status(batch_no, abnormal_only):
    """查看批次状态"""
    batch_manager = _load_manager()
    
    if batch_manager.get_batch_count() == 0:
        click.echo("暂无数据")
        click.echo()
        click.echo("可以运行 demo 命令快速体验：")
        click.echo("  python3 main.py demo")
        return
    
    if batch_no:
        versions = batch_manager.get_all_versions(batch_no)
        if not versions:
            click.echo(f"未找到批号: {batch_no}")
            return
        
        status_cn = {"normal": "正常", "warning": "需关注", "abnormal": "异常", "pending": "待检测"}
        status_icon = {"normal": "✅", "warning": "⚠️", "abnormal": "❌", "pending": "⏳"}
        
        click.echo(f"批号: {batch_no}")
        click.echo(f"共有 {len(versions)} 个运行版本")
        click.echo()
        
        for i, v in enumerate(versions, 1):
            latest_tag = " [最新版本]" if v.is_latest else ""
            sc = status_cn.get(v.overall_status, v.overall_status)
            si = status_icon.get(v.overall_status, "❓")
            click.echo(f"--- 版本 {i} {si} {sc}{latest_tag} ---")
            click.echo(f"  运行ID: {v.run_id}")
            click.echo(f"  运行时间: {v.run_time}")
            click.echo(f"  样品名称: {v.sample_name or '未填写'}")
            click.echo(f"  温度: {v.temperature} {v.temperature_unit}")
            click.echo(f"  pH: {v.ph_value}")
            click.echo(f"  操作员: {v.operator or '未填写'}")
            click.echo(f"  数据来源: {v.source_file or '未知'}")
            click.echo(f"  检测离子数: {len(v.analysis_results)}")
            if v.analysis_results:
                for r in v.analysis_results:
                    icon = "✅" if r.status == "normal" else "❌"
                    click.echo(f"    {icon} {r.ion_name}: {r.concentration} {r.unit}")
                    if r.remark:
                        click.echo(f"       {r.remark}")
            click.echo()
    else:
        batches = batch_manager.get_all_latest()
        if abnormal_only:
            batches = batch_manager.get_abnormal_batches()
        
        status_cn = {"normal": "正常", "warning": "需关注", "abnormal": "异常", "pending": "待检测"}
        status_icon = {"normal": "✅", "warning": "⚠️", "abnormal": "❌", "pending": "⏳"}
        
        if abnormal_only:
            click.echo(f"异常批次共 {len(batches)} 个：")
        else:
            click.echo(f"共 {len(batches)} 个批次：")
        click.echo()
        
        for batch in batches:
            sc = status_cn.get(batch.overall_status, batch.overall_status)
            si = status_icon.get(batch.overall_status, "❓")
            click.echo(f"  {si} {batch.batch_no} - {batch.sample_name or '未命名'} - {sc}")
            click.echo(f"     运行ID: {batch.run_id} | 时间: {batch.run_time}")
            if batch.analysis_results:
                abnormal = [r.ion_name for r in batch.analysis_results if r.status == "abnormal"]
                if abnormal:
                    click.echo(f"     异常离子: {', '.join(abnormal)}")
            click.echo()


@cli.command("trace", help="追溯异常原因：从异常离子往回查到谱图和处理意见")
@click.option("--batch", "batch_no", required=True, help="批号")
@click.option("--ion", "ion_name", required=True, help="离子名称（如：锌离子(Zn²⁺)）")
def trace(batch_no, ion_name):
    """追溯异常原因"""
    batch_manager = _load_manager()
    analyzer = IonBalanceAnalyzer()
    
    if batch_manager.get_batch_count() == 0:
        click.echo("暂无数据")
        return
    
    batch = batch_manager.get_latest(batch_no)
    if not batch:
        click.echo(f"未找到批号: {batch_no}")
        return
    
    trace_info = analyzer.get_abnormal_trace(batch, ion_name)
    if not trace_info:
        click.echo(f"未找到异常记录: {ion_name}")
        click.echo(f"该批次检测的离子有：{', '.join(r.ion_name for r in batch.analysis_results)}")
        return
    
    click.echo("=" * 55)
    click.echo("  异常追溯明细（顺着异常往回查）")
    click.echo("=" * 55)
    click.echo()
    
    click.echo("【第1步】异常结果")
    click.echo(f"  批号: {trace_info['batch_no']}")
    click.echo(f"  离子: {trace_info['ion_name']}")
    click.echo(f"  浓度: {trace_info['concentration']} {trace_info['unit']}")
    click.echo(f"  异常原因: {trace_info['remark']}")
    click.echo()
    
    click.echo("【第2步】谱图原始数据")
    click.echo(f"  特征峰附近共 {len(trace_info['spectrum_points'])} 个数据点：")
    for p in trace_info['spectrum_points'][:5]:
        click.echo(f"    波长 {p.wavelength} nm | 吸光度 {p.absorbance}")
    if len(trace_info['spectrum_points']) > 5:
        click.echo(f"    ... 共 {len(trace_info['spectrum_points'])} 个点，详见Excel报告")
    click.echo()
    
    click.echo("【第3步】计算依据")
    click.echo(f"  {trace_info['calculation_formula']}")
    click.echo(f"  检测温度: {trace_info['temperature']} {trace_info['temperature_unit']}")
    click.echo()
    
    click.echo("【第4步】相关试剂记录")
    if trace_info['reagent_records']:
        for r in trace_info['reagent_records']:
            click.echo(f"  • {r.reagent_name}")
            click.echo(f"    批号: {r.reagent_batch} | 用量: {r.volume_used} mL")
            if r.supplier:
                click.echo(f"    供应商: {r.supplier}")
    else:
        click.echo("  无相关试剂记录")
    click.echo()
    
    click.echo("【第5步】处理意见")
    click.echo(f"  {trace_info['analysis_opinion']}")
    click.echo()
    
    click.echo("【运行信息】")
    click.echo(f"  运行编号: {trace_info['run_id']}")
    click.echo(f"  运行时间: {trace_info['run_time']}")
    click.echo(f"  数据来源: {trace_info['source_file']}")
    click.echo()
    click.echo("详细数据可查看Excel报告中的「异常追溯明细」工作表。")


@cli.command("list-samples", help="列出可用的样例数据文件")
def list_samples():
    """列出样例数据"""
    sample_dir = _get_sample_dir()
    if not os.path.exists(sample_dir):
        click.echo("样例数据目录不存在")
        return
    
    files = os.listdir(sample_dir)
    click.echo(f"样例数据目录: {sample_dir}")
    click.echo()
    for f in sorted(files):
        fpath = os.path.join(sample_dir, f)
        size = os.path.getsize(fpath)
        click.echo(f"  {f} ({size} bytes)")


@cli.command("reset", help="清空所有已保存的批次数据")
@click.confirmation_option(prompt="确定要清空所有数据吗？此操作不可撤销")
def reset():
    """清空所有数据"""
    data_file = _get_data_file()
    if os.path.exists(data_file):
        os.remove(data_file)
        click.echo("已清空所有数据")
    else:
        click.echo("暂无数据")


if __name__ == "__main__":
    cli()
