from __future__ import annotations

import json
import logging
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from rich.console import Console, Group
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .auditor import AuditFinding, PathAuditResult, PathAuditor
from .graph import GraphData

logger = logging.getLogger(__name__)

console = Console()


class ReportGenerator:
    def __init__(self, graph_data: GraphData, auditor: PathAuditor):
        self.graph_data = graph_data
        self.auditor = auditor

    def _finding_to_dict(self, finding: AuditFinding) -> Dict[str, Any]:
        return {
            "type": finding.type,
            "severity": finding.severity,
            "message": finding.message,
            "edge": finding.edge,
            "node": finding.node,
            "details": finding.details
        }

    def _path_result_to_dict(self, result) -> Dict[str, Any]:
        return {
            "source": result.source,
            "target": result.target,
            "path": result.path,
            "path_str": result.path_str,
            "total_weight": result.total_weight,
            "edge_count": result.edge_count,
            "is_valid": result.is_valid,
            "error_message": result.error_message,
            "algorithm": result.algorithm,
            "has_negative_cycle": result.has_negative_cycle,
            "negative_cycle_path": result.negative_cycle_path,
            "has_isolated_nodes": result.has_isolated_nodes,
            "used_forbidden_edges": [
                {
                    "source": e.source,
                    "target": e.target,
                    "weight": e.weight,
                    "forbidden_reason": e.forbidden_reason,
                    "source_file": e.source
                }
                for e in result.used_forbidden_edges
            ]
        }

    def _audit_result_to_dict(self, audit_result: PathAuditResult) -> Dict[str, Any]:
        edge_explanations = self.auditor.generate_edge_explanation(audit_result)

        return {
            "query": {
                "source": audit_result.query[0],
                "target": audit_result.query[1]
            },
            "baseline_result": self._path_result_to_dict(audit_result.baseline_result),
            "audit_findings": [self._finding_to_dict(f) for f in audit_result.audit_findings],
            "edge_sensitivity": audit_result.edge_sensitivity,
            "edge_explanations": edge_explanations,
            "forbidden_comparison": {
                "path_changed": audit_result.forbidden_comparison.get("path_changed", False),
                "weight_diff": audit_result.forbidden_comparison.get("weight_diff"),
                "forbidden_edges_used": [
                    f"{e.source}->{e.target}"
                    for e in audit_result.forbidden_comparison.get("forbidden_edges_used", [])
                ],
                "path_with_forbidden": self._path_result_to_dict(
                    audit_result.forbidden_comparison["with_forbidden"]
                ) if audit_result.forbidden_comparison else None,
                "path_without_forbidden": self._path_result_to_dict(
                    audit_result.forbidden_comparison["without_forbidden"]
                ) if audit_result.forbidden_comparison else None
            } if audit_result.forbidden_comparison else None,
            "has_critical_issues": audit_result.has_critical_issues,
            "has_warnings": audit_result.has_warnings
        }

    def generate_json_report(self, audit_results: List[PathAuditResult],
                             output_file: str,
                             parse_issues: Optional[List[Dict[str, Any]]] = None) -> str:
        global_summary = self.auditor.get_global_audit_summary()

        report = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "version": "0.1.0"
            },
            "graph_summary": global_summary,
            "parse_issues": parse_issues or [],
            "audit_results": [self._audit_result_to_dict(r) for r in audit_results],
            "summary": {
                "total_queries": len(audit_results),
                "successful_queries": sum(1 for r in audit_results if r.baseline_result.is_valid),
                "failed_queries": sum(1 for r in audit_results if not r.baseline_result.is_valid),
                "queries_with_critical_issues": sum(1 for r in audit_results if r.has_critical_issues),
                "queries_with_warnings": sum(1 for r in audit_results if r.has_warnings)
            }
        }

        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        return str(output_path)

    def generate_csv_reports(self, audit_results: List[PathAuditResult],
                             output_dir: str) -> Dict[str, str]:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        paths_data = []
        findings_data = []
        edges_data = []

        for audit_result in audit_results:
            source, target = audit_result.query
            baseline = audit_result.baseline_result

            paths_data.append({
                "source": source,
                "target": target,
                "path": baseline.path_str,
                "total_weight": baseline.total_weight,
                "edge_count": baseline.edge_count,
                "is_valid": baseline.is_valid,
                "algorithm": baseline.algorithm,
                "error_message": baseline.error_message,
                "has_critical_issues": audit_result.has_critical_issues,
                "has_warnings": audit_result.has_warnings
            })

            for finding in audit_result.audit_findings:
                findings_data.append({
                    "source": source,
                    "target": target,
                    "finding_type": finding.type,
                    "severity": finding.severity,
                    "message": finding.message,
                    "edge": finding.edge,
                    "node": finding.node
                })

            edge_explanations = self.auditor.generate_edge_explanation(audit_result)
            for expl in edge_explanations:
                edges_data.append({
                    "source": source,
                    "target": target,
                    "edge_index": expl["index"],
                    "edge": expl["edge"],
                    "weight": expl["weight"],
                    "cumulative_weight": expl["cumulative_weight"],
                    "is_forbidden": expl["is_forbidden"],
                    "is_negative": expl["is_negative"],
                    "source_file": expl["source_file"],
                    "forbidden_reason": expl["forbidden_reason"]
                })

        files = {}
        if paths_data:
            paths_df = pd.DataFrame(paths_data)
            paths_file = output_path / "paths.csv"
            paths_df.to_csv(paths_file, index=False, encoding="utf-8-sig")
            files["paths"] = str(paths_file)

        if findings_data:
            findings_df = pd.DataFrame(findings_data)
            findings_file = output_path / "findings.csv"
            findings_df.to_csv(findings_file, index=False, encoding="utf-8-sig")
            files["findings"] = str(findings_file)

        if edges_data:
            edges_df = pd.DataFrame(edges_data)
            edges_file = output_path / "edges_detail.csv"
            edges_df.to_csv(edges_file, index=False, encoding="utf-8-sig")
            files["edges_detail"] = str(edges_file)

        return files

    def print_console_summary(self, audit_results: List[PathAuditResult],
                              parse_issues: Optional[List[Dict[str, Any]]] = None):
        console.print("\n")
        console.print(Panel.fit(
            "[bold blue]图论最短路审计报告[/bold blue]",
            border_style="blue"
        ))

        global_summary = self.auditor.get_global_audit_summary()
        summary_table = Table(title="图数据概览", show_header=True, header_style="bold")
        summary_table.add_column("指标", style="cyan")
        summary_table.add_column("数值", style="green")
        summary_table.add_row("总节点数", str(global_summary["total_nodes"]))
        summary_table.add_row("总边数", str(global_summary["total_edges"]))
        summary_table.add_row("禁行边数", str(global_summary["forbidden_edges"]))
        summary_table.add_row("弱连通分量", str(global_summary["connected_components"]))
        summary_table.add_row("负权边数", str(len(global_summary["negative_edges"])))
        summary_table.add_row("孤立节点数", str(len(global_summary["isolated_nodes"])))
        console.print(summary_table)

        if parse_issues:
            issue_table = Table(title="数据解析问题", show_header=True, header_style="bold")
            issue_table.add_column("类型", style="cyan")
            issue_table.add_column("严重程度", style="yellow")
            issue_table.add_column("消息", style="white")
            for issue in parse_issues:
                severity_color = {
                    "error": "red",
                    "warning": "yellow",
                    "info": "blue"
                }.get(issue.get("severity", "info"), "white")
                issue_table.add_row(
                    issue.get("type", "unknown"),
                    f"[{severity_color}]{issue.get('severity', 'info')}[/{severity_color}]",
                    issue.get("message", "")
                )
            console.print(issue_table)

        result_summary = Table(title="查询结果汇总", show_header=True, header_style="bold")
        result_summary.add_column("指标", style="cyan")
        result_summary.add_column("数量", style="green")
        result_summary.add_row("总查询数", str(len(audit_results)))
        result_summary.add_row("成功查询", str(sum(1 for r in audit_results if r.baseline_result.is_valid)))
        result_summary.add_row("失败查询", str(sum(1 for r in audit_results if not r.baseline_result.is_valid)))
        result_summary.add_row("含严重问题", str(sum(1 for r in audit_results if r.has_critical_issues)))
        result_summary.add_row("含警告", str(sum(1 for r in audit_results if r.has_warnings)))
        console.print(result_summary)

        for i, audit_result in enumerate(audit_results, 1):
            source, target = audit_result.query
            baseline = audit_result.baseline_result

            status_color = "green" if baseline.is_valid else "red"
            status_text = "✓ 有效" if baseline.is_valid else "✗ 无效"

            title = Text()
            title.append(f"查询 {i}: ", style="bold")
            title.append(f"{source} → {target}", style="cyan")
            title.append(f" [{status_color}]{status_text}[/{status_color}]")

            panel_content = []

            if baseline.is_valid:
                panel_content.append(f"[bold]路径:[/bold] {baseline.path_str}")
                panel_content.append(f"[bold]总权重:[/bold] {baseline.total_weight:.4f}")
                panel_content.append(f"[bold]边数:[/bold] {baseline.edge_count}")
                panel_content.append(f"[bold]算法:[/bold] {baseline.algorithm}")

                edge_explanations = self.auditor.generate_edge_explanation(audit_result)
                if edge_explanations:
                    edge_table = Table(show_header=True, header_style="bold", title="路径边详情")
                    edge_table.add_column("#", style="dim", justify="right")
                    edge_table.add_column("边", style="cyan")
                    edge_table.add_column("权重", justify="right")
                    edge_table.add_column("累计", justify="right")
                    edge_table.add_column("状态")
                    for expl in edge_explanations:
                        status = []
                        if expl["is_forbidden"]:
                            status.append("[red]禁行[/red]")
                        if expl["is_negative"]:
                            status.append("[yellow]负权[/yellow]")
                        status_str = " ".join(status) if status else "[green]正常[/green]"
                        edge_table.add_row(
                            str(expl["index"] + 1),
                            expl["edge"],
                            f"{expl['weight']:.4f}",
                            f"{expl['cumulative_weight']:.4f}",
                            status_str
                        )
                    panel_content.append("")
                    panel_content.append(edge_table)
            else:
                panel_content.append(f"[bold red]错误:[/bold red] {baseline.error_message}")
                if baseline.has_negative_cycle:
                    cycle_path = " -> ".join(baseline.negative_cycle_path)
                    panel_content.append(f"[yellow]负权环:[/yellow] {cycle_path}")

            if audit_result.audit_findings:
                critical = [f for f in audit_result.audit_findings if f.severity == "critical"]
                warnings = [f for f in audit_result.audit_findings if f.severity == "warning"]
                info = [f for f in audit_result.audit_findings if f.severity == "info"]

                if critical:
                    panel_content.append("")
                    panel_content.append("[bold red]严重问题:[/bold red]")
                    for f in critical:
                        panel_content.append(f"  [red]•[/red] {f.message}")

                if warnings:
                    panel_content.append("")
                    panel_content.append("[bold yellow]警告:[/bold yellow]")
                    for f in warnings:
                        panel_content.append(f"  [yellow]•[/yellow] {f.message}")

                if info:
                    panel_content.append("")
                    panel_content.append("[bold blue]提示:[/bold blue]")
                    for f in info:
                        panel_content.append(f"  [blue]•[/blue] {f.message}")

            console.print(Panel.fit(
                Group(*panel_content),
                title=title,
                border_style="blue"
            ))

        console.print("\n")
