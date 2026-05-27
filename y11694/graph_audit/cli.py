from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Optional

import click
from rich.console import Console

from .auditor import PathAuditor
from .graph import GraphParser
from .report import ReportGenerator

console = Console()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@click.group()
@click.version_option()
def cli():
    """图论最短路审计CLI - 物流线路数据审计工具"""
    pass


@cli.command()
@click.option("--nodes", "-n", type=click.Path(exists=True, dir_okay=False), help="节点表CSV文件路径")
@click.option("--edges", "-e", type=click.Path(exists=True, dir_okay=False), required=True, help="边表CSV文件路径")
@click.option("--forbidden", "-f", type=click.Path(exists=True, dir_okay=False), help="禁行边表CSV文件路径")
@click.option("--source", "-s", type=str, help="起点节点ID")
@click.option("--target", "-t", type=str, help="终点节点ID")
@click.option("--query-file", "-q", type=click.Path(exists=True, dir_okay=False), help="批量查询CSV文件路径")
@click.option("--output-json", "-j", type=click.Path(dir_okay=False), help="输出JSON报告文件路径")
@click.option("--output-csv", "-c", type=click.Path(file_okay=False), help="输出CSV报告目录路径")
@click.option("--no-sensitivity", is_flag=True, help="跳过边敏感度分析（加快速度）")
@click.option("--no-forbidden-check", is_flag=True, help="跳过禁行边对比检查")
@click.option("--algorithm", type=click.Choice(["auto", "dijkstra", "bellman-ford"]), default="auto", help="强制使用的算法")
def audit(nodes: Optional[str], edges: str, forbidden: Optional[str],
          source: Optional[str], target: Optional[str],
          query_file: Optional[str], output_json: Optional[str],
          output_csv: Optional[str], no_sensitivity: bool,
          no_forbidden_check: bool, algorithm: str):
    """执行最短路径审计"""

    if not (source and target) and not query_file:
        console.print("[red]错误: 必须指定 --source/--target 或 --query-file[/red]")
        sys.exit(1)

    if (source and target) and query_file:
        console.print("[yellow]警告: 同时指定了单点查询和批量查询，将合并执行[/yellow]")

    with console.status("[bold green]正在解析图数据..."):
        graph_data, parse_issues = GraphParser.parse_all(
            nodes_file=nodes,
            edges_file=edges,
            forbidden_file=forbidden
        )

    error_issues = [i for i in parse_issues if i.get("severity") == "error"]
    if error_issues:
        console.print(f"[red]解析错误: 发现 {len(error_issues)} 个严重问题[/red]")
        for issue in error_issues[:5]:
            console.print(f"  [red]•[/red] {issue['message']}")
        if len(error_issues) > 5:
            console.print(f"  ...还有 {len(error_issues) - 5} 个错误")

    auditor = PathAuditor(graph_data)
    reporter = ReportGenerator(graph_data, auditor)

    queries = []
    if source and target:
        queries.append((source, target))
    if query_file:
        file_queries, file_issues = GraphParser.parse_queries(query_file)
        parse_issues.extend(file_issues)
        queries.extend(file_queries)

    console.print(f"[green]✓ 已加载 {len(graph_data.nodes)} 个节点, {len(graph_data.edges)} 条边[/green]")
    if graph_data.forbidden_edges:
        console.print(f"[yellow]⚠ 已加载 {len(graph_data.forbidden_edges)} 条禁行边[/yellow]")
    console.print(f"[cyan]→ 执行 {len(queries)} 个查询...[/cyan]")

    audit_results = []
    with console.status("[bold green]正在执行路径审计..."):
        for i, (s, t) in enumerate(queries, 1):
            console.print(f"  正在处理查询 {i}/{len(queries)}: {s} → {t}")
            result = auditor.audit_path(
                s, t,
                do_sensitivity=not no_sensitivity,
                check_forbidden=not no_forbidden_check
            )
            audit_results.append(result)

    reporter.print_console_summary(audit_results, parse_issues)

    if output_json:
        with console.status(f"[bold green]正在生成JSON报告: {output_json}"):
            json_path = reporter.generate_json_report(audit_results, output_json, parse_issues)
        console.print(f"[green]✓ JSON报告已保存: {json_path}[/green]")

    if output_csv:
        with console.status(f"[bold green]正在生成CSV报告: {output_csv}"):
            csv_files = reporter.generate_csv_reports(audit_results, output_csv)
        console.print("[green]✓ CSV报告已保存:[/green]")
        for name, path in csv_files.items():
            console.print(f"  - {name}: {path}")

    critical_count = sum(1 for r in audit_results if r.has_critical_issues)
    warning_count = sum(1 for r in audit_results if r.has_warnings)
    failed_count = sum(1 for r in audit_results if not r.baseline_result.is_valid)

    if critical_count > 0:
        console.print(f"\n[red]⚠ 发现 {critical_count} 个查询存在严重问题，请仔细检查报告[/red]")
    if failed_count > 0:
        console.print(f"[yellow]⚠ 有 {failed_count} 个查询无法计算路径[/yellow]")

    console.print("\n[green]✓ 审计完成[/green]")


@cli.command()
@click.option("--output-dir", "-o", type=click.Path(file_okay=False), default="examples", help="输出目录")
@click.option("--with-issues/--no-issues", default=True, help="是否生成包含异常的数据")
def generate_sample(output_dir: str, with_issues: bool):
    """生成示例数据文件"""
    import csv
    import random

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    nodes = [f"N{i:02d}" for i in range(1, 11)]

    edges = [
        ("N01", "N02", 5.0),
        ("N01", "N03", 3.0),
        ("N02", "N04", 2.0),
        ("N02", "N05", 4.0),
        ("N03", "N04", 1.0),
        ("N03", "N06", 6.0),
        ("N04", "N05", 1.0),
        ("N04", "N07", 3.0),
        ("N05", "N08", 2.0),
        ("N06", "N07", 2.0),
        ("N07", "N08", 1.0),
        ("N07", "N09", 4.0),
        ("N08", "N10", 3.0),
        ("N09", "N10", 2.0),
    ]

    if with_issues:
        edges.extend([
            ("N04", "N02", -1.0),
            ("N05", "N03", -2.0),
        ])

    nodes_file = output_path / "nodes.csv"
    with open(nodes_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["node_id", "name", "type"])
        for node in nodes:
            writer.writerow([node, f"节点{node[1:]}", random.choice(["仓库", "配送点", "中转站"])])
    console.print(f"[green]✓ 已生成节点表: {nodes_file}[/green]")

    edges_file = output_path / "edges.csv"
    with open(edges_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["source", "target", "weight", "road_type", "distance_km"])
        for u, v, w in edges:
            writer.writerow([u, v, w, random.choice(["高速", "国道", "省道"]), abs(w) * 10])
    console.print(f"[green]✓ 已生成边表: {edges_file}[/green]")

    forbidden = [
        ("N02", "N05", "道路施工"),
        ("N07", "N09", "交通管制"),
    ]
    forbidden_file = output_path / "forbidden.csv"
    with open(forbidden_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["source", "target", "reason"])
        for u, v, reason in forbidden:
            writer.writerow([u, v, reason])
    console.print(f"[green]✓ 已生成禁行边表: {forbidden_file}[/green]")

    queries = [
        ("N01", "N10"),
        ("N01", "N08"),
        ("N03", "N10"),
        ("N02", "N09"),
        ("N01", "N05"),
    ]
    queries_file = output_path / "queries.csv"
    with open(queries_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["source", "target"])
        for s, t in queries:
            writer.writerow([s, t])
    console.print(f"[green]✓ 已生成查询表: {queries_file}[/green]")

    if with_issues:
        dirty_edges = list(edges)
        dirty_edges.append(("N02", "N04", -5.0))
        dirty_edges.append(("N04", "N02", -3.0))

        dirty_edges_file = output_path / "edges_dirty.csv"
        with open(dirty_edges_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["source", "target", "weight", "road_type", "distance_km"])
            for u, v, w in dirty_edges:
                writer.writerow([u, v, w, random.choice(["高速", "国道", "省道"]), abs(w) * 10])
        console.print(f"[yellow]✓ 已生成含负权环的脏数据: {dirty_edges_file}[/yellow]")

    console.print(f"\n[cyan]示例数据已生成到: {output_path}[/cyan]")
    console.print("\n[bold]快速开始:[/bold]")
    console.print(f"  graph-audit audit -n {nodes_file} -e {edges_file} -f {forbidden_file} -q {queries_file}")
    console.print(f"  graph-audit audit -n {nodes_file} -e {edges_file} -s N01 -t N10 --output-json report.json")


@cli.command()
@click.option("--nodes", "-n", type=click.Path(exists=True, dir_okay=False), help="节点表CSV文件路径")
@click.option("--edges", "-e", type=click.Path(exists=True, dir_okay=False), required=True, help="边表CSV文件路径")
@click.option("--forbidden", "-f", type=click.Path(exists=True, dir_okay=False), help="禁行边表CSV文件路径")
def validate(nodes: Optional[str], edges: str, forbidden: Optional[str]):
    """验证图数据并显示统计信息"""

    with console.status("[bold green]正在解析图数据..."):
        graph_data, parse_issues = GraphParser.parse_all(
            nodes_file=nodes,
            edges_file=edges,
            forbidden_file=forbidden
        )

    from .auditor import PathAuditor
    auditor = PathAuditor(graph_data)
    summary = auditor.get_global_audit_summary()

    console.print("\n[bold blue]=== 图数据验证报告 ===[/bold blue]\n")

    console.print("[bold]基础统计:[/bold]")
    console.print(f"  节点数: {summary['total_nodes']}")
    console.print(f"  边数: {summary['total_edges']}")
    console.print(f"  禁行边数: {summary['forbidden_edges']}")
    console.print(f"  弱连通分量数: {summary['connected_components']}")

    if summary["negative_edges"]:
        console.print(f"\n[yellow]⚠ 检测到 {len(summary['negative_edges'])} 条负权边:[/yellow]")
        for edge in summary["negative_edges"][:10]:
            console.print(f"  - {edge}")
        if len(summary["negative_edges"]) > 10:
            console.print(f"  ...还有 {len(summary['negative_edges']) - 10} 条")

    if summary["isolated_nodes"]:
        console.print(f"\n[yellow]⚠ 检测到 {len(summary['isolated_nodes'])} 个孤立节点:[/yellow]")
        for node in summary["isolated_nodes"][:10]:
            console.print(f"  - {node}")
        if len(summary["isolated_nodes"]) > 10:
            console.print(f"  ...还有 {len(summary['isolated_nodes']) - 10} 个")

    if summary["edges_with_missing_nodes"]:
        console.print(f"\n[red]✗ 检测到 {len(summary['edges_with_missing_nodes'])} 条边引用不存在的节点:[/red]")
        for edge in summary["edges_with_missing_nodes"][:10]:
            console.print(f"  - {edge}")
        if len(summary["edges_with_missing_nodes"]) > 10:
            console.print(f"  ...还有 {len(summary['edges_with_missing_nodes']) - 10} 条")

    if summary["duplicate_edges"]:
        console.print(f"\n[yellow]⚠ 检测到 {len(summary['duplicate_edges'])} 条重复边:[/yellow]")
        for edge in summary["duplicate_edges"][:10]:
            console.print(f"  - {edge}")
        if len(summary["duplicate_edges"]) > 10:
            console.print(f"  ...还有 {len(summary['duplicate_edges']) - 10} 条")

    if parse_issues:
        console.print(f"\n[yellow]⚠ 解析问题 ({len(parse_issues)}):[/yellow]")
        for issue in parse_issues[:10]:
            console.print(f"  [{issue.get('severity', 'info')}] {issue.get('message', '')}")

    if not any([
        summary["negative_edges"],
        summary["isolated_nodes"],
        summary["edges_with_missing_nodes"],
        summary["duplicate_edges"],
        parse_issues
    ]):
        console.print("\n[green]✓ 图数据验证通过，未发现问题[/green]")


def main():
    cli()


if __name__ == "__main__":
    main()
