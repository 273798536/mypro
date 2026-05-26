import click
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .config import Config
from .parser import StatementParser
from .mapping_manager import MappingManager
from .adjustment_manager import AdjustmentManager
from .rule_engine import RuleEngine
from .report_generator import ReportGenerator
from .models import Anomaly, Severity, RunHistory

console = Console()


@click.group()
@click.version_option()
def main():
    """财报勾稽检查CLI工具 - 自动验证财务报表勾稽关系"""
    pass


@main.command()
@click.option("--input-dir", "-i", required=True, type=click.Path(exists=True, file_okay=False), help="输入目录路径")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False), help="输出目录路径")
@click.option("--config", "-c", type=click.Path(exists=True, dir_okay=False), help="配置文件路径")
@click.option("--apply-adjustments/--no-apply-adjustments", default=True, help="是否应用调整分录")
@click.option("--verbose", "-v", is_flag=True, help="显示详细信息")
def check(input_dir, output_dir, config, apply_adjustments, verbose):
    """执行财报勾稽检查"""
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + str(uuid.uuid4())[:8]
    
    console.print(Panel.fit(
        Text(f"财报勾稽检查 - 运行ID: {run_id}", style="bold blue"),
        border_style="blue",
    ))
    
    console.print(f"[dim]输入目录: {input_dir}[/dim]")
    console.print(f"[dim]输出目录: {output_dir}[/dim]")
    console.print()

    try:
        cfg = Config(config)
        parser = StatementParser(cfg)
        
        with console.status("[bold green]正在解析财务报表..."):
            data = parser.parse_all(input_dir)
        
        balance_sheet = data["balance_sheet"]
        income_statement = data["income_statement"]
        cash_flow = data["cash_flow"]
        mappings = data["account_mapping"]
        adjustments = data["adjustments"]

        if not balance_sheet:
            console.print("[bold red]错误: 未找到或无法解析资产负债表[/bold red]")
            sys.exit(1)

        console.print("[green]✓ 报表解析完成[/green]")
        console.print(f"  资产负债表: {len(balance_sheet.accounts)} 个科目")
        if income_statement:
            console.print(f"  利润表: {len(income_statement.accounts)} 个科目")
        if cash_flow:
            console.print(f"  现金流量表: {len(cash_flow.accounts)} 个项目")
        console.print(f"  科目映射: {len(mappings)} 条")
        console.print(f"  调整分录: {len(adjustments)} 条")
        console.print()

        mapping_manager = MappingManager(mappings)
        with console.status("[bold green]正在验证科目映射..."):
            mapping_anomalies = mapping_manager.validate_mappings(
                balance_sheet, income_statement, cash_flow
            )
        
        _display_anomalies("科目映射检查", mapping_anomalies)

        adjustment_manager = AdjustmentManager(adjustments)
        with console.status("[bold green]正在验证调整分录..."):
            adjustment_anomalies = adjustment_manager.validate_adjustments(
                balance_sheet, income_statement
            )
        
        _display_anomalies("调整分录检查", adjustment_anomalies)

        if apply_adjustments and adjustments:
            with console.status("[bold green]正在应用调整分录..."):
                balance_sheet, income_statement, applied = adjustment_manager.apply_adjustments(
                    balance_sheet, income_statement
                )
            console.print(f"[green]✓ 已应用 {len(applied)} 条调整分录[/green]")
            console.print()

        with console.status("[bold green]正在应用科目映射..."):
            mapping_manager.apply_mappings(balance_sheet, income_statement, cash_flow)

        rule_engine = RuleEngine(cfg)
        with console.status("[bold green]正在执行勾稽检查..."):
            check_results = rule_engine.run_all_checks(balance_sheet, income_statement, cash_flow)

        _display_check_results(check_results)

        mapping_summary = mapping_manager.get_mapping_summary()
        adjustment_summary = adjustment_manager.get_adjustment_summary()
        rule_summary = rule_engine.get_summary()

        all_anomalies = []
        for result in check_results:
            all_anomalies.extend(result.anomalies)
        all_anomalies.extend(mapping_anomalies)
        all_anomalies.extend(adjustment_anomalies)

        report_generator = ReportGenerator(output_dir)
        
        with console.status("[bold green]正在生成报告..."):
            report_path = report_generator.generate_report(
                check_results,
                mapping_anomalies,
                adjustment_anomalies,
                mapping_summary,
                adjustment_summary,
                rule_summary,
                run_id,
                adjustment_manager.applied_adjustments,
            )
            
            if all_anomalies:
                anomaly_csv_path = report_generator.generate_anomaly_csv(all_anomalies, run_id)
            
            if adjustments:
                adj_csv_path = report_generator.generate_adjustment_csv(
                    adjustments, run_id, "all_adjustments"
                )
                if adjustment_manager.applied_adjustments:
                    applied_csv_path = report_generator.generate_adjustment_csv(
                        adjustment_manager.applied_adjustments, run_id, "applied_adjustments"
                    )

            history = RunHistory(
                run_id=run_id,
                timestamp=datetime.now(),
                input_dir=str(Path(input_dir).absolute()),
                output_dir=str(Path(output_dir).absolute()),
                anomalies_count={
                    "errors": sum(1 for a in all_anomalies if a.severity == Severity.ERROR),
                    "warnings": sum(1 for a in all_anomalies if a.severity == Severity.WARNING),
                    "total": len(all_anomalies),
                },
                adjustments_applied=len(adjustment_manager.applied_adjustments),
                status="completed",
            )
            report_generator.save_run_history(history)

        summary_text = report_generator.generate_summary_text(
            rule_summary, mapping_summary, adjustment_summary
        )
        console.print(Panel(summary_text, title="检查摘要", border_style="green"))

        console.print()
        console.print("[bold]输出文件:[/bold]")
        console.print(f"  检查报告: {report_path}")
        if all_anomalies:
            console.print(f"  异常列表: {anomaly_csv_path}")
        if adjustments:
            console.print(f"  调整分录: {adj_csv_path}")
            if adjustment_manager.applied_adjustments:
                console.print(f"  已应用调整: {applied_csv_path}")
        console.print()

        errors = sum(1 for a in all_anomalies if a.severity == Severity.ERROR)
        if errors > 0:
            console.print(f"[bold yellow]⚠️  检查完成，发现 {errors} 个错误，请查看报告详情[/bold yellow]")
            sys.exit(1)
        else:
            console.print("[bold green]✓ 检查完成，未发现严重错误[/bold green]")
            sys.exit(0)

    except Exception as e:
        console.print(f"[bold red]执行失败: {str(e)}[/bold red]")
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


@main.command("history")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False), help="输出目录路径")
@click.option("--limit", "-n", default=10, help="显示最近N条记录")
def show_history(output_dir, limit):
    """查看历史运行记录"""
    report_generator = ReportGenerator(output_dir)
    history = report_generator.get_run_history()

    if not history:
        console.print("[yellow]暂无历史记录[/yellow]")
        return

    history = sorted(history, key=lambda x: x["timestamp"], reverse=True)[:limit]

    table = Table(title="历史运行记录")
    table.add_column("运行ID", style="cyan")
    table.add_column("时间", style="green")
    table.add_column("输入目录", style="dim")
    table.add_column("错误", justify="right", style="red")
    table.add_column("警告", justify="right", style="yellow")
    table.add_column("调整数", justify="right")
    table.add_column("状态")

    for record in history:
        status_style = "green" if record["status"] == "completed" else "red"
        table.add_row(
            record["run_id"],
            record["timestamp"].replace("T", " "),
            record["input_dir"],
            str(record["anomalies_count"].get("errors", 0)),
            str(record["anomalies_count"].get("warnings", 0)),
            str(record["adjustments_applied"]),
            Text(record["status"], style=status_style),
        )

    console.print(table)


def _display_anomalies(title: str, anomalies: List[Anomaly]):
    if not anomalies:
        console.print(f"[green]✓ {title}: 未发现异常[/green]")
        console.print()
        return

    errors = sum(1 for a in anomalies if a.severity == Severity.ERROR)
    warnings = sum(1 for a in anomalies if a.severity == Severity.WARNING)

    console.print(f"[bold]{title}: 发现 {len(anomalies)} 个问题 ({errors} 错误, {warnings} 警告)[/bold]")
    
    for anomaly in anomalies[:5]:
        severity_style = "red" if anomaly.severity == Severity.ERROR else "yellow"
        console.print(f"  [{severity_style}]●[/{severity_style}] {anomaly.message}")
    
    if len(anomalies) > 5:
        console.print(f"  [dim]... 还有 {len(anomalies) - 5} 个问题，请查看完整报告[/dim]")
    
    console.print()


def _display_check_results(results):
    console.print("[bold]勾稽规则检查结果:[/bold]")
    
    for result in results:
        status_icon = "[green]✓[/green]" if result.passed else "[red]✗[/red]"
        console.print(f"  {status_icon} {result.rule_name}: {result.message}")
    
    console.print()


if __name__ == "__main__":
    main()
