#!/usr/bin/env python3
import argparse
import sys
import os
import json
from typing import Optional, List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from campus_navigation.core import NavigationService
from campus_navigation.reports import ReportGenerator, SVGExporter
from campus_navigation.utils import SampleDataGenerator
from campus_navigation.models import AccessibilityProfile


def cmd_generate_sample(args):
    print("正在生成示例数据...")
    generator = SampleDataGenerator()
    output_dir = args.output_dir or "data"
    files = generator.save_sample_data(output_dir)

    print(f"\n✓ 示例数据已生成到: {output_dir}/")
    for name, path in files.items():
        print(f"  - {name}: {os.path.basename(path)}")

    graph = generator.generate_campus_data()
    print(f"\n数据统计:")
    print(f"  节点数: {len(graph.nodes)}")
    print(f"  边数: {len(graph.edges)}")
    print(f"  围挡数: {len(graph.barriers)}")
    print(f"  无障碍问题数: {len(graph.accessibility_issues)}")
    print(f"  人工修改记录: {len(graph.edit_trail.edits)}")

    return 0


def cmd_validate(args):
    print("正在验证数据...")
    service = NavigationService()
    load_report = service.load_graph(args.data_file)

    print(f"\n数据加载报告:")
    print(f"  错误: {load_report['error_count']} 个")
    print(f"  警告: {load_report['warning_count']} 个")

    if load_report["errors"]:
        print(f"\n加载错误明细:")
        for err in load_report["errors"]:
            print(f"  ✗ {err['type']}: {err['message']}")

    if load_report["warnings"]:
        print(f"\n加载警告明细:")
        for warn in load_report["warnings"]:
            print(f"  ⚠ {warn['type']}: {warn['message']}")

    validation = service.validate_data()
    summary = validation["summary"]

    print(f"\n数据验证结果:")
    print(f"  边方向错误: {summary['total_direction_errors']} 个")
    print(f"    高危: {summary['high_severity_direction_errors']} 个")
    print(f"  围挡问题: {summary['total_barrier_issues']} 个")
    print(f"    已过期: {summary['total_expired_barriers']} 个")
    print(f"  无障碍断点: {summary['total_accessibility_breakpoints']} 个")
    print(f"    严重(≥4): {summary['high_severity_accessibility_issues']} 个")
    print(f"  数据不一致: {summary['total_data_inconsistencies']} 个")
    print(f"  总计问题: {summary['total_issues']} 个")

    print(f"\n【边方向错误】明细:")
    for i, err in enumerate(validation["direction_errors"], 1):
        severity = "高危" if err.get("severity") == "high" else "中危" if err.get("severity") == "medium" else "低危"
        print(f"  {i}. [{severity}] {err['edge_id']}: {err['message']}")
        if err.get("source_file"):
            print(f"     来源: {err['source_file']}:{err.get('source_line', '?')}")

    print(f"\n【围挡问题】明细:")
    for i, barrier in enumerate(validation["expired_barriers"], 1):
        print(f"  {i}. {barrier['barrier_id']}: {barrier['message']}")
        if barrier.get("source_file"):
            print(f"     来源: {barrier['source_file']}:{barrier.get('source_line', '?')}")

    print(f"\n【无障碍断点】明细:")
    for i, issue in enumerate(validation["accessibility_breakpoints"], 1):
        print(f"  {i}. {issue['issue_id']} (严重度{issue.get('severity', '?')}): {issue['message']}")
        if issue.get("source_file"):
            print(f"     来源: {issue['source_file']}:{issue.get('source_line', '?')}")

    if args.output_json:
        with open(args.output_json, "w", encoding="utf-8") as f:
            json.dump(validation, f, ensure_ascii=False, indent=2)
        print(f"\n✓ 验证报告已保存到: {args.output_json}")

    return 0 if summary["total_issues"] == 0 else 1


def cmd_navigate(args):
    print(f"正在计算路线: {args.start} → {args.end}")
    service = NavigationService()
    service.load_graph(args.data_file)

    profile = None
    if args.wheelchair or args.accessible:
        profile = AccessibilityProfile(
            requires_wheelchair=args.wheelchair,
            requires_ramp=args.wheelchair,
            avoids_stairs=args.wheelchair,
            preferred_tags=["wheelchair", "ramp"] if args.wheelchair else [],
        )
        print(f"无障碍模式: {'轮椅' if args.wheelchair else '通用'}")

    result = service.find_route(args.start, args.end, profile)

    reporter = ReportGenerator(service)
    cli_text = reporter.generate_cli_text(result, show_traces=args.show_traces)
    print("\n" + cli_text)

    output_dir = args.output_dir or "output"
    os.makedirs(output_dir, exist_ok=True)

    base_name = f"route_{result.request_id}"
    cli_report_path = os.path.join(output_dir, f"{base_name}_report.txt")
    json_report_path = os.path.join(output_dir, f"{base_name}_report.json")
    svg_map_path = os.path.join(output_dir, f"{base_name}_map.svg")

    reporter.save_cli_report(result, cli_report_path, show_traces=args.show_traces)
    print(f"✓ CLI报告已保存: {cli_report_path}")

    reporter.save_json_report(result, json_report_path, include_traces=args.show_traces)
    print(f"✓ JSON报告已保存: {json_report_path}")

    exporter = SVGExporter(service.graph)
    svg_result = exporter.export_map(
        svg_map_path,
        result=result,
        show_accessibility=True,
        show_barriers=True,
        show_manual_edits=True,
    )
    print(f"✓ SVG地图已保存: {svg_map_path}")
    print(f"✓ 坐标对应关系: {svg_result['correspondence_file']}")

    if args.trace_node:
        print(f"\n【节点溯源】 {args.trace_node}:")
        traces = service.trace_node_to_result(args.trace_node, result)
        for i, trace in enumerate(traces, 1):
            print(f"  {i}. {trace.source_type}({trace.source_id}) → {trace.target_type}({trace.target_id})")
            print(f"     关系: {trace.relationship}")
            if trace.metadata:
                print(f"     元数据: {trace.metadata}")

    if args.trace_edge:
        print(f"\n【边溯源】 {args.trace_edge}:")
        trace = service.trace_edge_to_result(args.trace_edge, result)
        if trace:
            print(f"  {trace.source_type}({trace.source_id}) → {trace.target_type}({trace.target_id})")
            print(f"  关系: {trace.relationship}")
            if trace.metadata:
                print(f"  元数据: {trace.metadata}")
        else:
            print(f"  该边未在导航路线中使用")

    if args.verify:
        print(f"\n【一致性校验】:")
        consistency = service.verify_consistency(result)
        print(f"  报告总距离: {consistency['result_total_distance']:.2f}m")
        print(f"  实际边长度和: {consistency['total_actual_distance']:.2f}m")
        print(f"  匹配: {'✓ 是' if consistency['total_distance_match'] else '✗ 否'}")
        if consistency["inconsistencies"]:
            print(f"  不一致项:")
            for inc in consistency["inconsistencies"]:
                print(f"    - {inc['edge_id']}: 报告{inc['reported_length']} ≠ 实际{inc['actual_length']}")

    return 0 if result.status.value != "no_path" else 1


def cmd_trace(args):
    print(f"正在执行溯源查询...")
    service = NavigationService()
    service.load_graph(args.data_file)

    if not os.path.exists(args.result_file):
        print(f"✗ 结果文件不存在: {args.result_file}")
        return 1

    with open(args.result_file, "r", encoding="utf-8") as f:
        result_data = json.load(f)

    from campus_navigation.models import NavigationResult, RouteStatus, RouteSegment, TraceEntry

    class TempResult:
        def __init__(self, data):
            self.request_id = data["navigation_summary"]["request_id"]
            self.status = RouteStatus(data["navigation_summary"]["status"])
            self.start_node = data["navigation_summary"]["start_node_id"]
            self.end_node = data["navigation_summary"]["end_node_id"]
            self.total_distance = data["navigation_summary"]["total_distance_meters"]
            self.estimated_time = data["navigation_summary"]["estimated_time_minutes"] * 60
            self.node_sequence = [s["from_node_id"] for s in data["route_details"]] + [data["route_details"][-1]["to_node_id"]] if data["route_details"] else []
            self.route_segments = [RouteSegment(
                edge_id=s["edge_id"],
                from_node=s["from_node_id"],
                to_node=s["to_node_id"],
                length=s["length_meters"],
                direction=s["direction"],
                accessibility_tags=s["accessibility_tags"],
                edge_source_file=s.get("edge_source_file"),
                edge_source_line=s.get("edge_source_line"),
            ) for s in data["route_details"]]
            self.edge_length_trace = data["edge_length_trace"]
            self.trace_entries = []

    result = TempResult(result_data)

    if args.node_to_result:
        node_id = args.node_to_result
        print(f"\n【节点 → 结果】溯源: {node_id}")
        traces = service.trace_node_to_result(node_id, result)
        for i, trace in enumerate(traces, 1):
            print(f"  {i}. {trace.source_type}({trace.source_name}) → {trace.target_type}({trace.target_name})")
            print(f"     关系: {trace.relationship}")
            if trace.metadata:
                print(f"     元数据: {json.dumps(trace.metadata, ensure_ascii=False)}")

    if args.result_to_edges:
        print(f"\n【结果 → 边长度】溯源:")
        traces = service.trace_result_to_edges(result)
        for i, trace in enumerate(traces, 1):
            match = "✓" if trace.get("length_match") else "✗"
            print(f"  {i}. 边 {trace['edge_id']}: {trace['from_node_name']} → {trace['to_node_name']}")
            print(f"     报告长度: {trace['reported_length']}m, 实际长度: {trace['actual_edge_length']}m {match}")
            if trace.get("edge_source_file"):
                print(f"     来源: {trace['edge_source_file']}:{trace.get('edge_source_line', '?')}")

    if args.edge_to_result:
        edge_id = args.edge_to_result
        print(f"\n【边 → 结果】溯源: {edge_id}")
        trace = service.trace_edge_to_result(edge_id, result)
        if trace:
            print(f"  {trace.source_type}({trace.source_name}) → {trace.target_type}({trace.target_name})")
            print(f"  关系: {trace.relationship}")
            print(f"  元数据: {json.dumps(trace.metadata, ensure_ascii=False)}")
        else:
            print(f"  该边未在导航路线中使用")

    if args.verify:
        print(f"\n【双向一致性校验】:")
        print(f"  从节点查询...")
        for node_id in result.node_sequence:
            traces = service.trace_node_to_result(node_id, result)
            print(f"    {node_id}: 找到 {len(traces)} 条溯源记录")

        print(f"\n  从边查询...")
        for seg in result.route_segments:
            trace = service.trace_edge_to_result(seg.edge_id, result)
            status = "✓ 找到" if trace else "✗ 未找到"
            print(f"    {seg.edge_id}: {status}")

        print(f"\n  边长度一致性...")
        consistency = service.verify_consistency(result)
        print(f"    报告总距离: {consistency['result_total_distance']:.2f}m")
        print(f"    实际边长度和: {consistency['total_actual_distance']:.2f}m")
        print(f"    匹配: {'✓ 是' if consistency['total_distance_match'] else '✗ 否'}")
        if consistency["inconsistencies"]:
            print(f"    不一致项: {consistency['inconsistency_count']} 处")
            for inc in consistency["inconsistencies"]:
                print(f"      - {inc['edge_id']}: 差 {inc['difference']:.2f}m")

    return 0


def cmd_stats(args):
    service = NavigationService()
    service.load_graph(args.data_file)
    stats = service.get_graph_stats()

    print("=" * 60)
    print("校园导航数据统计")
    print("=" * 60)
    print(f"  节点总数: {stats['node_count']}")
    print(f"  边总数: {stats['edge_count']}")
    print(f"    双向边: {stats['bidirectional_edges']}")
    print(f"    单向(forward): {stats['forward_edges']}")
    print(f"    单向(backward): {stats['backward_edges']}")
    print(f"    无障碍通行: {stats['wheelchair_accessible_edges']}")
    print(f"  围挡总数: {stats['barrier_count']}")
    print(f"  无障碍问题: {stats['accessibility_issue_count']}")
    print(f"  人工修改记录: {stats['manual_edit_count']}")
    print("=" * 60)

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Dijkstra校园导航系统 - 校区运维版",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 生成示例数据
  python cli.py generate-sample -o data

  # 验证数据（检查边方向错、围挡过期、无障碍断点）
  python cli.py validate -d data/sample_campus.json

  # 计算导航路线
  python cli.py navigate -d data/sample_campus.json -s N001 -e N007

  # 轮椅无障碍导航
  python cli.py navigate -d data/sample_campus.json -s N001 -e N007 --wheelchair

  # 带溯源的导航
  python cli.py navigate -d data/sample_campus.json -s N001 -e N007 --trace-node N003 --verify

  # 溯源查询
  python cli.py trace -d data/sample_campus.json -r output/route_xxx_report.json --result-to-edges --verify

  # 数据统计
  python cli.py stats -d data/sample_campus.json
        """,
    )

    subparsers = parser.add_subparsers(dest="command", required=True, help="可用命令")

    parser_sample = subparsers.add_parser("generate-sample", help="生成示例数据")
    parser_sample.add_argument("-o", "--output-dir", help="输出目录 (默认: data)")
    parser_sample.set_defaults(func=cmd_generate_sample)

    parser_validate = subparsers.add_parser("validate", help="验证数据完整性和正确性")
    parser_validate.add_argument("-d", "--data-file", required=True, help="数据文件路径")
    parser_validate.add_argument("-o", "--output-json", help="输出JSON验证报告路径")
    parser_validate.set_defaults(func=cmd_validate)

    parser_nav = subparsers.add_parser("navigate", help="计算导航路线")
    parser_nav.add_argument("-d", "--data-file", required=True, help="数据文件路径")
    parser_nav.add_argument("-s", "--start", required=True, help="起点节点ID")
    parser_nav.add_argument("-e", "--end", required=True, help="终点节点ID")
    parser_nav.add_argument("-o", "--output-dir", help="输出目录 (默认: output)")
    parser_nav.add_argument("--wheelchair", action="store_true", help="轮椅无障碍模式")
    parser_nav.add_argument("--accessible", action="store_true", help="通用无障碍模式")
    parser_nav.add_argument("--show-traces", action="store_true", help="显示溯源追踪信息")
    parser_nav.add_argument("--trace-node", help="溯源指定节点到结果")
    parser_nav.add_argument("--trace-edge", help="溯源指定边到结果")
    parser_nav.add_argument("--verify", action="store_true", help="执行一致性校验")
    parser_nav.set_defaults(func=cmd_navigate)

    parser_trace = subparsers.add_parser("trace", help="溯源查询")
    parser_trace.add_argument("-d", "--data-file", required=True, help="数据文件路径")
    parser_trace.add_argument("-r", "--result-file", required=True, help="导航结果JSON文件")
    parser_trace.add_argument("--node-to-result", help="从节点溯源到结果")
    parser_trace.add_argument("--result-to-edges", action="store_true", help="从结果溯源到各边长度")
    parser_trace.add_argument("--edge-to-result", help="从边溯源到结果")
    parser_trace.add_argument("--verify", action="store_true", help="执行双向一致性校验")
    parser_trace.set_defaults(func=cmd_trace)

    parser_stats = subparsers.add_parser("stats", help="查看数据统计")
    parser_stats.add_argument("-d", "--data-file", required=True, help="数据文件路径")
    parser_stats.set_defaults(func=cmd_stats)

    args = parser.parse_args()

    try:
        return args.func(args)
    except KeyboardInterrupt:
        print("\n操作已取消")
        return 130
    except Exception as e:
        print(f"\n✗ 错误: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
