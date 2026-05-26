from __future__ import annotations

from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from .engine import AuditEngine
from .loader import DataLoader
from .models import AuditResult, FindingStatus
from .report import ReportGenerator
from .scorer import RiskScorer

console = Console()


def _print_summary(result: AuditResult):
    table = Table(title="数据概览", show_header=True, header_style="bold cyan")
    table.add_column("类别", style="dim")
    table.add_column("数量", justify="right")
    table.add_row("报销单", str(len(result.reimbursements)))
    table.add_row("票据", str(len(result.invoices)))
    table.add_row("借款记录", str(len(result.loans)))
    table.add_row("项目", str(len(result.projects)))
    table.add_row("审批人", str(len(result.approvers)))
    table.add_row("已有抽检报告", str(len(result.spot_check_reports)))
    table.add_row("审计发现", str(len(result.findings)))
    console.print(table)

    # 风险分数
    score = result.risk_score
    color = "green" if score < 20 else ("yellow" if score < 50 else "red")
    console.print(f"\n风险分数: [bold {color}]{score}/100[/bold {color}]")

    # 状态分布
    groups = ReportGenerator.group_by_status(result.findings)
    dist = Table(title="问题分布", show_header=True, header_style="bold magenta")
    dist.add_column("状态")
    dist.add_column("数量", justify="right")
    dist.add_row("未处理", str(len(groups.get(FindingStatus.UNHANDLED, []))), style="red")
    dist.add_row("已修正", str(len(groups.get(FindingStatus.CORRECTED, []))), style="green")
    dist.add_row("需人工确认", str(len(groups.get(FindingStatus.MANUAL_REVIEW, []))), style="yellow")
    console.print(dist)


@click.group()
def main():
    """备用金报销抽检 CLI - 规则扫描 / 风险打分 / 报告输出"""


@main.command()
@click.argument("data_dir", type=click.Path(exists=True, file_okay=False))
@click.option("--output-dir", "-o", default="output", type=click.Path(), help="报告输出目录")
@click.option("--sample-size", "-s", default=5, type=int, help="抽检样本数量")
@click.option("--format", "-f", "fmt", default="text", type=click.Choice(["text", "json", "both"]), help="报告格式")
def run(data_dir: str, output_dir: str, sample_size: int, fmt: str):
    """加载样例数据 → 规则扫描 → 风险打分 → 生成报告"""
    data_dir_path = Path(data_dir)

    # 1. 加载
    console.print(f"[bold]加载数据目录:[/bold] {data_dir_path}")
    loader = DataLoader(data_dir_path)
    load_result = loader.load()

    if load_result.errors:
        console.print(f"\n[yellow]⚠ 加载时有 {len(load_result.errors)} 条错误:[/yellow]")
        for err in load_result.errors[:5]:
            console.print(f"  - {err.source}: {err.message}")
        if len(load_result.errors) > 5:
            console.print(f"  ... 还有 {len(load_result.errors) - 5} 条")

    if load_result.corrections:
        console.print(f"\n[dim]已自动修正 {len(load_result.corrections)} 处字段:[/dim]")
        for c in load_result.corrections[:3]:
            console.print(f"  - {c.source} {c.field_name}: {c.original_value} → {c.corrected_value} ({c.reason})")

    # 2. 组装 AuditResult
    result = AuditResult(
        reimbursements=load_result.reimbursements,
        invoices=load_result.invoices,
        loans=load_result.loans,
        projects=load_result.projects,
        approvers=load_result.approvers,
        spot_check_reports=load_result.spot_check_reports,
        findings=[],
    )

    # 3. 审计引擎
    console.print("\n[bold]执行规则扫描...[/bold]")
    engine = AuditEngine()
    result = engine.run(result)
    console.print(f"  ✓ 发现 {len(result.findings)} 项问题")

    # 4. 概览
    _print_summary(result)

    # 5. 抽检样本
    scorer = RiskScorer()
    report_gen = ReportGenerator(output_dir)
    samples = report_gen.select_sample(result, sample_size=sample_size)
    if samples:
        console.print(f"\n[bold]抽检样本 ({len(samples)}):[/bold]")
        for i, rid in enumerate(samples, 1):
            console.print(f"  {i}. {rid}")

    # 6. 问题明细（按严重程度）
    console.print("\n[bold]问题明细:[/bold]")
    detail = Table(show_header=True, header_style="bold")
    detail.add_column("#", style="dim", width=4)
    detail.add_column("严重度")
    detail.add_column("规则")
    detail.add_column("描述")
    detail.add_column("状态")
    detail.add_column("来源")

    for i, f in enumerate(result.findings, 1):
        sev_color = {
            "严重": "red",
            "高": "bright_red",
            "中": "yellow",
            "低": "green",
        }.get(f.severity.value, "white")
        status_color = {
            "未处理": "red",
            "已修正": "green",
            "需人工确认": "yellow",
        }.get(f.status.value, "white")
        sources_str = "; ".join(str(s) for s in f.sources[:2])
        if len(f.sources) > 2:
            sources_str += f" ...(+{len(f.sources) - 2})"
        detail.add_row(
            str(i),
            f"[{sev_color}]{f.severity.value}[/{sev_color}]",
            f.rule_name,
            f.description[:50] + ("..." if len(f.description) > 50 else ""),
            f"[{status_color}]{f.status.value}[/{status_color}]",
            sources_str,
        )
    console.print(detail)

    # 7. 生成报告
    saved = {}
    if fmt in ("text", "both"):
        text_content = report_gen.generate_text(result)
        output_dir_path = Path(output_dir)
        output_dir_path.mkdir(parents=True, exist_ok=True)
        text_path = output_dir_path / "audit_report.txt"
        text_path.write_text(text_content, encoding="utf-8")
        saved["text"] = text_path
        console.print(f"\n[green]✓ 文本报告已保存:[/green] {text_path}")

    if fmt in ("json", "both"):
        json_content = report_gen.generate_json(result)
        output_dir_path = Path(output_dir)
        output_dir_path.mkdir(parents=True, exist_ok=True)
        json_path = output_dir_path / "audit_report.json"
        json_path.write_text(json_content, encoding="utf-8")
        saved["json"] = json_path
        console.print(f"[green]✓ JSON报告已保存:[/green] {json_path}")

    # 8. 退出码：有严重问题则非零
    has_critical = any(f.status == FindingStatus.UNHANDLED for f in result.findings)
    if has_critical:
        console.print("\n[red]⚠ 存在未处理的问题，请及时跟进。[/red]")
        raise SystemExit(1)
    else:
        console.print("\n[green]✓ 所有问题已处理或标记为已修正。[/green]")


@main.command()
def list_rules():
    """查看当前可用的规则列表"""
    from .rules import DEFAULT_RULES

    table = Table(title="可用规则", show_header=True, header_style="bold cyan")
    table.add_column("规则ID")
    table.add_column("规则名称")
    for rule in DEFAULT_RULES:
        table.add_row(rule.rule_id, rule.rule_name)
    console.print(table)
    console.print(f"\n共 {len(DEFAULT_RULES)} 条规则")


@main.command()
@click.argument("data_dir", type=click.Path(exists=True, file_okay=False))
def validate(data_dir: str):
    """仅验证数据加载是否成功，不运行审计"""
    loader = DataLoader(Path(data_dir))
    result = loader.load()

    console.print(f"报销单: {len(result.reimbursements)}")
    console.print(f"票据: {len(result.invoices)}")
    console.print(f"借款: {len(result.loans)}")
    console.print(f"项目: {len(result.projects)}")
    console.print(f"审批人: {len(result.approvers)}")
    console.print(f"抽检报告: {len(result.spot_check_reports)}")

    if result.errors:
        console.print(f"\n[red]错误 ({len(result.errors)}):[/red]")
        for e in result.errors:
            console.print(f"  - {e.source}: {e.message}")
        raise SystemExit(1)
    else:
        console.print("\n[green]✓ 所有数据加载成功[/green]")


if __name__ == "__main__":
    main()
