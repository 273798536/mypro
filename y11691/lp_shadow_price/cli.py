from __future__ import annotations

import sys
import json
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .models import LPInput, SolutionStatus
from .validator import ConstraintValidator
from .solver import LPSolver
from .report import ReportGenerator
from .storage import VersionedStorage

console = Console()


@click.group()
@click.version_option(version="0.1.0", prog_name="lp-shadow")
def main():
    """线性规划影子价格分析CLI工具"""
    pass


@main.command()
@click.option("--input", "-i", "input_file", required=True, type=click.Path(exists=True, dir_okay=False), help="输入数据文件路径 (JSON)")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False), help="输出目录")
@click.option("--input-dir", default=None, type=click.Path(file_okay=False), help="输入文件根目录（用于相对路径）")
@click.option("--no-auto-correct", is_flag=True, help="禁用自动修正")
@click.option("--time-limit", default=60, type=int, help="求解时间限制（秒）")
@click.option("--no-report", is_flag=True, help="不生成详细报告")
@click.option("--quiet", "-q", is_flag=True, help="静默模式，减少输出")
def solve(
    input_file: str,
    output_dir: str,
    input_dir: Optional[str],
    no_auto_correct: bool,
    time_limit: int,
    no_report: bool,
    quiet: bool,
):
    """求解线性规划模型并计算影子价格"""

    if not quiet:
        console.print(Panel.fit(
            "[bold cyan]线性规划影子价格分析器[/bold cyan]\n"
            "读取输入 → 数据校验 → 模型求解 → 敏感性分析 → 生成报告",
            border_style="cyan",
        ))

    storage = VersionedStorage(output_dir=output_dir, input_dir=input_dir)

    try:
        if not quiet:
            console.print(f"[dim]📂 读取输入数据: {input_file}[/dim]")
        lp_input = storage.load_input(input_file)
    except Exception as e:
        console.print(f"[red]❌ 读取输入文件失败: {e}[/red]")
        sys.exit(1)

    if not quiet:
        console.print(f"[dim]✅ 版本: {lp_input.version} | 产品: {len(lp_input.products)} | 原料: {len(lp_input.materials)}[/dim]")

    validator = ConstraintValidator(auto_correct=not no_auto_correct)
    if not quiet:
        console.print("[dim]🔍 进行数据校验...[/dim]")
    validation = validator.validate(lp_input)

    if validation.needs_review:
        console.print(f"[yellow]⚠️  发现 {len(validation.needs_review)} 个需要人工确认的问题[/yellow]")
        for issue in validation.needs_review[:5]:
            console.print(f"  • {issue.category}: {issue.message}")
        if len(validation.needs_review) > 5:
            console.print(f"  • ... 还有 {len(validation.needs_review) - 5} 个问题")

    if validation.corrected and not quiet:
        console.print(f"[green]✓ 自动修正了 {len(validation.corrected)} 个问题[/green]")

    solver = LPSolver(time_limit=time_limit)
    if not quiet:
        console.print("[dim]🧮 求解线性规划模型...[/dim]")

    lp_output = solver.solve(lp_input)

    if lp_output.status == SolutionStatus.OPTIMAL:
        if not quiet:
            console.print(f"[green]✅ 求解完成，最优利润: {lp_output.total_profit:,.2f}[/green]")
    elif lp_output.status == SolutionStatus.INFEASIBLE:
        console.print("[red]❌ 模型不可行，约束之间存在冲突[/red]")
    elif lp_output.status == SolutionStatus.UNBOUNDED:
        console.print("[red]❌ 模型无界，目标函数可以无限增大[/red]")
    else:
        console.print(f"[red]❌ 求解失败: {lp_output.status}[/red]")

    for msg in lp_output.messages:
        if "不可行" in msg or "无界" in msg or "异常" in msg:
            console.print(f"[red]  • {msg}[/red]")
        elif "退化" in msg:
            console.print(f"[yellow]  • {msg}[/yellow]")
        else:
            console.print(f"[dim]  • {msg}[/dim]")

    if lp_output.is_degenerate:
        console.print("[yellow]⚠️  检测到退化解，影子价格解释需谨慎[/yellow]")

    report = ""
    if not no_report:
        if not quiet:
            console.print("[dim]📝 生成详细报告...[/dim]")
        report_gen = ReportGenerator(show_details=True)
        report = report_gen.generate(lp_input, lp_output, validation)

    if not quiet:
        console.print("[dim]💾 保存计算结果...[/dim]")
    run_id = storage.save_run(lp_input, lp_output, validation, report)

    if not quiet:
        _print_summary_table(lp_output)

    console.print(f"\n[bold green]✓ 计算完成！Run ID: {run_id}[/bold green]")
    console.print(f"  输出目录: {output_dir}/runs/{run_id}")
    if report:
        console.print(f"  报告文件: {output_dir}/runs/{run_id}/report.md")

    if lp_output.status != SolutionStatus.OPTIMAL:
        sys.exit(2)


@main.command("list")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False), help="输出目录")
@click.option("--limit", "-n", default=10, type=int, help="显示最近N次运行")
def list_runs(output_dir: str, limit: int):
    """列出历史运行记录"""

    storage = VersionedStorage(output_dir=output_dir)
    runs = storage.list_runs(limit=limit)

    if not runs:
        console.print("[yellow]暂无运行记录[/yellow]")
        return

    table = Table(title=f"最近 {len(runs)} 次运行记录", show_lines=True)
    table.add_column("Run ID", style="cyan")
    table.add_column("版本", style="blue")
    table.add_column("状态", style="bold")
    table.add_column("总利润", justify="right", style="green")
    table.add_column("问题数", justify="right")
    table.add_column("求解时间", justify="right")
    table.add_column("创建时间", style="dim")

    status_styles = {
        "optimal": "green",
        "infeasible": "red",
        "unbounded": "red",
        "error": "red",
    }

    for run in runs:
        status = run["status"]
        status_style = status_styles.get(status, "yellow")
        status_text = {
            "optimal": "✅ 最优",
            "infeasible": "❌ 不可行",
            "unbounded": "❌ 无界",
            "error": "❌ 错误",
        }.get(status, status)

        table.add_row(
            run["run_id"],
            run["version"],
            Text(status_text, style=status_style),
            f"{run['total_profit']:,.2f}" if status == "optimal" else "-",
            str(run["issues_count"]),
            f"{run['solve_time']:.3f}s",
            run["created_at"][:19].replace("T", " "),
        )

    console.print(table)


@main.command()
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False), help="输出目录")
@click.argument("run_id")
def show(output_dir: str, run_id: str):
    """查看指定运行的详细结果"""

    storage = VersionedStorage(output_dir=output_dir)

    try:
        run_data = storage.load_run(run_id)
    except FileNotFoundError:
        console.print(f"[red]❌ 未找到运行记录: {run_id}[/red]")
        sys.exit(1)

    lp_input = run_data.get("input")
    lp_output = run_data.get("output")
    validation = run_data.get("validation")
    report = run_data.get("report")

    if not lp_output:
        console.print("[yellow]该运行没有输出数据[/yellow]")
        return

    console.print(Panel.fit(
        f"[bold]Run ID:[/bold] {run_id}\n"
        f"[bold]版本:[/bold] {lp_input.version if lp_input else 'N/A'}\n"
        f"[bold]状态:[/bold] {lp_output.status.value}\n"
        f"[bold]总利润:[/bold] {lp_output.total_profit:,.2f}\n"
        f"[bold]求解时间:[/bold] {lp_output.solve_time:.3f}s",
        title="运行摘要",
        border_style="cyan",
    ))

    if lp_output.status == SolutionStatus.OPTIMAL and lp_output.products:
        table = Table(title="生产方案", show_lines=False)
        table.add_column("产品", style="cyan")
        table.add_column("产量", justify="right")
        table.add_column("单位")
        table.add_column("利润贡献", justify="right", style="green")
        table.add_column("检验成本", justify="right")

        for pr in sorted(lp_output.products, key=lambda x: x.profit_contribution, reverse=True):
            table.add_row(
                pr.product_name,
                f"{pr.production_amount:.2f}",
                pr.unit,
                f"{pr.profit_contribution:,.2f}",
                f"{pr.reduced_cost:.4f}",
            )
        console.print(table)

    if lp_output.shadow_prices:
        table = Table(title="影子价格", show_lines=False)
        table.add_column("约束", style="cyan")
        table.add_column("影子价格", justify="right")
        table.add_column("当前值", justify="right")
        table.add_column("单位")

        for sp in sorted(lp_output.shadow_prices, key=lambda x: x.shadow_price, reverse=True):
            style = "green" if sp.shadow_price > 0 else "dim"
            table.add_row(
                sp.constraint_name,
                Text(f"{sp.shadow_price:.4f}", style=style),
                f"{sp.current_rhs:.2f}",
                sp.unit,
            )
        console.print(table)

    if validation and validation.issues:
        console.print(f"\n[yellow]⚠️  校验问题 ({len(validation.issues)} 个)[/yellow]")
        for issue in validation.issues:
            icon = {"needs_human_review": "🔴", "corrected": "🟡", "unprocessed": "⚪"}.get(issue.type, "•")
            console.print(f"  {icon} [{issue.category}] {issue.message}")

    if report:
        console.print(f"\n[dim]📝 完整报告已保存，可查看: {output_dir}/runs/{run_id}/report.md[/dim]")


@main.command()
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False), help="输出目录")
@click.option("--name", default="sample", help="示例名称")
def init_sample(output_dir: str, name: str):
    """生成示例输入数据文件"""

    sample_data = {
        "version": "v1.0",
        "description": "示例：工厂生产计划优化",
        "products": [
            {"id": "P1", "name": "产品A", "profit_per_unit": 50, "unit": "piece", "description": "高端产品"},
            {"id": "P2", "name": "产品B", "profit_per_unit": 30, "unit": "piece", "description": "中端产品"},
            {"id": "P3", "name": "产品C", "profit_per_unit": 20, "unit": "piece", "description": "基础产品"},
        ],
        "materials": [
            {"id": "M1", "name": "原料甲", "unit": "kg", "available": 1000, "description": "主要原料"},
            {"id": "M2", "name": "原料乙", "unit": "kg", "available": 800, "description": "辅助原料"},
        ],
        "material_usage": {
            "P1": [{"material_id": "M1", "amount_per_unit": 2.0}, {"material_id": "M2", "amount_per_unit": 1.0}],
            "P2": [{"material_id": "M1", "amount_per_unit": 1.0}, {"material_id": "M2", "amount_per_unit": 1.5}],
            "P3": [{"material_id": "M1", "amount_per_unit": 0.5}, {"material_id": "M2", "amount_per_unit": 0.5}],
        },
        "capacity_constraints": [
            {
                "id": "C1",
                "name": "生产线1",
                "max_capacity": 500,
                "unit": "hour",
                "usage_per_unit": {"P1": 2.0, "P2": 1.0, "P3": 0.5},
                "description": "组装线产能",
            },
            {
                "id": "C2",
                "name": "生产线2",
                "max_capacity": 400,
                "unit": "hour",
                "usage_per_unit": {"P1": 1.0, "P2": 2.0, "P3": 1.0},
                "description": "测试线产能",
            },
        ],
        "order_demands": [
            {"product_id": "P1", "min_demand": 50, "max_demand": 200, "description": "固定订单"},
            {"product_id": "P2", "min_demand": 100, "max_demand": None, "description": "最低需求"},
            {"product_id": "P3", "min_demand": 0, "max_demand": 300, "description": "按需生产"},
        ],
        "sources": [
            {"name": "销售部", "file": "订单需求.xlsx", "sheet": "Q2", "note": "2024年Q2预测"},
            {"name": "采购部", "file": "原料库存.csv", "note": "当前可用库存"},
            {"name": "生产部", "file": "产能表.xlsx", "note": "设备额定产能"},
        ],
        "corrections": [],
    }

    out_path = Path(output_dir) / f"{name}_input.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(sample_data, f, ensure_ascii=False, indent=2)

    console.print(f"[green]✅ 示例数据已生成: {out_path}[/green]")
    console.print(f"  使用命令: lp-shadow solve -i {out_path} -o {output_dir}/results")


def _print_summary_table(lp_output):
    if lp_output.status != SolutionStatus.OPTIMAL:
        return

    table = Table(title="计算结果摘要", show_header=True, show_lines=False)
    table.add_column("指标", style="cyan")
    table.add_column("数值", justify="right", style="bold")

    table.add_row("总利润", f"{lp_output.total_profit:,.2f}")
    table.add_row("求解时间", f"{lp_output.solve_time:.3f} 秒")
    table.add_row("生产产品数", str(sum(1 for p in lp_output.products if p.production_amount > 0)))
    table.add_row("瓶颈资源数", str(sum(1 for sp in lp_output.shadow_prices if sp.shadow_price > 0.01)))

    console.print(table)


if __name__ == "__main__":
    main()
