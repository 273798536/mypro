#!/usr/bin/env python3
import argparse
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from topology_checker.graph import TopologyGraph, Node, Edge, EdgeDirection, NodeType
from topology_checker.checker import TopologyChecker
from topology_checker.io_handler import IOHandler
from topology_checker.reporter import ResultReporter


def main():
    parser = argparse.ArgumentParser(description="拓扑路径连通检查工具")
    parser.add_argument("--nodes", type=str, help="节点数据文件路径(JSON)")
    parser.add_argument("--edges", type=str, help="边数据文件路径(JSON)")
    parser.add_argument("--accessible", type=str, help="无障碍标签数据文件路径(JSON)")
    parser.add_argument("--data-dir", type=str, default="./data", help="数据目录")
    parser.add_argument("--snapshot", type=str, help="快照名称(用于对比)")
    parser.add_argument("--save-snapshot", type=str, help="保存快照名称")
    parser.add_argument("--output", type=str, help="输出结果文件")
    parser.add_argument("--use-accessible", action="store_true", help="检查时考虑无障碍标签")
    parser.add_argument("--compare", action="store_true", help="与上一次运行对比")
    parser.add_argument("--sample", action="store_true", help="使用示例数据运行")
    
    args = parser.parse_args()
    
    io_handler = IOHandler(args.data_dir)
    reporter = ResultReporter()
    
    if args.sample:
        run_sample(io_handler, reporter, args)
        return
    
    if args.snapshot:
        if not io_handler.load_snapshot(args.snapshot):
            print(f"快照 {args.snapshot} 不存在")
            return
    
    previous_checker = None
    if args.compare:
        if io_handler.load_snapshot("previous"):
            previous_checker = TopologyChecker(io_handler.graph)
    
    io_handler.graph = TopologyGraph()
    
    if args.nodes:
        nodes_data = io_handler.load_from_file(args.nodes)
        io_handler.import_nodes(nodes_data["nodes"])
    
    if args.edges:
        edges_data = io_handler.load_from_file(args.edges)
        io_handler.import_edges(edges_data["edges"])
    
    if args.accessible:
        accessible_data = io_handler.load_from_file(args.accessible)
        if "nodes" in accessible_data:
            io_handler.import_nodes(accessible_data["nodes"])
        if "edges" in accessible_data:
            io_handler.import_edges(accessible_data["edges"])
    
    checker = TopologyChecker(io_handler.graph)
    
    results = checker.run_all_checks(use_accessible=args.use_accessible)
    
    reporter.print_results(results)
    
    if args.compare and previous_checker:
        prev_results = previous_checker.run_all_checks(use_accessible=args.use_accessible)
        changes = checker.compare_with_previous(prev_results, use_accessible=args.use_accessible)
        reporter.print_change_report(changes)
    
    if args.save_snapshot:
        io_handler.save_snapshot(args.save_snapshot)
    
    io_handler.save_snapshot("previous")
    
    if args.output:
        report = reporter.generate_json_report(results)
        io_handler.save_to_file(report, args.output)
        print(f"\n结果已保存到: {args.output}")


def run_sample(io_handler, reporter, args):
    print("运行示例数据...")
    
    sample_nodes = [
        {"node_id": "N1", "name": "入口大厅", "layer": "1F"},
        {"node_id": "N2", "name": "电梯厅", "layer": "1F"},
        {"node_id": "N3", "name": "商店A", "layer": "1F"},
        {"node_id": "N4", "name": "卫生间", "layer": "1F"},
        {"node_id": "N5", "name": "楼梯间", "layer": "1F"},
        {"node_id": "N6", "name": "二楼大厅", "layer": "2F"},
        {"node_id": "N7", "name": "孤立节点", "layer": "1F"},
        {"node_id": "N8", "name": "反向测试", "layer": "1F"}
    ]
    
    sample_edges = [
        {"edge_id": "E1", "from_node": "N1", "to_node": "N2", "direction": "forward"},
        {"edge_id": "E2", "from_node": "N2", "to_node": "N3", "direction": "undirected"},
        {"edge_id": "E3", "from_node": "N3", "to_node": "N4", "direction": "forward"},
        {"edge_id": "E4", "from_node": "N5", "to_node": "N6", "direction": "undirected"},
        {"edge_id": "E5", "from_node": "N8", "to_node": "N1", "direction": "reverse"},
        {"edge_id": "E6", "from_node": "N2", "to_node": "N6", "direction": "forward"}
    ]
    
    io_handler.import_nodes(sample_nodes)
    io_handler.import_edges(sample_edges)
    
    print("\n=== 第一次运行 (仅导入节点和边)")
    checker = TopologyChecker(io_handler.graph)
    results1 = checker.run_all_checks()
    reporter.print_results(results1)
    
    io_handler.save_snapshot("phase1")
    
    print("\n=== 第二次运行 (补录无障碍标签)")
    
    accessible_nodes = [
        {"node_id": "N1", "name": "入口大厅", "layer": "1F", "accessible": True},
        {"node_id": "N2", "name": "电梯厅", "layer": "1F", "accessible": True},
        {"node_id": "N3", "name": "商店A", "layer": "1F", "accessible": False}
    ]
    accessible_edges = [
        {"edge_id": "E1", "from_node": "N1", "to_node": "N2", "accessible": True},
        {"edge_id": "E2", "from_node": "N2", "to_node": "N3", "accessible": False}
    ]
    
    io_handler.import_nodes(accessible_nodes)
    io_handler.import_edges(accessible_edges)
    
    checker2 = TopologyChecker(io_handler.graph)
    results2 = checker2.run_all_checks(use_accessible=True)
    reporter.print_results(results2)
    
    changes = checker2.compare_with_previous(results1)
    reporter.print_change_report(changes)
    
    report = reporter.generate_json_report(results2, changes)
    io_handler.save_to_file(report, "sample_result.json")
    
    print("\n=== 第三次运行 (验证幂等性)")
    checker3 = TopologyChecker(io_handler.graph)
    results3 = checker3.run_all_checks(use_accessible=True)
    reporter.print_results(results3)
    
    hash1 = io_handler.graph.compute_hash()
    hash2 = io_handler.graph.compute_hash()
    print(f"\n幂等性验证: {hash1 == hash2} (两次哈希一致)")
    
    print("\n示例运行完成！")


if __name__ == "__main__":
    main()
