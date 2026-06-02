"""命令行接口。

提供排课校验的完整命令行操作，支持：
- 单文件校验
- 批量目录处理
- 重复导入检测
- 报告生成与导出
- 失败路径追溯
- 月底报告转发
"""

from __future__ import annotations

import os
import sys
import json
from pathlib import Path
from typing import List, Optional
from datetime import datetime

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich import print as rprint

from . import __version__
from .models import (
    InputData,
    ScheduleReport,
    ValidationStatus,
    ConflictType,
)
from .scheduler import ScheduleValidator
from .data_io import DataIO


app = typer.Typer(
    name="schedule-validator",
    help="组合计数排课校验 - 批量处理课程清单、老师时间、教室容量的排课校验工具",
    add_completion=False,
    no_args_is_help=True,
)

console = Console()


def _print_banner() -> None:
    """打印启动横幅。"""
    banner = Panel.fit(
        "[bold cyan]组合计数排课校验系统[/bold cyan]\n"
        f"[dim]版本: {__version__}[/dim]\n"
        "[dim]支持重复计数拦截、时间冲突检测、容量超限预警[/dim]",
        border_style="cyan",
    )
    console.print(banner)


def _print_summary(report: ScheduleReport) -> None:
    """打印校验摘要。"""
    table = Table(title="校验结果摘要", show_header=True, header_style="bold")
    table.add_column("指标", style="dim")
    table.add_column("数值", justify="right")
    table.add_column("状态", justify="center")

    table.add_row(
        "课程总数",
        str(report.total_courses),
        "",
    )
    table.add_row(
        "生成组合数",
        str(report.total_combinations_generated),
        "",
    )
    table.add_row(
        "有效组合",
        str(report.valid_combinations),
        "[green]✓[/green]",
    )
    table.add_row(
        "拦截(重复计数)",
        str(report.blocked_count),
        "[red]✗[/red]" if report.blocked_count > 0 else "[green]-[/green]",
    )
    table.add_row(
        "失败(冲突/容量)",
        str(report.failed_count),
        "[yellow]![/yellow]" if report.failed_count > 0 else "[green]-[/green]",
    )
    table.add_row(
        "警告",
        str(report.warning_count),
        "[yellow]![/yellow]" if report.warning_count > 0 else "[green]-[/green]",
    )

    console.print(table)


def _print_blocked_results(validator: ScheduleValidator, show_trace: bool = False) -> None:
    """打印被拦截的重复计数结果。"""
    blocked = validator.get_blocked_results()
    if not blocked:
        console.print("[green]✓ 未检测到重复计数[/green]")
        return

    console.print(f"[red]✗ 检测到 {len(blocked)} 处重复计数，已全部拦截[/red]")

    for i, result in enumerate(blocked, 1):
        combo = result.conflicting_combinations[0] if result.conflicting_combinations else None

        table = Table(
            title=f"重复计数 #{i}",
            show_header=False,
            border_style="red",
        )
        table.add_column(style="dim")
        table.add_column()

        table.add_row("状态", "[red]拦截[/red]")
        table.add_row("冲突类型", result.conflict_type.value if result.conflict_type else "")
        table.add_row("消息", result.message)

        if combo:
            table.add_row("课程", f"{combo.course.course_name} ({combo.course.course_id})")
            table.add_row("教师", combo.teacher.teacher_name)
            table.add_row("教室", combo.classroom.room_name)
            table.add_row("时间", str(combo.time_slot))

        console.print(table)

        if show_trace and result.trace_path:
            console.print("[dim]追溯路径:[/dim]")
            for j, step in enumerate(result.trace_path, 1):
                console.print(
                    f"  {j:2d}. [{step.phase:8s}] {step.action:10s} - {step.detail[:80]}"
                )

        if result.suggestion:
            console.print(f"[yellow]建议:[/yellow] {result.suggestion.split(chr(10))[0]}")


def _print_failed_results(validator: ScheduleValidator, show_trace: bool = False) -> None:
    """打印失败结果。"""
    failed = validator.get_failed_results()
    if not failed:
        console.print("[green]✓ 无失败案例[/green]")
        return

    console.print(f"[yellow]! 检测到 {len(failed)} 个失败案例，需要复核[/yellow]")

    for i, result in enumerate(failed[:10], 1):
        table = Table(
            title=f"失败案例 #{i}",
            show_header=False,
            border_style="yellow",
        )
        table.add_column(style="dim")
        table.add_column()

        table.add_row("状态", "[yellow]失败[/yellow]")
        table.add_row("冲突类型", result.conflict_type.value if result.conflict_type else "")
        table.add_row("消息", result.message)

        if result.conflicting_combinations:
            combo = result.conflicting_combinations[0]
            table.add_row("课程", f"{combo.course.course_name} ({combo.course.course_id})")
            table.add_row("教师", combo.teacher.teacher_name)
            table.add_row("教室", combo.classroom.room_name)
            table.add_row("时间", str(combo.time_slot))

        console.print(table)

        if show_trace and result.trace_path:
            console.print("[dim]追溯路径:[/dim]")
            for j, step in enumerate(result.trace_path, 1):
                console.print(
                    f"  {j:2d}. [{step.phase:8s}] {step.action:10s} - {step.detail[:80]}"
                )

        if result.suggestion:
            console.print("[cyan]复核建议:[/cyan]")
            for line in result.suggestion.split(chr(10))[:5]:
                console.print(f"  {line}")

    if len(failed) > 10:
        console.print(f"[dim]... 还有 {len(failed) - 10} 条失败记录[/dim]")


@app.command("validate")
def validate(
    courses_file: str = typer.Argument(..., help="课程清单文件路径 (支持 .json, .csv, .xlsx)"),
    teachers_file: str = typer.Argument(..., help="教师时间文件路径 (支持 .json, .csv, .xlsx)"),
    classrooms_file: str = typer.Argument(..., help="教室容量文件路径 (支持 .json, .csv, .xlsx)"),
    output_dir: str = typer.Option("./output", "--output", "-o", help="报告输出目录"),
    show_trace: bool = typer.Option(False, "--show-trace", "-t", help="显示追溯路径"),
    show_suggestions: bool = typer.Option(True, "--show-suggestions", help="显示复核建议"),
    export_trace: bool = typer.Option(False, "--export-trace", help="导出完整追溯数据"),
    prefix: str = typer.Option("schedule_report", "--prefix", help="报告文件名前缀"),
) -> None:
    """执行排课校验。

    输入课程清单、老师时间、教室容量，输出校验报告。
    重复计数会被自动拦住，时间冲突和容量超限会给出复核建议。
    """
    _print_banner()

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("加载输入数据...", total=None)
        try:
            validator = ScheduleValidator.from_files(
                courses_file, teachers_file, classrooms_file
            )
            progress.update(task, description="数据加载完成")
        except Exception as e:
            console.print(f"[red]✗ 数据加载失败: {e}[/red]")
            raise typer.Exit(1)

        task = progress.add_task("生成排课组合...", total=None)
        combinations = validator.generate_combinations()
        progress.update(
            task,
            description=f"生成 {len(combinations)} 个组合"
        )

        task = progress.add_task("执行约束校验...", total=None)
        report = validator.validate()
        progress.update(task, description="校验完成")

    _print_summary(report)

    console.print()
    console.print("[bold]--- 重复计数拦截结果 ---[/bold]")
    _print_blocked_results(validator, show_trace)

    if report.failed_count > 0 or report.warning_count > 0:
        console.print()
        console.print("[bold]--- 失败与警告 ---[/bold]")
        _print_failed_results(validator, show_trace)

    console.print()
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("导出报告...", total=None)
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        files = validator.export_reports(str(output_path), prefix)

        if export_trace:
            trace_file = output_path / f"{prefix}_trace_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            validator.export_trace(str(trace_file))
            files["trace"] = str(trace_file)

        progress.update(task, description="报告导出完成")

    console.print()
    console.print("[bold cyan]--- 导出文件 ---[/bold cyan]")
    for file_type, file_path in files.items():
        console.print(f"  [green]✓[/green] {file_type:15s}: {file_path}")

    if report.blocked_count > 0:
        console.print()
        console.print(
            f"[red]⚠ 检测到 {report.blocked_count} 处重复计数，请检查课程清单是否存在重复导入[/red]"
        )
        raise typer.Exit(code=2)

    if report.failed_count > 0:
        console.print()
        console.print(
            f"[yellow]⚠ 存在 {report.failed_count} 个失败案例，请根据复核建议调整[/yellow]"
        )
        raise typer.Exit(code=1)

    console.print()
    console.print("[green]✓ 所有校验通过，排课方案有效[/green]")


@app.command("batch")
def batch_process(
    input_dir: str = typer.Argument(..., help="输入目录路径"),
    output_dir: str = typer.Option("./output", "--output", "-o", help="报告输出目录"),
    recursive: bool = typer.Option(False, "--recursive", "-r", help="递归处理子目录"),
    pattern: str = typer.Option(
        "*courses*",
        "--pattern",
        help="课程文件匹配模式（会自动查找同目录的 teachers 和 classrooms 文件）"
    ),
) -> None:
    """批量处理目录中的排课数据。

    会自动查找目录中的课程、教师、教室文件组合，
    适合处理多个班级或多个学期的排课数据。
    """
    _print_banner()

    input_path = Path(input_dir)
    if not input_path.exists():
        console.print(f"[red]✗ 输入目录不存在: {input_dir}[/red]")
        raise typer.Exit(1)

    glob_pattern = "**/*courses*" if recursive else "*courses*"
    course_files = list(input_path.glob(glob_pattern))

    if not course_files:
        console.print(f"[yellow]! 未找到匹配 '{pattern}' 的课程文件[/yellow]")
        raise typer.Exit(1)

    console.print(f"[cyan]找到 {len(course_files)} 个课程文件[/cyan]")

    results = []
    for course_file in course_files:
        base_dir = course_file.parent
        base_stem = course_file.stem.replace("courses", "")

        teachers_file = base_dir / f"teachers{base_stem}{course_file.suffix}"
        classrooms_file = base_dir / f"classrooms{base_stem}{course_file.suffix}"

        if not teachers_file.exists():
            teachers_file = base_dir / f"teachers{course_file.suffix}"
        if not classrooms_file.exists():
            classrooms_file = base_dir / f"classrooms{course_file.suffix}"

        if not teachers_file.exists() or not classrooms_file.exists():
            console.print(
                f"[yellow]! 跳过 {course_file.name}: 未找到配套的 teachers 或 classrooms 文件[/yellow]"
            )
            continue

        console.print()
        console.print(f"[bold]--- 处理: {course_file.parent.name}/{course_file.name} ---[/bold]")

        try:
            validator = ScheduleValidator.from_files(
                str(course_file), str(teachers_file), str(classrooms_file)
            )
            report = validator.run_full_workflow()

            sub_output = Path(output_dir) / base_dir.name
            sub_output.mkdir(parents=True, exist_ok=True)
            files = validator.export_reports(str(sub_output), base_stem.strip("_") or "schedule")

            results.append({
                "name": base_dir.name,
                "course_file": str(course_file),
                "report": report,
                "files": files,
            })

            status_color = "green" if report.blocked_count == 0 and report.failed_count == 0 else "red"
            console.print(
                f"[{status_color}]✓ 完成: 有效{report.valid_combinations}, "
                f"拦截{report.blocked_count}, 失败{report.failed_count}[/{status_color}]"
            )

        except Exception as e:
            console.print(f"[red]✗ 处理失败: {e}[/red]")
            results.append({
                "name": base_dir.name,
                "course_file": str(course_file),
                "error": str(e),
            })

    console.print()
    console.print("[bold cyan]--- 批量处理汇总 ---[/bold cyan]")
    table = Table(show_header=True, header_style="bold")
    table.add_column("目录")
    table.add_column("课程数", justify="right")
    table.add_column("有效", justify="right")
    table.add_column("拦截", justify="right")
    table.add_column("失败", justify="right")
    table.add_column("状态")

    success = 0
    has_blocked = 0
    has_failed = 0

    for result in results:
        if "error" in result:
            table.add_row(
                result["name"], "-", "-", "-", "-",
                f"[red]错误: {result['error'][:30]}[/red]"
            )
            continue

        report = result["report"]
        status = "[green]✓[/green]"
        if report.blocked_count > 0:
            status = "[red]有拦截[/red]"
            has_blocked += 1
        elif report.failed_count > 0:
            status = "[yellow]有失败[/yellow]"
            has_failed += 1
        else:
            success += 1

        table.add_row(
            result["name"],
            str(report.total_courses),
            str(report.valid_combinations),
            str(report.blocked_count),
            str(report.failed_count),
            status,
        )

    console.print(table)
    console.print(
        f"[cyan]总计: {len(results)} 个任务, "
        f"{success} 个成功, "
        f"{has_blocked} 个有拦截, "
        f"{has_failed} 个有失败[/cyan]"
    )

    if has_blocked > 0:
        raise typer.Exit(code=2)
    if has_failed > 0:
        raise typer.Exit(code=1)


@app.command("trace")
def show_trace(
    report_file: str = typer.Argument(..., help="报告 JSON 文件路径"),
    combination_id: Optional[str] = typer.Option(None, "--combination", "-c", help="指定组合ID查看追溯"),
    show_duplicates: bool = typer.Option(False, "--duplicates", "-d", help="仅显示重复计数失败路径"),
    show_all: bool = typer.Option(False, "--all", "-a", help="显示所有失败案例"),
    limit: int = typer.Option(10, "--limit", "-n", help="显示数量限制"),
) -> None:
    """查看追溯链。

    从结论翻回组合枚举、约束过滤和冲突解释的完整路径，
    支持定位重复计数等问题的根本原因。
    """
    _print_banner()

    report_path = Path(report_file)
    if not report_path.exists():
        console.print(f"[red]✗ 报告文件不存在: {report_file}[/red]")
        raise typer.Exit(1)

    with open(report_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if show_duplicates:
        duplicates = [
            c for c in data.get("failed_cases", [])
            if c.get("conflict_type") == "重复计数"
        ]
        if not duplicates:
            console.print("[green]✓ 未检测到重复计数[/green]")
            return

        console.print(f"[cyan]共 {len(duplicates)} 处重复计数[/cyan]")
        for i, case in enumerate(duplicates[:limit], 1):
            console.print()
            console.print(f"[bold]--- 重复计数 #{i} ---[/bold]")
            console.print(f"[red]消息: {case.get('message', '')}[/red]")
            if case.get("suggestion"):
                console.print("[yellow]建议:[/yellow]")
                for line in case["suggestion"].split(chr(10))[:5]:
                    console.print(f"  {line}")
        return

    if show_all:
        failed = data.get("failed_cases", [])
        console.print(f"[cyan]共 {len(failed)} 个失败案例[/cyan]")
        for i, case in enumerate(failed[:limit], 1):
            console.print()
            console.print(f"[bold]--- 案例 #{i} ---[/bold]")
            console.print(f"状态: {case.get('status', '')}")
            console.print(f"类型: {case.get('conflict_type', '')}")
            console.print(f"消息: {case.get('message', '')}")
        return

    if combination_id:
        valid = data.get("valid_schedules", [])
        combo = next((c for c in valid if c["combination_id"] == combination_id), None)
        if combo:
            table = Table(title=f"组合 {combination_id}", show_header=False)
            table.add_column(style="dim")
            table.add_column()
            for k, v in combo.items():
                table.add_row(k, str(v))
            console.print(table)
        else:
            console.print(f"[yellow]! 未找到组合 {combination_id} 在有效排课中[/yellow]")
        return

    console.print("[dim]请使用 --duplicates 查看重复计数，或 --all 查看所有失败案例[/dim]")


@app.command("monthly-report")
def monthly_report(
    input_dir: str = typer.Argument(..., help="包含月度数据的目录"),
    output_file: str = typer.Option("./monthly_report.txt", "--output", "-o", help="输出报告文件"),
    month: Optional[str] = typer.Option(None, "--month", "-m", help="指定月份 (如: 2026-06)"),
) -> None:
    """生成月底转发报告。

    汇总目录下所有排课校验结果，生成适合转发的汇总报告。
    """
    _print_banner()

    input_path = Path(input_dir)
    if not input_path.exists():
        console.print(f"[red]✗ 目录不存在: {input_dir}[/red]")
        raise typer.Exit(1)

    report_files = list(input_path.rglob("*_summary_*.json"))
    if not report_files:
        console.print(f"[yellow]! 未找到报告文件[/yellow]")
        raise typer.Exit(1)

    console.print(f"[cyan]找到 {len(report_files)} 个报告文件[/cyan]")

    total_courses = 0
    total_combinations = 0
    total_valid = 0
    total_blocked = 0
    total_failed = 0
    total_warning = 0

    for report_file in report_files:
        with open(report_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            summary = data.get("summary", {})
            total_courses += summary.get("total_courses", 0)
            total_combinations += summary.get("total_combinations_generated", 0)
            total_valid += summary.get("valid_combinations", 0)
            total_blocked += summary.get("blocked_count", 0)
            total_failed += summary.get("failed_count", 0)
            total_warning += summary.get("warning_count", 0)

    report_date = month or datetime.now().strftime("%Y-%m")
    lines = [
        "=" * 70,
        "排课校验月度报告",
        "=" * 70,
        "",
        f"统计月份: {report_date}",
        f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "--- 总体统计 ---",
        f"处理课程总数: {total_courses}",
        f"生成组合总数: {total_combinations}",
        f"有效组合: {total_valid}",
        f"拦截(重复计数): {total_blocked}",
        f"失败(冲突/容量): {total_failed}",
        f"警告: {total_warning}",
        "",
        "--- 质量评估 ---",
    ]

    if total_blocked > 0:
        lines.append(
            f"[严重] 存在 {total_blocked} 处重复计数拦截，"
            f"请检查数据导入流程是否存在重复导入问题"
        )
    if total_failed > 0:
        lines.append(
            f"[警告] 存在 {total_failed} 个失败案例，"
            f"请根据各报告中的复核建议逐一处理"
        )
    if total_warning > 0:
        lines.append(
            f"[提示] 存在 {total_warning} 个警告，"
            f"建议人工复核后决定是否调整"
        )
    if total_blocked == 0 and total_failed == 0:
        lines.append("[优良] 本月排课数据质量良好，无严重问题")

    lines.extend([
        "",
        "--- 备注 ---",
        f"本报告基于 {len(report_files)} 个排课校验任务汇总生成",
        f"详细数据请查看各子目录下的完整报告",
        "",
        "=" * 70,
    ])

    report_content = "\n".join(lines)

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(report_content)

    console.print(report_content)
    console.print()
    console.print(f"[green]✓ 月度报告已生成: {output_file}[/green]")

    if total_blocked > 0:
        raise typer.Exit(code=2)
    if total_failed > 0:
        raise typer.Exit(code=1)


@app.command("version")
def version() -> None:
    """显示版本信息。"""
    console.print(f"[cyan]组合计数排课校验系统 v{__version__}[/cyan]")


def main() -> None:
    """主入口。"""
    app()


if __name__ == "__main__":
    main()
