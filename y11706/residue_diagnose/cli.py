"""命令行入口。

使用 click 构建 CLI，提供数据拟合残差诊断的完整命令。
"""

import os
import sys
from typing import List, Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .data_loader import Dataset, load_datasets, load_directory, validate_dataset
from .diagnostics import DiagnosticReport, diagnose
from .fitter import FitResult, fit_model, fit_multiple_models, rank_models
from .models import MODELS, list_models
from .report import (
    export_json_report,
    format_diagnostic_text,
    generate_fit_plot,
    generate_residual_plots,
)

console = Console()


def _print_header():
    console.print()
    console.print(
        Panel.fit(
            "[bold cyan]数据拟合残差诊断 CLI[/bold cyan]\n"
            "[dim]Residual Diagnostics for Curve Fitting[/dim]",
            border_style="cyan",
        )
    )
    console.print()


def _print_dataset_summary(dataset: Dataset):
    table = Table(title=f"数据集: {dataset.name}", show_header=True, header_style="bold")
    table.add_column("项目", style="cyan")
    table.add_column("值", style="white")

    table.add_row("来源", dataset.source)
    table.add_row("模型类型", f"{dataset.model_type} ({MODELS.get(dataset.model_type, {}).display_name if dataset.model_type in MODELS else '?'})")
    table.add_row("样本数", str(len(dataset.x)))
    table.add_row("x 范围", f"[{min(dataset.x):.4f}, {max(dataset.x):.4f}]")
    table.add_row("y 范围", f"[{min(dataset.y):.4f}, {max(dataset.y):.4f}]")
    if dataset.initial_params:
        table.add_row("初始参数", str(dataset.initial_params))
    if dataset.description:
        table.add_row("说明", dataset.description)

    console.print(table)


def _print_fit_result(result: FitResult):
    model = MODELS.get(result.model_name)
    table = Table(title=f"拟合结果 - {model.display_name if model else result.model_name}",
                  show_header=True, header_style="bold")
    table.add_column("指标", style="cyan")
    table.add_column("值", style="white", justify="right")

    table.add_row("R²", f"{result.r_squared:.6f}")
    table.add_row("调整 R²", f"{result.adjusted_r_squared:.6f}")
    table.add_row("RMSE", f"{result.rmse:.6f}")
    table.add_row("参数数量", str(result.n_params))
    table.add_row("样本数量", str(result.n_samples))

    console.print(table)

    if model and result.params:
        param_table = Table(title="参数估计", show_header=True, header_style="bold")
        param_table.add_column("参数", style="cyan")
        param_table.add_column("估计值", style="white", justify="right")
        param_table.add_column("标准误差", style="yellow", justify="right")

        for name, val, err in zip(model.param_names, result.params, result.param_errors):
            param_table.add_row(name, f"{val:.6f}", f"{err:.6f}")

        console.print(param_table)


def _print_diagnostics(report: DiagnosticReport):
    if report.critical_issues:
        for issue in report.critical_issues:
            console.print(f"[bold red]!!! 严重问题: {issue}[/bold red]")
        console.print()

    if report.warnings:
        for warning in report.warnings:
            console.print(f"[yellow]⚠ 警告: {warning}[/yellow]")
        console.print()

    table = Table(title="残差诊断", show_header=True, header_style="bold")
    table.add_column("诊断项", style="cyan")
    table.add_column("结果", style="white")
    table.add_column("详情", style="dim")

    table.add_row(
        "残差趋势",
        "[green]无[/green]" if not report.has_trend else "[yellow]存在[/yellow]",
        f"斜率={report.trend_slope:.4f}",
    )
    table.add_row(
        "异方差性",
        "[green]无[/green]" if not report.has_heteroscedasticity else "[yellow]存在[/yellow]",
        f"p={report.heteroscedasticity_pvalue:.4f}",
    )
    table.add_row(
        "自相关性",
        "[green]无[/green]" if not report.has_autocorrelation else "[yellow]存在[/yellow]",
        f"lag1={report.autocorrelation_lag1:.4f}",
    )
    table.add_row(
        "过拟合",
        "[green]无[/green]" if not report.is_overfitting else "[red]存在[/red]",
        report.overfit_warning or "-",
    )
    table.add_row(
        "单位混用",
        "[green]无[/green]" if not report.has_unit_mix else "[red]存在[/red]",
        report.unit_mix_warning or "-",
    )
    table.add_row(
        "异常点主导",
        "[green]无[/green]" if not report.outlier_dominance else "[red]存在[/red]",
        f"占比={report.outlier_dominance_ratio:.1%}",
    )

    console.print(table)

    if report.outliers:
        outlier_table = Table(
            title=f"异常点 ({len(report.outliers)} 个)",
            show_header=True,
            header_style="bold",
        )
        outlier_table.add_column("序号", justify="right")
        outlier_table.add_column("x", justify="right")
        outlier_table.add_column("y", justify="right")
        outlier_table.add_column("残差", justify="right")
        outlier_table.add_column("标准化残差", justify="right")
        outlier_table.add_column("严重程度")

        for o in report.outliers:
            severity_style = {
                "mild": "dim",
                "moderate": "yellow",
                "severe": "red bold",
            }
            outlier_table.add_row(
                str(o.index),
                f"{o.x_value:.4f}",
                f"{o.y_value:.4f}",
                f"{o.residual:.4f}",
                f"{o.std_residual:.4f}",
                f"[{severity_style.get(o.severity, 'white')}]{o.severity}[/{severity_style.get(o.severity, 'white')}]",
            )

        console.print(outlier_table)

    residual_table = Table(title="残差统计", show_header=True, header_style="bold")
    residual_table.add_column("统计量", style="cyan")
    residual_table.add_column("值", justify="right")

    residual_table.add_row("均值", f"{report.residual_mean:.6f}")
    residual_table.add_row("标准差", f"{report.residual_std:.6f}")
    residual_table.add_row("偏度", f"{report.residual_skewness:.6f}")
    residual_table.add_row("峰度", f"{report.residual_kurtosis:.6f}")

    console.print(residual_table)


def _process_dataset(
    dataset: Dataset,
    output_dir: str,
    compare_models: Optional[List[str]] = None,
    generate_plots: bool = True,
    export_json: bool = True,
) -> Optional[DiagnosticReport]:
    """处理单个数据集。"""
    valid, issues = validate_dataset(dataset)
    if not valid:
        console.print(f"[red]数据集 {dataset.name} 验证失败:[/red]")
        for issue in issues:
            console.print(f"  - {issue}")
        return None

    _print_dataset_summary(dataset)

    try:
        result = fit_model(
            dataset.x,
            dataset.y,
            dataset.model_type,
            initial_params=dataset.initial_params,
            source=dataset.source or dataset.name,
        )
    except Exception as e:
        console.print(f"[red]拟合失败: {e}[/red]")
        return None

    _print_fit_result(result)

    report = diagnose(result)
    _print_diagnostics(report)

    if compare_models:
        console.print("\n[bold]模型对比:[/bold]")
        all_models = [dataset.model_type] + [m for m in compare_models if m != dataset.model_type]
        compare_results = fit_multiple_models(
            dataset.x, dataset.y, all_models, source=dataset.source or dataset.name
        )
        ranked = rank_models(compare_results)

        compare_table = Table(title="模型排名 (按调整 R²)", show_header=True, header_style="bold")
        compare_table.add_column("排名", justify="right")
        compare_table.add_column("模型", style="cyan")
        compare_table.add_column("R²", justify="right")
        compare_table.add_column("调整 R²", justify="right")

        for rank, (name, r2, adj_r2) in enumerate(ranked, 1):
            compare_table.add_row(str(rank), name, f"{r2:.6f}", f"{adj_r2:.6f}")

        console.print(compare_table)

    if generate_plots:
        try:
            plots = generate_residual_plots(result, report, output_dir, prefix=dataset.name)
            fit_plot = generate_fit_plot(result, report, output_dir, prefix=dataset.name)
            console.print(f"\n[green]已生成残差诊断图:[/green] {', '.join(plots)}")
            if fit_plot:
                console.print(f"[green]已生成拟合对比图:[/green] {fit_plot}")
        except Exception as e:
            console.print(f"[yellow]生成图表失败: {e}[/yellow]")

    if export_json:
        try:
            json_path = export_json_report(report, result, output_dir, prefix=dataset.name)
            console.print(f"[green]已导出 JSON 报告:[/green] {json_path}")
        except Exception as e:
            console.print(f"[yellow]导出 JSON 失败: {e}[/yellow]")

    text_report = format_diagnostic_text(report, result)
    report_path = os.path.join(output_dir, f"{dataset.name}_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(text_report)
    console.print(f"[green]已导出文本报告:[/green] {report_path}")

    console.print()
    return report


@click.group()
@click.version_option(version="0.1.0", prog_name="residue-diagnose")
def cli():
    """数据拟合残差诊断工具。"""
    pass


@cli.command()
@click.argument("input_path", type=click.Path(exists=True))
@click.option(
    "--output-dir", "-o",
    default="./output",
    show_default=True,
    help="输出目录",
)
@click.option(
    "--compare", "-c",
    multiple=True,
    help="对比的其他模型类型 (可多次指定)",
)
@click.option(
    "--no-plots",
    is_flag=True,
    default=False,
    help="不生成图表",
)
@click.option(
    "--no-json",
    is_flag=True,
    default=False,
    help="不导出 JSON 报告",
)
def run(input_path: str, output_dir: str, compare: tuple, no_plots: bool, no_json: bool):
    """运行残差诊断。

    INPUT_PATH 可以是数据文件（CSV/JSON）或包含数据文件的目录。
    """
    _print_header()

    os.makedirs(output_dir, exist_ok=True)

    compare_list = list(compare) if compare else None

    if os.path.isdir(input_path):
        console.print(f"[info] 从目录加载数据: {input_path}")
        datasets = load_directory(input_path)
    else:
        console.print(f"[info] 从文件加载数据: {input_path}")
        datasets = load_datasets(input_path)

    if not datasets:
        console.print("[red]未找到有效数据集[/red]")
        return

    console.print(f"\n共加载 [bold]{len(datasets)}[/bold] 个数据集\n")

    reports = []
    for i, dataset in enumerate(datasets):
        console.print(f"\n[bold]━━━━━━━━━━ 数据集 {i + 1}/{len(datasets)}: {dataset.name} ━━━━━━━━━━[/bold]\n")
        report = _process_dataset(
            dataset,
            output_dir,
            compare_models=compare_list,
            generate_plots=not no_plots,
            export_json=not no_json,
        )
        if report:
            reports.append(report)

    console.print(f"\n[bold green]处理完成![/bold green]")
    console.print(f"  成功: {len(reports)}/{len(datasets)} 个数据集")
    console.print(f"  输出目录: {os.path.abspath(output_dir)}")

    critical_count = sum(1 for r in reports if r.critical_issues)
    warning_count = sum(1 for r in reports if r.warnings)

    if critical_count > 0:
        console.print(f"  [red]存在严重问题: {critical_count} 个数据集[/red]")
    if warning_count > 0:
        console.print(f"  [yellow]存在警告: {warning_count} 个数据集[/yellow]")


@cli.command()
@click.option(
    "--model", "-m",
    default="linear",
    show_default=True,
    help="拟合模型类型",
)
@click.option(
    "--x", "x_values",
    required=True,
    help="x 值 (逗号分隔)",
)
@click.option(
    "--y", "y_values",
    required=True,
    help="y 值 (逗号分隔)",
)
@click.option(
    "--name", "-n",
    default="inline_data",
    help="数据集名称",
)
@click.option(
    "--output-dir", "-o",
    default="./output",
    show_default=True,
    help="输出目录",
)
@click.option(
    "--compare", "-c",
    multiple=True,
    help="对比的其他模型类型",
)
def quick(model: str, x_values: str, y_values: str, name: str, output_dir: str, compare: tuple):
    """快速诊断（直接传入数据）。"""
    _print_header()

    os.makedirs(output_dir, exist_ok=True)

    try:
        x = [float(v.strip()) for v in x_values.split(",")]
        y = [float(v.strip()) for v in y_values.split(",")]
    except ValueError as e:
        console.print(f"[red]数据解析失败: {e}[/red]")
        return

    if len(x) != len(y):
        console.print(f"[red]x 和 y 长度不一致: {len(x)} vs {len(y)}[/red]")
        return

    import numpy as np

    dataset = Dataset(
        name=name,
        source="inline",
        x=np.array(x),
        y=np.array(y),
        model_type=model,
    )

    compare_list = list(compare) if compare else None
    _process_dataset(dataset, output_dir, compare_models=compare_list)


@cli.command(name="list-models")
def list_models_cmd():
    """列出所有可用模型。"""
    console.print("\n[bold]可用模型:[/bold]\n")

    table = Table(show_header=True, header_style="bold")
    table.add_column("名称", style="cyan")
    table.add_column("显示名")
    table.add_column("公式")
    table.add_column("参数")

    for name, model in MODELS.items():
        table.add_row(
            name,
            model.display_name,
            model.description,
            ", ".join(model.param_names),
        )

    console.print(table)


@cli.command()
@click.option(
    "--output-dir", "-o",
    default="./samples",
    show_default=True,
    help="样例输出目录",
)
def generate_samples(output_dir: str):
    """生成样例数据（正常、边界、坏数据）。"""
    import json

    os.makedirs(output_dir, exist_ok=True)

    samples = {
        "datasets": [
            {
                "name": "normal_linear",
                "source": "样例-正常线性数据",
                "description": "标准线性关系 y=2x+1，添加高斯噪声 σ=0.5",
                "model_type": "linear",
                "x": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0,
                      11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0],
                "y": [3.2, 4.8, 7.1, 8.9, 11.2, 12.8, 15.1, 17.2, 18.9, 21.1,
                      23.3, 24.8, 27.1, 28.9, 31.3, 33.0, 35.2, 37.1, 38.8, 41.0],
            },
            {
                "name": "boundary_outlier",
                "source": "样例-边界异常数据",
                "description": "二次关系但有2个边界异常点，接近但未超过严重阈值",
                "model_type": "quadratic",
                "x": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0,
                      11.0, 12.0, 13.0, 14.0, 15.0],
                "y": [1.8, 4.2, 9.3, 15.8, 25.1, 36.2, 48.9, 63.8, 80.5, 100.2,
                      121.8, 200.0, 168.2, 195.5, 224.8],
            },
            {
                "name": "bad_overfit",
                "source": "样例-坏数据(过拟合+单位混用)",
                "description": "少量数据用高阶模型，存在单位混用风险",
                "model_type": "cubic",
                "x": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0],
                "y": [1.5, 12.3, 28.8, 62.5, 125.0, 216.5, 343.0],
            },
            {
                "name": "exponential_good",
                "source": "样例-指数增长数据",
                "description": "正常指数关系 y=0.5*exp(0.3x)+0.1",
                "model_type": "exponential",
                "x": [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
                "y": [0.7, 0.9, 1.4, 2.0, 3.1, 4.6, 6.8, 10.2, 15.1, 22.4, 33.2],
            },
        ]
    }

    filepath = os.path.join(output_dir, "sample_data.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(samples, f, indent=2, ensure_ascii=False)

    console.print(f"[green]样例数据已生成:[/green] {filepath}")
    console.print(f"  包含 {len(samples['datasets'])} 个数据集:")
    for ds in samples["datasets"]:
        console.print(f"    - {ds['name']}: {ds['description']}")


def main():
    """入口函数。"""
    cli()


if __name__ == "__main__":
    main()