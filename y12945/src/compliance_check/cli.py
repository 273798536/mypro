from __future__ import annotations

import os
import sys
import json
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from . import __version__
from .core import ComplianceCheckEngine
from .desensitization import DesensitizationChecker, get_default_rules
from .gray_comparison import compare_results
from .distribution import (
    analyze_distribution,
    severity_summary,
    build_full_report,
    needs_review_findings,
)
from .playback import get_playback_for_result, playback_summary
from .feedback import (
    categorize_for_training,
    build_review_round_summary,
    mark_truncated_for_review,
    confirm_all_high_severity,
)
from .models import DataSource, FeedbackStatus, Severity

console = Console()


@click.group()
@click.version_option(version=__version__, prog_name="compliance-check")
def cli():
    """合规日志脱敏检查工具 - 支持灰度对比、分布统计、评测回放"""
    pass


@cli.command()
@click.argument("input_path", type=click.Path(exists=True))
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="输出结果文件路径 (JSON格式)",
)
@click.option(
    "--format", "-f",
    type=click.Choice(["json", "csv"]),
    default="json",
    help="输出格式",
)
@click.option(
    "--prompt-version",
    help="提示词版本号，便于追溯",
)
@click.option(
    "--sample-batch",
    help="训练样本批次号",
)
@click.option(
    "--rollback-from",
    help="回滚来源版本",
)
@click.option(
    "--source-note",
    help="来源备注，便于追溯",
)
@click.option(
    "--image-name",
    help="关联图片/文件名",
)
@click.option(
    "--data-source",
    type=click.Choice([s.value for s in DataSource]),
    default="production_log",
    help="数据来源类型",
)
@click.option(
    "--review-round",
    help="复核轮次编号",
)
@click.option(
    "--no-truncate",
    is_flag=True,
    help="不截断长文本",
)
@click.option(
    "--max-length",
    type=int,
    default=500,
    help="长文本截断阈值 (字符数)",
)
@click.option(
    "--quiet", "-q",
    is_flag=True,
    help="静默模式，只输出结果文件",
)
def check(
    input_path,
    output,
    format,
    prompt_version,
    sample_batch,
    rollback_from,
    source_note,
    image_name,
    data_source,
    review_round,
    no_truncate,
    max_length,
    quiet,
):
    """执行合规日志脱敏检查"""
    engine = ComplianceCheckEngine()

    input_path_obj = Path(input_path)
    file_paths = []

    if input_path_obj.is_file():
        file_paths = [str(input_path_obj)]
    elif input_path_obj.is_dir():
        for f in sorted(input_path_obj.iterdir()):
            if f.is_file() and f.suffix.lower() in (".log", ".txt", ".csv"):
                file_paths.append(str(f))
    else:
        click.echo(f"错误: 输入路径不存在: {input_path}", err=True)
        sys.exit(1)

    if not file_paths:
        click.echo("错误: 未找到可处理的文件", err=True)
        sys.exit(1)

    if not quiet:
        console.print(f"[bold]开始合规检查[/bold]")
        console.print(f"输入路径: {input_path}")
        console.print(f"文件数量: {len(file_paths)}")
        if prompt_version:
            console.print(f"提示词版本: {prompt_version}")
        if sample_batch:
            console.print(f"样本批次: {sample_batch}")
        if review_round:
            console.print(f"复核轮次: {review_round}")
        console.print()

    result = engine.check_files(
        file_paths=file_paths,
        prompt_version=prompt_version,
        sample_batch=sample_batch,
        rollback_from=rollback_from,
        source_note=source_note,
        image_name=image_name,
        data_source=DataSource(data_source),
        review_round=review_round,
        truncate_long_text=not no_truncate,
        max_text_length=max_length,
    )

    if not quiet:
        _print_result_summary(result)

    if output:
        ComplianceCheckEngine.save_result(result, output, format)
        if not quiet:
            console.print(f"\n[green]结果已保存到: {output}[/green]")
    elif not quiet:
        console.print("\n[yellow]提示: 使用 --output 参数保存结果文件[/yellow]")

    return result


@cli.command()
@click.argument("base_result", type=click.Path(exists=True))
@click.argument("target_result", type=click.Path(exists=True))
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="输出对比结果文件",
)
@click.option(
    "--match-mode",
    type=click.Choice(["content", "content_line", "strict"]),
    default="content",
    help="匹配模式: content(按内容,默认,适合灰度) / content_line(内容+行号) / strict(严格)",
)
@click.option(
    "--no-normalize-source",
    is_flag=True,
    help="strict 模式下不归一化源文件路径 (默认取 basename)",
)
@click.option(
    "--no-unchanged",
    is_flag=True,
    help="不在差异表里显示 unchanged 记录",
)
@click.option(
    "--show-all",
    is_flag=True,
    help="显示所有差异项 (不受默认条数限制)",
)
def compare(base_result, target_result, output, match_mode, no_normalize_source, no_unchanged, show_all):
    """灰度对比：识别同一业务记录在版本间的延续或变化"""
    engine = ComplianceCheckEngine()

    try:
        base = engine.load_result(base_result)
        target = engine.load_result(target_result)
    except Exception as e:
        console.print(f"[red]加载结果文件失败: {e}[/red]")
        sys.exit(1)

    try:
        comparison = compare_results(
            base,
            target,
            match_mode=match_mode,
            normalize_source=not no_normalize_source,
            include_unchanged=not no_unchanged,
        )
    except ValueError as e:
        console.print(f"[red]灰度对比参数错误: {e}[/red]")
        sys.exit(1)

    _print_comparison_summary(comparison)

    display_diffs = comparison.diffs
    if no_unchanged:
        display_diffs = [d for d in display_diffs if d.status != "unchanged"]

    if display_diffs:
        _print_diff_table(display_diffs, show_all=show_all)

    if output:
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        data = comparison.model_dump(mode="json")
        with open(output, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        console.print(f"\n[green]对比结果已保存到: {output}[/green]")

    return comparison


@cli.command(name="stats")
@click.argument("result_file", type=click.Path(exists=True))
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="输出统计报告文件",
)
@click.option(
    "--report", "-r",
    is_flag=True,
    help="输出完整报告",
)
def stats_command(result_file, output, report):
    """分布统计：查看检查结果的分布情况"""
    engine = ComplianceCheckEngine()
    result = engine.load_result(result_file)

    if report:
        full_report = build_full_report(result)
        _print_full_report(full_report)
    else:
        _print_distribution(result)

    if output:
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        if report:
            data = build_full_report(result)
        else:
            dist = analyze_distribution(result.findings)
            data = [d.model_dump(mode="json") for d in dist]
        with open(output, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        console.print(f"\n[green]统计报告已保存到: {output}[/green]")


@cli.command()
@click.argument("result_file", type=click.Path(exists=True))
@click.option(
    "--finding-id",
    help="指定单个 finding 进行回放",
)
@click.option(
    "--context",
    type=int,
    default=3,
    help="上下文行数",
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="输出回放记录文件",
)
def playback(result_file, finding_id, context, output):
    """评测回放：追溯到原始日志内容"""
    engine = ComplianceCheckEngine()
    result = engine.load_result(result_file)

    if finding_id:
        finding = next(
            (f for f in result.findings if f.finding_id == finding_id),
            None,
        )
        if not finding:
            click.echo(f"错误: 未找到 finding_id: {finding_id}", err=True)
            sys.exit(1)
        from .playback import get_playback_for_finding

        record = get_playback_for_finding(finding, context)
        if record:
            _print_playback_record(record, context)
        records = [record] if record else []
    else:
        records = get_playback_for_result(result, context)
        summary = playback_summary(records)
        console.print(f"回放记录数: {summary['total_playback_records']}")
        console.print(f"带来源备注: {summary['records_with_source_note']}")
        console.print(f"带图片名: {summary['records_with_image']}")

    if output and records:
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        data = [r.model_dump(mode="json") for r in records if r]
        with open(output, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        console.print(f"\n[green]回放记录已保存到: {output}[/green]")


@cli.command()
@click.argument("result_file", type=click.Path(exists=True))
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="输出带反馈的结果文件",
)
@click.option(
    "--status",
    type=click.Choice([s.value for s in FeedbackStatus]),
    help="要设置的反馈状态",
)
@click.option(
    "--finding-ids",
    help="逗号分隔的 finding_id 列表",
)
@click.option(
    "--comment",
    help="反馈备注",
)
@click.option(
    "--reviewer",
    help="复核人",
)
@click.option(
    "--mark-truncated",
    is_flag=True,
    help="标记所有截断项为待复核",
)
@click.option(
    "--confirm-high",
    is_flag=True,
    help="自动确认所有高危项",
)
@click.option(
    "--categorize",
    is_flag=True,
    help="按训练组视角分类展示",
)
def feedback(
    result_file,
    output,
    status,
    finding_ids,
    comment,
    reviewer,
    mark_truncated,
    confirm_high,
    categorize,
):
    """人工反馈：管理检查结果的复核状态"""
    engine = ComplianceCheckEngine()
    result = engine.load_result(result_file)

    if mark_truncated:
        result = mark_truncated_for_review(result, reviewer)
        console.print("[green]已将所有截断项标记为待复核[/green]")

    if confirm_high:
        result = confirm_all_high_severity(result, reviewer)
        console.print("[green]已自动确认所有高危项[/green]")

    if status and finding_ids:
        from .feedback import batch_update_feedback

        ids = [fid.strip() for fid in finding_ids.split(",")]
        result = batch_update_feedback(
            result, ids, FeedbackStatus(status), comment, reviewer
        )
        console.print(f"[green]已更新 {len(ids)} 条记录状态为 {status}[/green]")

    if categorize:
        cats = categorize_for_training(result)
        _print_categorized(cats)
        round_summary = build_review_round_summary(result)
        _print_round_summary(round_summary)
    else:
        from .distribution import feedback_status_summary

        status_summary = feedback_status_summary(result.findings)
        table = Table(title="反馈状态分布")
        table.add_column("状态", style="cyan")
        table.add_column("数量", justify="right", style="magenta")
        for status_name, count in sorted(status_summary.items()):
            table.add_row(status_name, str(count))
        console.print(table)

    if output:
        ComplianceCheckEngine.save_result(result, output, "json")
        console.print(f"\n[green]结果已保存到: {output}[/green]")

    return result


@cli.command()
@click.argument("result_file", type=click.Path(exists=True))
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="导出 CSV 文件路径",
)
def export(result_file, output):
    """导出检查结果为 CSV 格式"""
    engine = ComplianceCheckEngine()
    result = engine.load_result(result_file)

    if not output:
        base = Path(result_file).stem
        output = str(Path(result_file).with_name(f"{base}.csv"))

    ComplianceCheckEngine.result_to_csv(result, output)
    console.print(f"[green]已导出到: {output}[/green]")
    console.print(f"共 {len(result.findings)} 条记录")


@cli.command()
def demo():
    """运行演示：展示完整检查流程"""
    console.print(Panel(
        "[bold cyan]合规日志脱敏检查 - 完整演示[/bold cyan]\n"
        "将演示: 检查 → 统计 → 导出 完整流程",
        title="演示模式",
    ))

    sample_dir = Path(__file__).parent.parent.parent / "data" / "samples"
    sample_file = sample_dir / "sample_training_logs.txt"

    if not sample_file.exists():
        console.print(f"[yellow]样例文件不存在: {sample_file}[/yellow]")
        console.print("请先确保 data/samples/ 目录下有样例数据")
        return

    console.print(f"\n[bold]1. 执行合规检查[/bold]")
    engine = ComplianceCheckEngine()
    result = engine.check_file(
        str(sample_file),
        prompt_version="v2.3.1",
        sample_batch="batch-2024-06-001",
        review_round="round-01",
        source_note="训练样本-金融客服对话",
        data_source=DataSource.TRAINING_SAMPLE,
    )
    _print_result_summary(result)

    console.print(f"\n[bold]2. 分布统计[/bold]")
    _print_distribution(result)

    console.print(f"\n[bold]3. 截断项复核提示[/bold]")
    needs_review = needs_review_findings(result.findings)
    if needs_review:
        console.print(f"[yellow]有 {len(needs_review)} 条长文本截断记录需要复核[/yellow]")
        for f in needs_review[:3]:
            console.print(f"  - 行 {f.line_number}: {f.truncation_reason}")
    else:
        console.print("[green]无截断项需要复核[/green]")

    console.print(f"\n[bold]演示完成[/bold]")
    console.print("使用 compliance-check --help 查看所有命令")
    console.print("使用 compliance-check check --help 查看检查命令参数")


@cli.command(name="web")
@click.option(
    "--port",
    type=int,
    default=8501,
    help="Web 服务端口",
)
@click.option(
    "--host",
    default="localhost",
    help="Web 服务地址",
)
def web_command(port, host):
    """启动 Web 界面 (Streamlit)"""
    import subprocess

    app_path = Path(__file__).parent.parent.parent / "app" / "streamlit_app.py"
    if not app_path.exists():
        console.print(f"[red]错误: Web 应用文件不存在: {app_path}[/red]")
        sys.exit(1)

    console.print(f"[bold]启动合规检查 Web 界面...[/bold]")
    console.print(f"地址: http://{host}:{port}")

    cmd = [
        sys.executable, "-m", "streamlit", "run",
        str(app_path),
        "--server.port", str(port),
        "--server.address", host,
        "--server.headless", "true",
    ]

    subprocess.run(cmd)


def _print_result_summary(result):
    sev_colors = {
        Severity.HIGH: "red",
        Severity.MEDIUM: "yellow",
        Severity.LOW: "blue",
        Severity.INFO: "cyan",
    }

    summary_text = Text()
    summary_text.append("检查结果摘要\n", style="bold")
    summary_text.append(f"  总行数: {result.total_lines}\n")
    summary_text.append(f"  发现问题: {result.total_findings}\n")
    summary_text.append(f"  命中率: {result.summary.get('hit_rate', 0)}%\n")
    summary_text.append(f"  待复核: {result.summary.get('needs_review_count', 0)}\n")

    console.print(Panel(summary_text, title="检查完成", border_style="green"))

    sev_summary = severity_summary(result.findings)
    table = Table(title="严重程度分布")
    table.add_column("严重程度", style="bold")
    table.add_column("数量", justify="right")
    for sev in [Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.INFO]:
        count = sev_summary.get(sev, 0)
        table.add_row(
            f"[{sev_colors.get(sev, 'white')}]{sev.value}[/{sev_colors.get(sev, 'white')}]",
            str(count),
        )
    console.print(table)


def _print_distribution(result):
    dist = analyze_distribution(result.findings)
    table = Table(title="分类分布统计")
    table.add_column("类别", style="cyan")
    table.add_column("数量", justify="right", style="magenta")
    table.add_column("占比", justify="right", style="green")
    table.add_column("高危", justify="right", style="red")
    table.add_column("中危", justify="right", style="yellow")
    table.add_column("低危", justify="right", style="blue")

    for stat in dist:
        sev_breakdown = stat.severity_breakdown
        table.add_row(
            stat.category,
            str(stat.count),
            f"{stat.percentage}%",
            str(sev_breakdown.get(Severity.HIGH, 0)),
            str(sev_breakdown.get(Severity.MEDIUM, 0)),
            str(sev_breakdown.get(Severity.LOW, 0)),
        )
    console.print(table)


def _print_comparison_summary(comparison):
    summary = comparison.summary
    text = Text()
    text.append(f"基准问题数: {summary['total_base_findings']}\n", style="cyan")
    text.append(f"目标问题数: {summary['total_target_findings']}\n", style="cyan")
    text.append(f"新增问题: {summary['new_findings']}\n", style="red")
    text.append(f"已解决: {summary['resolved_findings']}\n", style="green")
    text.append(f"严重度变化: {summary['severity_changed']}\n", style="yellow")
    text.append(f"未变化(延续): {summary['unchanged']}\n", style="white")
    match_mode = summary.get('match_mode', 'content')
    text.append(f"匹配模式: {match_mode}", style="dim")

    console.print(Panel(text, title="灰度对比结果", border_style="blue"))


def _print_diff_table(diffs, show_all=False):
    table = Table(title="差异详情")
    table.add_column("状态", style="bold")
    table.add_column("规则ID", style="cyan")
    table.add_column("匹配文本", style="yellow")
    table.add_column("行号", justify="right")
    table.add_column("源文件", style="blue")
    table.add_column("严重度变化", style="magenta")

    status_colors = {
        "new": "red",
        "resolved": "green",
        "severity_changed": "yellow",
        "unchanged": "dim",
    }

    limit = len(diffs) if show_all else 20
    for diff in diffs[:limit]:
        status_style = status_colors.get(diff.status, "white")
        sev_change = ""
        if diff.severity_changed:
            sev_change = f"{diff.base_severity.value} → {diff.target_severity.value}"
        elif diff.status == "unchanged":
            sev_change = "—"
        table.add_row(
            f"[{status_style}]{diff.status}[/{status_style}]",
            diff.rule_id,
            diff.matched_text[:30] + "..." if len(diff.matched_text) > 30 else diff.matched_text,
            str(diff.line_number),
            Path(diff.source_file).name,
            sev_change,
        )

    if len(diffs) > limit:
        console.print(f"... 还有 {len(diffs) - limit} 条差异未显示 (使用 --show-all 查看)")

    console.print(table)


def _print_playback_record(record, context_lines):
    console.print(Panel(
        f"[bold]来源文件:[/bold] {record.original_source_file}\n"
        f"[bold]行号:[/bold] {record.original_line_number}\n"
        f"[bold]来源备注:[/bold] {record.source_note or '无'}\n"
        f"[bold]图片名:[/bold] {record.image_name or '无'}",
        title="回放记录",
        border_style="cyan",
    ))

    table = Table(show_header=False, show_lines=False)
    table.add_column("行号", style="dim", width=6, justify="right")
    table.add_column("内容", style="white")

    start_line = record.original_line_number - len(record.context_before)
    for i, line in enumerate(record.context_before):
        table.add_row(str(start_line + i), line)

    table.add_row(
        f"[red]{record.original_line_number}[/red]",
        f"[red]{record.original_raw_text}[/red]",
    )

    end_line = record.original_line_number + 1
    for i, line in enumerate(record.context_after):
        table.add_row(str(end_line + i), line)

    console.print(table)


def _print_categorized(cats):
    console.print(Panel(
        "[bold]训练组视角分类[/bold]\n"
        "✔ ready_to_use: 可直接使用（已确认）\n"
        "⚠ needs_review: 需找 MLOps 工程师复核\n"
        "⏳ pending: 待处理\n"
        "✖ rejected: 已驳回",
        title="分类说明",
        border_style="cyan",
    ))

    table = Table(title="分类统计")
    table.add_column("分类", style="bold")
    table.add_column("数量", justify="right", style="magenta")
    table.add_column("说明", style="dim")

    table.add_row(
        "[green]ready_to_use[/green]",
        str(len(cats["ready_to_use"])),
        "训练组可直接使用",
    )
    table.add_row(
        "[yellow]needs_review[/yellow]",
        str(len(cats["needs_review"])),
        "需 MLOps 工程师复核",
    )
    table.add_row(
        "[blue]pending[/blue]",
        str(len(cats["pending"])),
        "待处理",
    )
    table.add_row(
        "[red]rejected[/red]",
        str(len(cats["rejected"])),
        "已驳回",
    )
    console.print(table)


def _print_round_summary(summary):
    console.print(Panel(
        f"[bold]复核轮次:[/bold] {summary.get('review_round', '未设置')}\n"
        f"[bold]提示词版本:[/bold] {summary.get('prompt_version', '未设置')}\n"
        f"[bold]样本批次:[/bold] {summary.get('sample_batch', '未设置')}\n"
        f"[bold]回滚来源:[/bold] {summary.get('rollback_from', '无')}\n"
        f"[bold]检查时间:[/bold] {summary.get('check_time', '未知')}",
        title="本轮复核信息",
        border_style="green",
    ))


def _print_full_report(report):
    console.print(Panel(
        f"[bold]结果ID:[/bold] {report['result_id']}\n"
        f"[bold]检查时间:[/bold] {report['check_time']}\n"
        f"[bold]提示词版本:[/bold] {report.get('prompt_version', '未设置')}\n"
        f"[bold]样本批次:[/bold] {report.get('sample_batch', '未设置')}\n"
        f"[bold]复核轮次:[/bold] {report.get('review_round', '未设置')}\n"
        f"[bold]总行数:[/bold] {report['total_lines']}\n"
        f"[bold]问题总数:[/bold] {report['total_findings']}\n"
        f"[bold]命中率:[/bold] {report['hit_rate']}%\n"
        f"[bold]待复核数:[/bold] {report['needs_review_count']}",
        title="完整报告",
        border_style="magenta",
    ))


if __name__ == "__main__":
    cli()
