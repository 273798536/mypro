import typer
from pathlib import Path
from typing import Optional
from rich.console import Console
from rich.table import Table
from .config import RunConfig
from .version_manager import VersionManager
from .importer import MaterialImporter
from .analyzer import RegressionAnalyzer
from .reporter import ReportGenerator
from . import __version__

app = typer.Typer(
    help="SQL注入规则回归分析工具 - SRE值班专用",
    add_completion=False,
)
console = Console()


def _print_version(value: bool):
    if value:
        console.print(f"[bold blue]SQL注入规则回归工具 v{__version__}[/bold blue]")
        raise typer.Exit()


@app.callback()
def main(
    version: Optional[bool] = typer.Option(
        None, "--version", "-v", callback=_print_version, is_eager=True,
        help="显示版本号"
    ),
):
    pass


@app.command("run", help="运行完整的SQL注入规则回归分析")
def run_analysis(
    input_dir: Path = typer.Option(..., "--input", "-i", help="输入材料目录", exists=True, file_okay=False),
    output_dir: Path = typer.Option(..., "--output", "-o", help="输出报告目录", file_okay=False),
    case_id: Optional[str] = typer.Option(None, "--case", "-c", help="案例ID，用于追踪"),
    force_reimport: bool = typer.Option(False, "--force", help="强制重新导入所有材料"),
):
    config = RunConfig(
        input_dir=input_dir,
        output_dir=output_dir,
        case_id=case_id,
        force_reimport=force_reimport,
    )

    output_dir.mkdir(parents=True, exist_ok=True)

    console.rule("[bold blue]SQL 注入规则回归分析[/bold blue]")

    with console.status("[bold green]初始化版本管理器..."):
        version_manager = VersionManager(config)
        version_manager.ensure_dirs()

    with console.status("[bold green]导入材料（幂等模式）..."):
        importer = MaterialImporter(config, version_manager)
        materials = importer.import_all()

    if not materials:
        console.print("[yellow]没有可分析的材料，跳过分析[/yellow]")
        return

    with console.status("[bold green]分析慢查询归因与回滚记录..."):
        analyzer = RegressionAnalyzer(config, version_manager)
        report_data = analyzer.analyze(materials)

    with console.status("[bold green]生成报告..."):
        reporter = ReportGenerator(config, version_manager)
        report_path = reporter.generate(report_data)

    _print_summary(report_data, report_path)


@app.command("list-versions", help="查看已导入的材料版本历史")
def list_versions(
    output_dir: Path = typer.Option(..., "--output", "-o", help="工作目录", file_okay=False),
):
    config = RunConfig(input_dir=Path("."), output_dir=output_dir)
    version_manager = VersionManager(config)

    versions = version_manager.list_all_versions()

    table = Table(title="材料版本历史", show_lines=True)
    table.add_column("版本ID", style="cyan")
    table.add_column("文件", style="white")
    table.add_column("类型", style="magenta")
    table.add_column("导入时间", style="green")
    table.add_column("哈希", style="dim")

    for v in versions:
        table.add_row(
            v.version_id,
            v.file_name,
            v.material_type.value,
            v.imported_at.strftime("%Y-%m-%d %H:%M:%S"),
            v.material_hash[:16] + "...",
        )

    console.print(table)


@app.command("show-material", help="查看指定版本材料的原始内容")
def show_material(
    output_dir: Path = typer.Option(..., "--output", "-o", help="工作目录", file_okay=False),
    version_id: str = typer.Argument(..., help="材料版本ID"),
):
    config = RunConfig(input_dir=Path("."), output_dir=output_dir)
    version_manager = VersionManager(config)

    material = version_manager.get_material_content(version_id)
    if not material:
        console.print(f"[red]未找到版本ID: {version_id}[/red]")
        raise typer.Exit(code=1)

    console.rule(f"[bold]材料内容 - {version_id}[/bold]")
    console.print(material)


def _print_summary(report_data, report_path: Path):
    summary = report_data.summary

    console.rule("[bold green]分析完成[/bold green]")

    table = Table(title="分析结果概览", show_header=False)
    table.add_column("指标", style="cyan")
    table.add_column("数量", justify="right", style="bold")

    table.add_row("慢查询分析", str(summary.slow_queries_analyzed))
    table.add_row("回滚记录", str(summary.rollbacks_found))
    table.add_row("索引建议", str(summary.index_suggestions_count))
    table.add_row("迁移脚本", str(summary.migrations_reviewed))
    table.add_row("", "")
    table.add_row("[green]✓ 可直接使用[/green]", f"[green]{summary.safe_to_use_count}[/green]")
    table.add_row("[yellow]⚠ 需SRE复核[/yellow]", f"[yellow]{summary.needs_sre_review_count}[/yellow]")
    table.add_row("总计", str(summary.total_findings))

    console.print(table)
    console.print(f"\n[bold]报告已生成:[/bold] {report_path}")
    console.print("[dim]提示: 报告中所有结论都可溯源到原始材料，点击链接可跳转[/dim]")


if __name__ == "__main__":
    app()
