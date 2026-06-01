#!/usr/bin/env python3
import argparse
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.graph_model import TopologyGraph
from src.connectivity_audit import ConnectivityAuditor
from src.report_exporter import ReportExporter
from src.change_detector import ChangeDetector


def print_text_report(report, graph):
    print("\n" + "=" * 80)
    print("拓扑路径连通审计报告")
    print("=" * 80 + "\n")
    
    print("【数据源信息】")
    print("-" * 40)
    print(f"节点列表文件: {report.source_file_nodes}")
    print(f"边关系文件: {report.source_file_edges}")
    print(f"节点总数: {report.total_nodes}")
    print(f"边总数: {report.total_edges}\n")
    
    print("【问题汇总】")
    print("-" * 40)
    print(f"总问题数: {report.total_issues}")
    print(f"  - 孤立节点: {len(report.isolated_nodes)}")
    print(f"  - 跨层错连: {len(report.cross_layer_mismatches)}")
    print(f"  - 方向边反: {len(report.direction_reversals)}")
    print(f"  - 路径中断: {len(report.broken_paths)}\n")
    
    if report.isolated_nodes:
        print("【孤立节点详情】")
        print("-" * 40)
        for issue in report.isolated_nodes:
            print(f"  [警告] {issue.message}")
            print(f"    来源: {issue.details.get('source', '未知')}\n")
    
    if report.cross_layer_mismatches:
        print("【跨层错连详情】")
        print("-" * 40)
        for issue in report.cross_layer_mismatches:
            severity = "错误" if issue.severity == "error" else "警告"
            print(f"  [{severity}] {issue.message}")
            print(f"    涉及边: {', '.join(issue.edges)}")
            print(f"    来源: {issue.details.get('source', '未知')}\n")
    
    if report.direction_reversals:
        print("【方向边反详情】")
        print("-" * 40)
        for issue in report.direction_reversals:
            print(f"  [警告] {issue.message}")
            print(f"    涉及边: {', '.join(issue.edges)}")
            print(f"    来源: {issue.details.get('source', '未知')}\n")
    
    if report.broken_paths:
        print("【路径中断详情】")
        print("-" * 40)
        for issue in report.broken_paths:
            print(f"  [错误] {issue.message}")
            print(f"    涉及节点: {', '.join(issue.nodes)}")
            print(f"    来源: {issue.details.get('source', '未知')}\n")
    
    print("【正常路径明细】")
    print("-" * 40)
    normal_count = 0
    for idx, path_result in enumerate(report.path_results, 1):
        if path_result.path and not path_result.has_issues:
            normal_count += 1
            path_str = " → ".join(path_result.path)
            print(f"  路径 {normal_count}: {path_str}")
            print(f"    途经边: {', '.join(path_result.edges)}")
            print(f"    途经层级: {', '.join(path_result.layers)}")
            print(f"    来源: 路径查询\n")
    if normal_count == 0:
        print("  无正常连通路径\n")
    
    print("=" * 80)


def run_audit(args):
    if not os.path.exists(args.nodes):
        print(f"错误: 节点文件不存在: {args.nodes}")
        sys.exit(1)
    if not os.path.exists(args.edges):
        print(f"错误: 边文件不存在: {args.edges}")
        sys.exit(1)
    
    graph = TopologyGraph()
    node_count = graph.load_nodes_from_csv(args.nodes)
    edge_count = graph.load_edges_from_csv(args.edges)
    
    print(f"已加载 {node_count} 个节点, {edge_count} 条边")
    
    auditor = ConnectivityAuditor(graph)
    layer_order = args.layer_order.split(',') if args.layer_order else None
    
    report = auditor.run_full_audit(layer_order=layer_order)
    report.source_file_nodes = args.nodes
    report.source_file_edges = args.edges
    
    print_text_report(report, graph)
    
    if args.export:
        exporter = ReportExporter(args.output_dir)
        filepath = exporter.export_full_report(report, graph, args.export_format)
        print(f"报告已导出到: {filepath}")
    
    if report.total_issues > 0 and args.strict:
        sys.exit(1)


def run_compare(args):
    if not os.path.exists(args.old_nodes) or not os.path.exists(args.old_edges):
        print("错误: 旧版本文件不存在")
        sys.exit(1)
    if not os.path.exists(args.new_nodes) or not os.path.exists(args.new_edges):
        print("错误: 新版本文件不存在")
        sys.exit(1)
    
    old_graph = TopologyGraph()
    old_graph.load_nodes_from_csv(args.old_nodes)
    old_graph.load_edges_from_csv(args.old_edges)
    
    new_graph = TopologyGraph()
    new_graph.load_nodes_from_csv(args.new_nodes)
    new_graph.load_edges_from_csv(args.new_edges)
    
    old_auditor = ConnectivityAuditor(old_graph)
    old_report = old_auditor.run_full_audit()
    
    new_auditor = ConnectivityAuditor(new_graph)
    new_report = new_auditor.run_full_audit()
    
    detector = ChangeDetector(old_graph, new_graph)
    change_report = detector.compare_graphs(old_report, new_report)
    
    print("\n" + "=" * 80)
    print("变更对比报告")
    print("=" * 80 + "\n")
    
    print("【节点变更】")
    print("-" * 40)
    for change in change_report.node_changes:
        if change.change_type == "added":
            print(f"  [新增] 节点 {change.item_id}: {change.new_value}")
        elif change.change_type == "removed":
            print(f"  [删除] 节点 {change.item_id}: {change.old_value}")
        elif change.change_type == "modified":
            print(f"  [修改] 节点 {change.item_id}: {change.old_value} → {change.new_value}")
    if not change_report.node_changes:
        print("  无节点变更")
    print()
    
    print("【边关系变更】")
    print("-" * 40)
    for change in change_report.edge_changes:
        if change.change_type == "added":
            print(f"  [新增] 边 {change.item_id}: {change.new_value}")
        elif change.change_type == "removed":
            print(f"  [删除] 边 {change.item_id}: {change.old_value}")
        elif change.change_type == "modified":
            print(f"  [修改] 边 {change.item_id}: {change.old_value} → {change.new_value}")
    if not change_report.edge_changes:
        print("  无边关系变更")
    print()
    
    print("【断点检测】")
    print("-" * 40)
    for bp in change_report.breakpoints:
        print(f"  [断点] {bp['message']}")
        print(f"    来源: {bp.get('source', '未知')}")
    if not change_report.breakpoints:
        print("  未检测到断点")
    print()
    
    print("【问题变更】")
    print("-" * 40)
    for change in change_report.issue_changes:
        if change.change_type == "resolved":
            print(f"  [已修复] {change.old_value}")
        elif change.change_type == "introduced":
            print(f"  [新问题] {change.new_value}")
    if not change_report.issue_changes:
        print("  无问题变更")
    print()
    
    print("【路径变更】")
    print("-" * 40)
    for pc in change_report.path_changes:
        if pc['change_type'] == 'path_lost':
            print(f"  [路径断开] {pc['message']}")
        elif pc['change_type'] == 'path_created':
            print(f"  [路径创建] {pc['message']}")
        elif pc['change_type'] == 'path_modified':
            print(f"  [路径变化] {pc['message']}")
            print(f"    旧路径: {' → '.join(pc['old_path'])}")
            print(f"    新路径: {' → '.join(pc['new_path'])}")
    if not change_report.path_changes:
        print("  无路径变更")
    print()
    
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(description="拓扑路径连通审计工具")
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    audit_parser = subparsers.add_parser("audit", help="执行连通性审计")
    audit_parser.add_argument("--nodes", required=True, help="节点CSV文件路径")
    audit_parser.add_argument("--edges", required=True, help="边CSV文件路径")
    audit_parser.add_argument("--layer-order", help="层级顺序,逗号分隔")
    audit_parser.add_argument("--export", action="store_true", help="导出报告")
    audit_parser.add_argument("--export-format", choices=["text", "json", "csv"], 
                            default="text", help="导出格式")
    audit_parser.add_argument("--output-dir", default="reports", help="输出目录")
    audit_parser.add_argument("--strict", action="store_true", help="发现问题时返回非0退出码")
    
    compare_parser = subparsers.add_parser("compare", help="对比两个版本的差异")
    compare_parser.add_argument("--old-nodes", required=True, help="旧版本节点文件")
    compare_parser.add_argument("--old-edges", required=True, help="旧版本边文件")
    compare_parser.add_argument("--new-nodes", required=True, help="新版本节点文件")
    compare_parser.add_argument("--new-edges", required=True, help="新版本边文件")
    
    args = parser.parse_args()
    
    if args.command == "audit":
        run_audit(args)
    elif args.command == "compare":
        run_compare(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
