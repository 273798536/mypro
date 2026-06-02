"""傅里叶噪声清洗CLI - 主入口"""

import click
from rich.console import Console
from rich.table import Table
from pathlib import Path
import json
import yaml
from datetime import datetime

from .core import AudioProcessor
from .analyzer import SamplerateAnalyzer, AliasingAnalyzer
from .report import ReportGenerator
from .history import ParameterHistory

console = Console()


@click.group()
@click.version_option(version="0.1.0", prog_name="fnc")
@click.option("--verbose", "-v", is_flag=True, help="显示详细输出")
@click.pass_context
def main(ctx, verbose):
    """傅里叶噪声清洗CLI - 音频噪声清洗与分析工具"""
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose
    ctx.obj["history"] = ParameterHistory()


@main.command()
@click.argument("input_file", type=click.Path(exists=True, path_type=Path))
@click.option("--output", "-o", type=click.Path(path_type=Path), help="输出文件路径")
@click.option("--sample-rate", "-sr", type=int, default=None, help="指定采样率（不指定则自动检测）")
@click.option("--threshold", "-t", type=float, default=0.1, help="噪声阈值 (0.0-1.0)")
@click.option("--band-start", type=int, default=0, help="起始频段 (Hz)")
@click.option("--band-end", type=int, default=None, help="结束频段 (Hz)")
@click.option("--export-report", "-r", is_flag=True, help="导出分析报告")
@click.option("--export-params", "-p", is_flag=True, help="导出参数历史")
@click.pass_context
def clean(ctx, input_file, output, sample_rate, threshold, band_start, band_end, export_report, export_params):
    """清洗音频文件中的噪声"""
    verbose = ctx.obj["verbose"]
    history = ctx.obj["history"]
    
    console.print(f"[bold blue]开始处理:[/bold blue] {input_file}")
    
    processor = AudioProcessor(input_file, target_samplerate=sample_rate)
    
    if verbose:
        console.print(f"  原始采样率: {processor.original_samplerate} Hz")
        console.print(f"  当前采样率: {processor.samplerate} Hz")
        console.print(f"  音频时长: {processor.duration:.2f} 秒")
    
    sr_analyzer = SamplerateAnalyzer(processor)
    sr_issues = sr_analyzer.detect_issues()
    
    if sr_issues:
        console.print("[bold yellow]采样率异常检测:[/bold yellow]")
        for issue in sr_issues:
            console.print(f"  - {issue['type']}: {issue['description']} (来源: {issue['source']})")
    
    aliasing_analyzer = AliasingAnalyzer(processor)
    aliasing_issues = aliasing_analyzer.detect_aliasing()
    
    if aliasing_issues:
        console.print("[bold yellow]频段混叠检测:[/bold yellow]")
        for issue in aliasing_issues:
            console.print(f"  - {issue['type']}: {issue['description']}")
    
    params = {
        "threshold": threshold,
        "band_start": band_start,
        "band_end": band_end,
        "timestamp": datetime.now().isoformat()
    }
    
    result = processor.noise_reduction(
        threshold=threshold,
        band_start=band_start,
        band_end=band_end
    )
    
    history.add_record(input_file.name, params, result["issues"])
    
    if result["over_filtered"]:
        console.print("[bold red]警告: 检测到过度滤波[/bold red]")
        console.print(f"  影响: {result['filter_impact']}")
        console.print("  建议: 降低阈值或调整频段范围")
    
    if output is None:
        output = input_file.parent / f"{input_file.stem}_cleaned{input_file.suffix}"
    
    processor.save_audio(output, result["cleaned_audio"])
    console.print(f"[bold green]已保存清洗后音频:[/bold green] {output}")
    
    if export_report:
        report_gen = ReportGenerator(processor)
        report_path = input_file.parent / f"{input_file.stem}_report.md"
        report_gen.export_markdown(report_path, sr_issues, aliasing_issues, result)
        console.print(f"[bold green]已导出报告:[/bold green] {report_path}")
    
    if export_params:
        params_path = input_file.parent / f"{input_file.stem}_params.json"
        history.export_json(params_path)
        console.print(f"[bold green]已导出参数历史:[/bold green] {params_path}")
    
    _show_summary_table(sr_issues, aliasing_issues, result)


@main.command()
@click.argument("input_file", type=click.Path(exists=True, path_type=Path))
@click.option("--sample-rate", "-sr", type=int, default=None, help="指定采样率")
@click.option("--export", "-e", type=click.Path(path_type=Path), help="导出分析结果")
@click.pass_context
def analyze(ctx, input_file, sample_rate, export):
    """仅分析音频，不执行清洗"""
    verbose = ctx.obj["verbose"]
    
    console.print(f"[bold blue]分析音频:[/bold blue] {input_file}")
    
    processor = AudioProcessor(input_file, target_samplerate=sample_rate)
    
    if verbose:
        console.print(f"  采样率: {processor.samplerate} Hz")
        console.print(f"  时长: {processor.duration:.2f} 秒")
        console.print(f"  声道数: {processor.channels}")
    
    sr_analyzer = SamplerateAnalyzer(processor)
    sr_issues = sr_analyzer.detect_issues()
    
    aliasing_analyzer = AliasingAnalyzer(processor)
    aliasing_issues = aliasing_analyzer.detect_aliasing()
    
    _show_analysis_detail(sr_issues, aliasing_issues, processor)
    
    if export:
        report_gen = ReportGenerator(processor)
        report_gen.export_json(export, sr_issues, aliasing_issues)
        console.print(f"[bold green]已导出分析结果:[/bold green] {export}")


@main.command()
@click.argument("input_file", type=click.Path(exists=True, path_type=Path))
@click.option("--output", "-o", type=click.Path(path_type=Path), required=True, help="输出目录")
@click.option("--threshold-min", type=float, default=0.05, help="最小阈值")
@click.option("--threshold-max", type=float, default=0.3, help="最大阈值")
@click.option("--steps", type=int, default=5, help="预览步数")
@click.pass_context
def preview(ctx, input_file, output, threshold_min, threshold_max, steps):
    """生成多参数预览效果"""
    history = ctx.obj["history"]
    
    console.print(f"[bold blue]生成预览:[/bold blue] {input_file}")
    output.mkdir(parents=True, exist_ok=True)
    
    processor = AudioProcessor(input_file)
    
    import numpy as np
    thresholds = np.linspace(threshold_min, threshold_max, steps)
    
    for i, thresh in enumerate(thresholds):
        result = processor.noise_reduction(threshold=thresh)
        out_file = output / f"preview_{i:02d}_t{thresh:.3f}.wav"
        processor.save_audio(out_file, result["cleaned_audio"])
        
        params = {"threshold": thresh, "preview_index": i}
        history.add_record(f"preview_{i:02d}", params, result["issues"])
        
        console.print(f"  阈值 {thresh:.3f}: {out_file.name}")
    
    history_file = output / "preview_params.json"
    history.export_json(history_file)
    console.print(f"[bold green]预览参数历史已保存:[/bold green] {history_file}")


@main.command()
@click.option("--output", "-o", type=click.Path(path_type=Path), default=Path("./samples"))
def generate_samples(output):
    """生成测试样例音频"""
    from .samples import create_test_samples
    
    console.print(f"[bold blue]生成测试样例到:[/bold blue] {output}")
    output.mkdir(parents=True, exist_ok=True)
    
    sample_info = create_test_samples(output)
    
    console.print("[bold green]样例生成完成:[/bold green]")
    for info in sample_info:
        console.print(f"  - {info['name']}: {info['description']}")


@main.command()
def list_bands():
    """列出常用频段标注"""
    bands = [
        ("Sub-bass", "20-60 Hz", "低音炮区域"),
        ("Bass", "60-250 Hz", "低音区域"),
        ("Low Midrange", "250-500 Hz", "中低音"),
        ("Midrange", "500-2000 Hz", "中音区域"),
        ("Upper Midrange", "2000-4000 Hz", "中高音"),
        ("Presence", "4000-6000 Hz", "临场感"),
        ("Brilliance", "6000-20000 Hz", "高音区域"),
    ]
    
    table = Table(title="常用频段标注")
    table.add_column("频段名称")
    table.add_column("频率范围")
    table.add_column("说明")
    
    for name, freq, desc in bands:
        table.add_row(name, freq, desc)
    
    console.print(table)


def _show_summary_table(sr_issues, aliasing_issues, result):
    """显示摘要表格"""
    table = Table(title="清洗报告摘要")
    table.add_column("类别")
    table.add_column("数量")
    table.add_column("详情")
    
    table.add_row(
        "采样率异常",
        str(len(sr_issues)),
        ", ".join([i["type"] for i in sr_issues]) if sr_issues else "无"
    )
    table.add_row(
        "频段混叠",
        str(len(aliasing_issues)),
        ", ".join([i["type"] for i in aliasing_issues]) if aliasing_issues else "无"
    )
    table.add_row(
        "过度滤波",
        "是" if result["over_filtered"] else "否",
        result["filter_impact"] if result["over_filtered"] else "正常"
    )
    
    console.print(table)


def _show_analysis_detail(sr_issues, aliasing_issues, processor):
    """显示详细分析"""
    if not sr_issues and not aliasing_issues:
        console.print("[bold green]未检测到异常[/bold green]")
        return
    
    if sr_issues:
        table = Table(title="采样率异常详情")
        table.add_column("异常类型")
        table.add_column("时间位置")
        table.add_column("来源材料")
        table.add_column("描述")
        
        for issue in sr_issues:
            table.add_row(
                issue["type"],
                f"{issue.get('time_position', 'N/A')}",
                issue.get("source", "未知"),
                issue["description"]
            )
        console.print(table)
    
    if aliasing_issues:
        table = Table(title="频段混叠详情")
        table.add_column("异常类型")
        table.add_column("频率范围")
        table.add_column("严重程度")
        table.add_column("描述")
        
        for issue in aliasing_issues:
            table.add_row(
                issue["type"],
                f"{issue.get('freq_start', 0)}-{issue.get('freq_end', 0)} Hz",
                issue.get("severity", "medium"),
                issue["description"]
            )
        console.print(table)


if __name__ == "__main__":
    main()
