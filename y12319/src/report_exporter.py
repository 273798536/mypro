import json
import csv
from typing import Dict, List
from pathlib import Path
from datetime import datetime
from .graph_model import TopologyGraph, IssueType
from .connectivity_audit import AuditReport


class ReportExporter:
    def __init__(self, output_dir: str = "reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def export_full_report(self, report: AuditReport, graph: TopologyGraph, 
                           format: str = "text") -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "text":
            filename = f"connectivity_audit_{timestamp}.txt"
            filepath = self.output_dir / filename
            self._export_text_report(report, graph, filepath)
        elif format == "json":
            filename = f"connectivity_audit_{timestamp}.json"
            filepath = self.output_dir / filename
            self._export_json_report(report, graph, filepath)
        elif format == "csv":
            base_name = f"connectivity_audit_{timestamp}"
            self._export_csv_reports(report, graph, base_name)
            filepath = self.output_dir / f"{base_name}_summary.csv"
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        return str(filepath)
    
    def _export_text_report(self, report: AuditReport, graph: TopologyGraph, filepath: Path):
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("拓扑路径连通审计报告\n")
            f.write("=" * 80 + "\n\n")
            
            f.write("【数据源信息】\n")
            f.write("-" * 40 + "\n")
            f.write(f"节点列表文件: {report.source_file_nodes}\n")
            f.write(f"边关系文件: {report.source_file_edges}\n")
            f.write(f"节点总数: {report.total_nodes}\n")
            f.write(f"边总数: {report.total_edges}\n\n")
            
            f.write("【节点明细】\n")
            f.write("-" * 40 + "\n")
            for node_id, node in graph.nodes.items():
                tags = ", ".join(node.tags) if node.tags else "无"
                f.write(f"  节点ID: {node_id}\n")
                f.write(f"    名称: {node.name}\n")
                f.write(f"    层级: {node.layer}\n")
                f.write(f"    标签: {tags}\n")
                f.write(f"    数据来源: 节点列表\n\n")
            
            f.write("【边关系明细】\n")
            f.write("-" * 40 + "\n")
            for edge_id, edge in graph.edges.items():
                source_node = graph.get_node(edge.source)
                target_node = graph.get_node(edge.target)
                f.write(f"  边ID: {edge_id}\n")
                f.write(f"    源节点: {edge.source} ({source_node.name if source_node else ''})\n")
                f.write(f"    目标节点: {edge.target} ({target_node.name if target_node else ''})\n")
                f.write(f"    方向: {edge.direction.value}\n")
                f.write(f"    数据来源: 边关系\n\n")
            
            f.write("【问题汇总】\n")
            f.write("-" * 40 + "\n")
            f.write(f"总问题数: {report.total_issues}\n")
            f.write(f"  - 孤立节点: {len(report.isolated_nodes)}\n")
            f.write(f"  - 跨层错连: {len(report.cross_layer_mismatches)}\n")
            f.write(f"  - 方向边反: {len(report.direction_reversals)}\n")
            f.write(f"  - 路径中断: {len(report.broken_paths)}\n\n")
            
            f.write("【孤立节点详情】\n")
            f.write("-" * 40 + "\n")
            if report.isolated_nodes:
                for issue in report.isolated_nodes:
                    f.write(f"  [警告] {issue.message}\n")
                    f.write(f"    来源: {issue.details.get('source', '未知')}\n\n")
            else:
                f.write("  无孤立节点\n\n")
            
            f.write("【跨层错连详情】\n")
            f.write("-" * 40 + "\n")
            if report.cross_layer_mismatches:
                for issue in report.cross_layer_mismatches:
                    severity = "错误" if issue.severity == "error" else "警告"
                    f.write(f"  [{severity}] {issue.message}\n")
                    f.write(f"    涉及边: {', '.join(issue.edges)}\n")
                    f.write(f"    来源: {issue.details.get('source', '未知')}\n\n")
            else:
                f.write("  无跨层错连\n\n")
            
            f.write("【方向边反详情】\n")
            f.write("-" * 40 + "\n")
            if report.direction_reversals:
                for issue in report.direction_reversals:
                    f.write(f"  [警告] {issue.message}\n")
                    f.write(f"    涉及边: {', '.join(issue.edges)}\n")
                    f.write(f"    来源: {issue.details.get('source', '未知')}\n\n")
            else:
                f.write("  无方向边反问题\n\n")
            
            f.write("【路径中断详情】\n")
            f.write("-" * 40 + "\n")
            if report.broken_paths:
                for issue in report.broken_paths:
                    f.write(f"  [错误] {issue.message}\n")
                    f.write(f"    涉及节点: {', '.join(issue.nodes)}\n")
                    f.write(f"    来源: {issue.details.get('source', '未知')}\n\n")
            else:
                f.write("  无路径中断问题\n\n")
            
            f.write("【路径连通明细】\n")
            f.write("-" * 40 + "\n")
            for idx, path_result in enumerate(report.path_results, 1):
                if path_result.path:
                    path_str = " → ".join(path_result.path)
                    status = "有问题" if path_result.has_issues else "正常"
                    f.write(f"  路径 {idx}: {path_str}\n")
                    f.write(f"    状态: {status}\n")
                    f.write(f"    途经边: {', '.join(path_result.edges)}\n")
                    f.write(f"    途经层级: {', '.join(path_result.layers)}\n")
                    f.write(f"    来源: 路径查询\n\n")
            
            f.write("【层级汇总】\n")
            f.write("-" * 40 + "\n")
            for layer, summary in report.layer_summary.items():
                f.write(f"  层级: {layer}\n")
                f.write(f"    节点数: {summary['node_count']}\n")
                f.write(f"    层内边数: {len(summary['edges_in_layer'])}\n")
                f.write(f"    跨层边数: {len(summary['edges_cross_layer'])}\n")
                f.write(f"    孤立节点数: {len(summary['isolated_nodes'])}\n")
                f.write(f"    来源: {summary['source']}\n\n")
            
            f.write("=" * 80 + "\n")
            f.write(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n")
    
    def _export_json_report(self, report: AuditReport, graph: TopologyGraph, filepath: Path):
        data = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "source_files": {
                    "nodes": report.source_file_nodes,
                    "edges": report.source_file_edges
                },
                "totals": {
                    "nodes": report.total_nodes,
                    "edges": report.total_edges,
                    "issues": report.total_issues
                }
            },
            "nodes": [
                {
                    "id": node_id,
                    "name": node.name,
                    "layer": node.layer,
                    "tags": node.tags,
                    "source": "节点列表"
                }
                for node_id, node in graph.nodes.items()
            ],
            "edges": [
                {
                    "id": edge_id,
                    "source": edge.source,
                    "target": edge.target,
                    "direction": edge.direction.value,
                    "layer": edge.layer,
                    "source_ref": "边关系"
                }
                for edge_id, edge in graph.edges.items()
            ],
            "issues": {
                "isolated_nodes": [self._issue_to_dict(i) for i in report.isolated_nodes],
                "cross_layer_mismatches": [self._issue_to_dict(i) for i in report.cross_layer_mismatches],
                "direction_reversals": [self._issue_to_dict(i) for i in report.direction_reversals],
                "broken_paths": [self._issue_to_dict(i) for i in report.broken_paths]
            },
            "paths": [
                {
                    "path": pr.path,
                    "edges": pr.edges,
                    "layers": pr.layers,
                    "has_issues": pr.has_issues,
                    "source": "路径查询"
                }
                for pr in report.path_results
            ],
            "layer_summary": report.layer_summary
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _issue_to_dict(self, issue):
        return {
            "type": issue.type.value,
            "severity": issue.severity,
            "message": issue.message,
            "nodes": issue.nodes,
            "edges": issue.edges,
            "details": issue.details
        }
    
    def _export_csv_reports(self, report: AuditReport, graph: TopologyGraph, base_name: str):
        nodes_csv = self.output_dir / f"{base_name}_nodes.csv"
        with open(nodes_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['节点ID', '名称', '层级', '标签', '数据来源'])
            for node_id, node in graph.nodes.items():
                writer.writerow([
                    node_id, node.name, node.layer, 
                    ", ".join(node.tags), "节点列表"
                ])
        
        edges_csv = self.output_dir / f"{base_name}_edges.csv"
        with open(edges_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['边ID', '源节点', '目标节点', '方向', '层级', '数据来源'])
            for edge_id, edge in graph.edges.items():
                writer.writerow([
                    edge_id, edge.source, edge.target,
                    edge.direction.value, edge.layer, "边关系"
                ])
        
        issues_csv = self.output_dir / f"{base_name}_issues.csv"
        with open(issues_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['问题类型', '严重程度', '描述', '涉及节点', '涉及边', '来源'])
            all_issues = (report.isolated_nodes + report.cross_layer_mismatches +
                          report.direction_reversals + report.broken_paths)
            for issue in all_issues:
                writer.writerow([
                    issue.type.value, issue.severity, issue.message,
                    ", ".join(issue.nodes), ", ".join(issue.edges),
                    issue.details.get('source', '未知')
                ])
        
        summary_csv = self.output_dir / f"{base_name}_summary.csv"
        with open(summary_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['统计项', '数量', '详情文件'])
            writer.writerow(['节点总数', report.total_nodes, f"{base_name}_nodes.csv"])
            writer.writerow(['边总数', report.total_edges, f"{base_name}_edges.csv"])
            writer.writerow(['孤立节点', len(report.isolated_nodes), f"{base_name}_issues.csv"])
            writer.writerow(['跨层错连', len(report.cross_layer_mismatches), f"{base_name}_issues.csv"])
            writer.writerow(['方向边反', len(report.direction_reversals), f"{base_name}_issues.csv"])
            writer.writerow(['路径中断', len(report.broken_paths), f"{base_name}_issues.csv"])
