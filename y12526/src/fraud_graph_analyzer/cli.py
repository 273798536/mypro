"""命令行接口"""

import argparse
import json
import sys
from pathlib import Path


def run_demo_command(args):
    """运行演示命令"""
    from .main import FraudGraphAnalysisTool
    
    tool = FraudGraphAnalysisTool()
    results = tool.quick_start_demo()
    
    if args.export:
        output_path = Path("output") / "demo_results.json"
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n结果已导出到: {output_path}")


def run_analysis_command(args):
    """运行分析命令"""
    from .main import FraudGraphAnalysisTool
    
    tool = FraudGraphAnalysisTool()
    tool._load_sample_data()
    
    start_nodes = args.nodes.split(",") if args.nodes else None
    results = tool.run_full_analysis(
        start_node_ids=start_nodes,
        tag_version=args.tag_version,
    )
    
    print(json.dumps(results, ensure_ascii=False, indent=2))


def check_address_command(args):
    """检查地址边命令"""
    from .main import FraudGraphAnalysisTool
    
    tool = FraudGraphAnalysisTool()
    tool._load_sample_data()
    
    if args.account:
        suggestions = tool.address_checker.get_actionable_suggestions(args.account)
        print(json.dumps(suggestions, ensure_ascii=False, indent=2))
    else:
        batch = tool.address_checker.get_batch_suggestions(
            limit=args.limit,
            priority_filter=args.priority,
        )
        print(json.dumps(batch, ensure_ascii=False, indent=2))


def generate_graph_command(args):
    """生成网络图命令"""
    from .main import FraudGraphAnalysisTool
    
    tool = FraudGraphAnalysisTool()
    tool._load_sample_data()
    
    node_ids = args.nodes.split(",") if args.nodes else None
    context = tool.analyzer.create_analysis_context(node_ids=node_ids)
    
    graph_path = tool.analyzer.generate_network_graph(context)
    print(f"网络图已生成: {graph_path}")


def export_command(args):
    """导出数据命令"""
    from .main import FraudGraphAnalysisTool
    
    tool = FraudGraphAnalysisTool()
    tool._load_sample_data()
    
    node_ids = args.nodes.split(",") if args.nodes else None
    context = tool.analyzer.create_analysis_context(node_ids=node_ids)
    
    if args.format == "csv":
        paths = tool.analyzer.export_to_csv(context)
        print("CSV文件已导出:")
        for key, path in paths.items():
            if path:
                print(f"  {key}: {path}")
    elif args.format == "json":
        path = tool.analyzer.export_to_json(context)
        print(f"JSON文件已导出: {path}")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="图论社群欺诈筛查分析工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python -m fraud_graph_analyzer.cli demo
  python -m fraud_graph_analyzer.cli analyze --nodes acc_001,acc_002
  python -m fraud_graph_analyzer.cli address --account acc_001
  python -m fraud_graph_analyzer.cli graph --nodes acc_001
  python -m fraud_graph_analyzer.cli export --format csv
        """,
    )
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    demo_parser = subparsers.add_parser("demo", help="运行演示")
    demo_parser.add_argument("--export", action="store_true", help="导出结果到JSON")
    demo_parser.set_defaults(func=run_demo_command)
    
    analysis_parser = subparsers.add_parser("analyze", help="运行完整分析")
    analysis_parser.add_argument("--nodes", type=str, help="起始节点ID，逗号分隔")
    analysis_parser.add_argument("--tag-version", type=str, default="v1.0", help="标签版本")
    analysis_parser.set_defaults(func=run_analysis_command)
    
    address_parser = subparsers.add_parser("address", help="检查地址边问题")
    address_parser.add_argument("--account", type=str, help="指定账户ID")
    address_parser.add_argument("--limit", type=int, default=20, help="批量建议数量限制")
    address_parser.add_argument("--priority", type=str, choices=["high", "medium", "low"], help="优先级过滤")
    address_parser.set_defaults(func=check_address_command)
    
    graph_parser = subparsers.add_parser("graph", help="生成网络图")
    graph_parser.add_argument("--nodes", type=str, help="节点ID，逗号分隔")
    graph_parser.set_defaults(func=generate_graph_command)
    
    export_parser = subparsers.add_parser("export", help="导出数据")
    export_parser.add_argument("--format", type=str, choices=["csv", "json"], default="csv", help="导出格式")
    export_parser.add_argument("--nodes", type=str, help="节点ID，逗号分隔")
    export_parser.set_defaults(func=export_command)
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        sys.exit(0)
    
    args.func(args)


if __name__ == "__main__":
    main()
