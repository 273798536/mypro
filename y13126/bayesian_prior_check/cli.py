from __future__ import annotations

import os
import sys
from datetime import datetime
from typing import Optional

import click
from rich.console import Console
from rich.table import Table

from .config import load_boundaries
from .models import RunStatus
from .parser import DataParser
from .reporter import ReportGenerator
from .storage import RunStorage
from .validator import BayesianPriorValidator


def _print_summary_console(summary, console: Console) -> None:
    table = Table(title="处理记录统计", show_header=True, header_style="bold cyan")
    table.add_column("类别", style="bold")
    table.add_column("行数", justify="right")
    table.add_column("说明", style="dim")
    table.add_row("总行数", str(summary.total_rows), "数据文件中的所有数据行")
    table.add_row("[green]已处理行[/green]", str(summary.processed_rows), "成功解析并完成校验")
    table.add_row("[yellow]跳过行[/yellow]", str(summary.skipped_rows), "关键字段缺失，无法处理")
    table.add_row("[red]坏行[/red]", str(summary.bad_rows), "解析错误过多，数据不可用")
    console.print(table)

    if summary.total_issues > 0:
        t2 = Table(title="问题统计", show_header=True, header_style="bold magenta")
        t2.add_column("严重程度", style="bold")
        t2.add_column("数量", justify="right")
        t2.add_column("问题类型", style="dim")
        t2.add_column("数量", justify="right")
        sev_rows = list(summary.issues_by_severity.items())
        typ_rows = list(summary.issues_by_type.items())
        max_len = max(len(sev_rows), len(typ_rows), 1)
        type_names = {
            "probability_out_of_range": "概率越界",
            "conjugate_prior_invalid": "共轭先验越界",
            "division_by_zero": "除零边界",
            "parse_error": "解析错误",
            "missing_field": "字段缺失",
            "invalid_value": "非法值",
        }
        for i in range(max_len):
            sev_cell = ""
            sev_cnt = ""
            typ_cell = ""
            typ_cnt = ""
            if i < len(sev_rows):
                s, c = sev_rows[i]
                sname = s.value if hasattr(s, "value") else s
                color = {"error": "red", "warning": "yellow", "info": "blue"}.get(sname, "")
                sev_cell = f"[{color}]{sname.upper()}[/{color}]" if color else sname.upper()
                sev_cnt = str(c)
            if i < len(typ_rows):
                t, c = typ_rows[i]
                tname = t.value if hasattr(t, "value") else t
                typ_cell = type_names.get(tname, tname)
                typ_cnt = str(c)
            t2.add_row(sev_cell, sev_cnt, typ_cell, typ_cnt)
        console.print(t2)


@click.group()
def main() -> None:
    """贝叶斯先验边界校验工具 - 保留原始来源、追踪除零边界、分类输出处理记录"""
    pass


@main.command()
@click.argument("input_file", type=click.Path(exists=True, dir_okay=False))
@click.option("--config", "-c", "config_file", type=click.Path(exists=True, dir_okay=False), default=None, help="边界配置文件路径")
@click.option("--note", "-n", type=str, default=None, help="本次校验的备注说明（评审会用）")
@click.option("--storage-dir", type=click.Path(file_okay=False), default=None, help="历史记录存储目录")
@click.option("--sheet", type=str, default=None, help="Excel时指定sheet名")
@click.option("--export-json", type=click.Path(dir_okay=False), default=None, help="导出完整结果到JSON文件")
@click.option("--export-report", type=click.Path(dir_okay=False), default=None, help="导出让人可读的评审会报告")
@click.option("--full", is_flag=True, default=False, help="显示全部问题详情，默认只显示前20条")
def check(
    input_file: str,
    config_file: Optional[str],
    note: Optional[str],
    storage_dir: Optional[str],
    sheet: Optional[str],
    export_json: Optional[str],
    export_report: Optional[str],
    full: bool,
) -> None:
    """对CSV/Excel计算草稿执行贝叶斯先验边界校验"""
    console = Console()

    try:
        boundaries = load_boundaries(config_file)
    except Exception as e:
        console.print(f"[red]加载边界配置失败: {e}[/red]")
        sys.exit(1)

    storage = RunStorage(storage_dir)
    run = storage.create_run(input_file, config_file, note)
    run.status = RunStatus.RUNNING
    storage.update_run(run)

    validator = BayesianPriorValidator(boundaries)

    try:
        parser = DataParser(input_file, sheet_name=sheet)
        for parsed in parser.iter_records():
            validated = validator.validate_record(parsed)
            storage.append_record_details(run.run_id, validated)
    except Exception as e:
        run = storage.finalize_run(run, validator.summary, error_message=str(e))
        reporter = ReportGenerator(run, storage)
        console.print(reporter.generate_console_report())
        console.print(f"[red]校验过程出错: {e}[/red]")
        sys.exit(1)

    run = storage.finalize_run(run, validator.summary)
    reporter = ReportGenerator(run, storage)

    console.print(reporter.generate_console_report())
    _print_summary_console(run.summary, console)
    detail_limit = 10000 if full else 20
    console.print(reporter.generate_console_details(limit=detail_limit))

    if export_json:
        reporter.export_json(export_json)
        console.print(f"[green]JSON结果已导出到: {export_json}[/green]")

    if export_report:
        report_md = reporter.generate_human_readable_report()
        with open(export_report, "w", encoding="utf-8") as f:
            f.write(report_md)
        console.print(f"[green]评审会报告已导出到: {export_report}[/green]")

    console.print(f"[dim]运行ID: {run.run_id}（可用于后续查看或补充备注）[/dim]")


@main.command("list")
@click.option("--limit", "-n", type=int, default=10, help="显示最近的N条记录")
@click.option("--storage-dir", type=click.Path(file_okay=False), default=None)
def list_runs(limit: int, storage_dir: Optional[str]) -> None:
    """查看历史校验记录"""
    console = Console()
    storage = RunStorage(storage_dir)
    runs = storage.list_runs(limit=limit)

    if not runs:
        console.print("[yellow]暂无历史记录[/yellow]")
        return

    table = Table(title="历史校验记录", show_header=True, header_style="bold cyan")
    table.add_column("运行ID", style="bold")
    table.add_column("状态")
    table.add_column("开始时间")
    table.add_column("数据文件")
    table.add_column("已处理/跳过/坏行")
    table.add_column("问题数")
    table.add_column("备注", style="dim")

    status_colors = {
        "completed": "green",
        "failed": "red",
        "running": "yellow",
        "pending": "dim",
    }

    for r in runs:
        s = r.summary
        sname = r.status.value
        color = status_colors.get(sname, "")
        status_cell = f"[{color}]{sname}[/{color}]" if color else sname
        stats = f"{s.processed_rows}/{s.skipped_rows}/{s.bad_rows}"
        table.add_row(
            r.run_id,
            status_cell,
            r.started_at.strftime("%m-%d %H:%M"),
            os.path.basename(r.source_file),
            stats,
            str(s.total_issues),
            r.note or "",
        )
    console.print(table)


@main.command()
@click.argument("run_id", type=str)
@click.option("--storage-dir", type=click.Path(file_okay=False), default=None)
@click.option("--full", is_flag=True, default=False, help="显示全部问题详情")
def show(run_id: str, storage_dir: Optional[str], full: bool) -> None:
    """查看指定运行ID的详细结果"""
    console = Console()
    storage = RunStorage(storage_dir)
    run = storage.get_run(run_id)

    if not run:
        console.print(f"[red]未找到运行ID: {run_id}[/red]")
        sys.exit(1)

    reporter = ReportGenerator(run, storage)
    console.print(reporter.generate_console_report())
    _print_summary_console(run.summary, console)
    detail_limit = 10000 if full else 20
    console.print(reporter.generate_console_details(limit=detail_limit))


@main.command("note")
@click.argument("run_id", type=str)
@click.argument("note_text", type=str)
@click.option("--storage-dir", type=click.Path(file_okay=False), default=None)
def update_note(run_id: str, note_text: str, storage_dir: Optional[str]) -> None:
    """为指定运行ID添加/更新备注说明"""
    console = Console()
    storage = RunStorage(storage_dir)
    run = storage.update_note(run_id, note_text)
    if not run:
        console.print(f"[red]未找到运行ID: {run_id}[/red]")
        sys.exit(1)
    console.print(f"[green]备注已更新:[/green] {note_text}")


@main.command()
@click.argument("run_id", type=str)
@click.argument("output_file", type=click.Path(dir_okay=False))
@click.option("--storage-dir", type=click.Path(file_okay=False), default=None)
def export(run_id: str, output_file: str, storage_dir: Optional[str]) -> None:
    """导出指定运行ID的完整结果为JSON"""
    console = Console()
    storage = RunStorage(storage_dir)
    run = storage.get_run(run_id)
    if not run:
        console.print(f"[red]未找到运行ID: {run_id}[/red]")
        sys.exit(1)
    reporter = ReportGenerator(run, storage)
    reporter.export_json(output_file)
    console.print(f"[green]结果已导出到: {output_file}[/green]")


@main.command("report")
@click.argument("run_id", type=str)
@click.argument("output_file", type=click.Path(dir_okay=False))
@click.option("--storage-dir", type=click.Path(file_okay=False), default=None)
def export_human_report(run_id: str, output_file: str, storage_dir: Optional[str]) -> None:
    """导出指定运行ID的评审会报告（人可读Markdown）"""
    console = Console()
    storage = RunStorage(storage_dir)
    run = storage.get_run(run_id)
    if not run:
        console.print(f"[red]未找到运行ID: {run_id}[/red]")
        sys.exit(1)
    reporter = ReportGenerator(run, storage)
    md = reporter.generate_human_readable_report()
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(md)
    console.print(f"[green]评审会报告已导出到: {output_file}[/green]")


@main.command()
@click.option("--host", type=str, default="127.0.0.1")
@click.option("--port", type=int, default=8765)
@click.option("--storage-dir", type=click.Path(file_okay=False), default=None)
def serve(host: str, port: int, storage_dir: Optional[str]) -> None:
    """启动HTTP API服务"""
    import uvicorn

    os.environ["BAYES_CHECK_STORAGE_DIR"] = storage_dir or ""
    uvicorn.run("bayesian_prior_check.api:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
