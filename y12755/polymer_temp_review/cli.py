from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional, Tuple

import click
from rich.console import Console
from rich.table import Table

from .errors import ReviewError, format_missing_files
from .exporter import (
    build_terminal_details,
    build_terminal_summary_text,
)
from .pipeline import ReviewPipeline


def _parse_range(range_str: Optional[str]) -> Optional[Tuple[float, float]]:
    if not range_str:
        return None
    try:
        lo, hi = range_str.split(",")
        return float(lo.strip()), float(hi.strip())
    except Exception as e:
        raise click.BadParameter(
            f"预期浓度范围格式错误: {range_str}，应为 '下限,上限'，如 '95,105'"
        ) from e


@click.group()
@click.version_option(package_name="polymer-temp-review")
def main() -> None:
    """聚合反应温控复盘 CLI 工具。

    典型用法:

      polymer-review run --input ./input --output ./output

    首次运行可使用 polymer-review init-samples --input ./input 生成样例。
    """
    pass


@main.command()
@click.option(
    "--input",
    "input_dir",
    type=click.Path(file_okay=False, path_type=Path),
    required=True,
    help="输入目录，包含 batch_reports/、materials/、weighing_records/ 子目录",
)
@click.option(
    "--output",
    "output_dir",
    type=click.Path(file_okay=False, path_type=Path),
    required=True,
    help="输出目录，结果与运行清单会写入此目录，可重复运行，幂等",
)
@click.option(
    "--expected-concentration-range",
    default=None,
    help="预期浓度范围（mg/mL），格式: '下限,上限'，如 '95,105'",
)
@click.option(
    "--concentration-unit",
    default="mg/mL",
    show_default=True,
    help="浓度换算目标单位",
)
def run(
    input_dir: Path,
    output_dir: Path,
    expected_concentration_range: Optional[str],
    concentration_unit: str,
) -> None:
    """执行聚合反应温控复盘。"""
    console = Console()
    conc_range = _parse_range(expected_concentration_range)

    pipeline = ReviewPipeline(
        input_dir=input_dir,
        output_dir=output_dir,
        expected_concentration_range=conc_range,
        concentration_target_unit=concentration_unit,
    )

    try:
        ok, actions = pipeline.load()
        if not ok:
            console.print("[bold red]加载输入数据失败[/bold red]")
            msg = format_missing_files(actions)
            if msg:
                console.print(msg)
            for w in pipeline.warnings:
                console.print(f"[yellow]  · {w}[/yellow]")
            sys.exit(1)

        pipeline.run()
        summary, written = pipeline.build_and_export()

        console.print(build_terminal_summary_text(summary))
        console.print()
        console.print(build_terminal_details(pipeline.results))

        if pipeline.warnings:
            console.print("[yellow]以下警告需关注:[/yellow]")
            for w in pipeline.warnings:
                console.print(f"  · {w}")

        console.print()
        console.print("[bold green]结果文件已写出:[/bold green]")
        for key, path in written.items():
            console.print(f"  · {key}: {path}")

        if summary.needs_review_count > 0:
            console.print()
            console.print(
                f"[bold yellow]提示: 有 {summary.needs_review_count} 批次需要药化研究员复核，"
                f"质检主管请先与药化沟通后再放行。[/bold yellow]"
            )

    except ReviewError as e:
        console.print(f"[bold red]{e.pretty()}[/bold red]")
        sys.exit(2)
    except Exception as e:  # 兜底：给出可操作提示，而不是内部堆栈
        console.print(f"[bold red]运行失败: {e}[/bold red]")
        console.print(
            "如无法自行解决，请检查输入目录结构是否正确，或使用 "
            "'polymer-review init-samples --input ./input' 生成样例作为参考。"
        )
        sys.exit(3)


@main.command("init-samples")
@click.option(
    "--input",
    "input_dir",
    type=click.Path(file_okay=False, path_type=Path),
    required=True,
    help="要写入样例数据的目录",
)
def init_samples(input_dir: Path) -> None:
    """在指定目录生成一组可直接运行的样例数据。

    生成后可直接执行:
      polymer-review run --input <目录> --output ./output
    """
    from .sample_data import write_samples

    console = Console()
    written = write_samples(input_dir)
    console.print(f"[bold green]样例数据已生成到: {input_dir}[/bold green]")
    for p in written:
        console.print(f"  · {p.relative_to(input_dir)}")
    console.print()
    console.print("下一步运行:")
    console.print(f"  polymer-review run --input {input_dir} --output ./output")


@main.command("check-inputs")
@click.option(
    "--input",
    "input_dir",
    type=click.Path(file_okay=False, path_type=Path),
    required=True,
    help="输入目录",
)
def check_inputs(input_dir: Path) -> None:
    """只检查输入目录的完整性，不执行复盘。"""
    from .traceability import MaterialRegistry, load_batch_reports

    console = Console()
    registry = MaterialRegistry(input_dir)
    loaded, errors = registry.load()
    reports, report_errors = load_batch_reports(input_dir)

    table = Table(title="输入目录检查")
    table.add_column("项目")
    table.add_column("数量")
    table.add_column("状态")
    table.add_row(
        "来源材料",
        str(len(registry.materials)),
        "[green]OK[/green]" if registry.materials else "[red]缺失[/red]",
    )
    table.add_row(
        "称量单",
        str(len(registry.weighing_records)),
        "[green]OK[/green]" if registry.weighing_records else "[red]缺失[/red]",
    )
    table.add_row(
        "批次报告",
        str(len(reports)),
        "[green]OK[/green]" if reports else "[red]缺失[/red]",
    )
    console.print(table)

    if errors or report_errors:
        console.print("[yellow]解析警告/错误:[/yellow]")
        for e in errors + report_errors:
            console.print(f"  · {e}")
    if registry.missing_files:
        console.print("[red]缺失的输入:[/red]")
        for m in registry.missing_files:
            console.print(f"  · {m}")


if __name__ == "__main__":
    main()
