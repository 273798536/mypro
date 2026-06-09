"""
欧拉路径巡检工具 - 命令行接口（CLI）

使用示例:
    # 检测单个图文件
    euler-inspect check --input graph.json

    # 批量检测多个文件
    euler-inspect check --input graph1.json --input graph2.csv --format json

    # 导出结果
    euler-inspect check --input graph.json --output result.json

    # 查看边界样例定义
    euler-inspect boundary --list

    # 追溯特定边界样例
    euler-inspect boundary --trace EMPTY_GRAPH

    # 查看历史记录
    euler-inspect records --list

    # 复核记录（无需重新导入）
    euler-inspect review --record <record_id> --notes "已确认数据正确"

    # 查看参数缺口
    euler-inspect gaps --export gaps_report.json
"""

import argparse
import sys
import os
import json
from typing import List

from ..core.graph import Graph
from ..core.euler import (
    check_euler_conditions,
    find_euler_path,
    generate_explanation,
    EulerType
)
from ..io.data_io import import_graph, import_batch, export_result
from ..records.manager import RecordManager, ProcessingRecord
from ..boundary.cases import (
    get_boundary_case,
    trace_boundary_case,
    get_all_boundary_tags,
    summarize_boundary_cases
)
from ..fault_tolerance.processor import (
    FaultTolerantProcessor,
    GapSeverity,
    ParameterGap
)


def create_parser() -> argparse.ArgumentParser:
    """创建命令行参数解析器"""
    parser = argparse.ArgumentParser(
        prog="euler-inspect",
        description="欧拉路径巡检工具 - 检测图中欧拉路径/回路的存在性并进行完整分析",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
常用操作流程:
  1. 启动检测:    euler-inspect check --input samples/normal_graph.json
  2. 批量导入:    euler-inspect check --input samples/*.json --output results/
  3. 查看异常:    euler-inspect boundary --trace EMPTY_GRAPH
  4. 复核记录:    euler-inspect review --record <record_id> --notes "确认无误"
  5. 导出结果:    euler-inspect records --export batch_report.json
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # check 子命令 - 执行检测
    check_parser = subparsers.add_parser(
        "check",
        help="执行欧拉路径检测",
        description="对输入的图数据执行欧拉路径/回路检测，输出详细分析报告"
    )
    check_parser.add_argument(
        "--input", "-i",
        action="append",
        required=True,
        metavar="FILE",
        help="输入文件路径（可多次指定进行批量检测），支持 JSON/CSV/TXT 格式"
    )
    check_parser.add_argument(
        "--format", "-f",
        choices=["json", "csv", "txt"],
        default=None,
        help="输入文件格式，不指定则根据扩展名自动推断"
    )
    check_parser.add_argument(
        "--output", "-o",
        metavar="PATH",
        default=None,
        help="输出文件或目录路径。单个输入指定文件，批量输入指定目录"
    )
    check_parser.add_argument(
        "--output-format",
        choices=["json", "txt"],
        default="json",
        help="导出格式（默认: json）"
    )
    check_parser.add_argument(
        "--no-graph-data",
        action="store_true",
        help="导出结果中不包含原始图数据（减小文件体积）"
    )
    check_parser.add_argument(
        "--construct-path",
        action="store_true",
        default=True,
        help="尝试构造欧拉路径（默认开启）"
    )
    check_parser.add_argument(
        "--no-construct",
        action="store_true",
        help="不构造欧拉路径，仅检测条件"
    )
    check_parser.add_argument(
        "--start-vertex",
        default=None,
        help="指定欧拉路径的起始顶点（不指定则自动选择）"
    )
    check_parser.add_argument(
        "--operator",
        default="algorithm_engineer",
        help="操作员标识（用于记录）"
    )
    check_parser.add_argument(
        "--notes",
        default=None,
        help="批次备注信息"
    )
    check_parser.add_argument(
        "--records-dir",
        default="./euler_records",
        help="处理记录存储目录（默认: ./euler_records）"
    )

    # boundary 子命令 - 边界样例管理
    boundary_parser = subparsers.add_parser(
        "boundary",
        help="边界样例查询与追溯",
        description="查看和追溯边界样例的定义与处理意见"
    )
    boundary_group = boundary_parser.add_mutually_exclusive_group(required=True)
    boundary_group.add_argument(
        "--list", "-l",
        action="store_true",
        help="列出所有预定义的边界样例"
    )
    boundary_group.add_argument(
        "--trace", "-t",
        metavar="TAG",
        help="追溯指定边界样例标签，获取详细说明和处理意见"
    )
    boundary_group.add_argument(
        "--find",
        metavar="TAG",
        help="在历史记录中查找包含指定边界标签的记录"
    )

    # records 子命令 - 处理记录管理
    records_parser = subparsers.add_parser(
        "records",
        help="处理记录管理",
        description="查看、对比、导出历史处理记录"
    )
    records_group = records_parser.add_mutually_exclusive_group(required=True)
    records_group.add_argument(
        "--list", "-l",
        action="store_true",
        help="列出最近的处理批次"
    )
    records_group.add_argument(
        "--show",
        metavar="BATCH_ID",
        help="显示指定批次的详细信息"
    )
    records_group.add_argument(
        "--compare",
        nargs=2,
        metavar=("RECORD_ID_1", "RECORD_ID_2"),
        help="对比两条处理记录"
    )
    records_group.add_argument(
        "--errors",
        action="store_true",
        help="列出所有含错误的记录"
    )
    records_group.add_argument(
        "--unreviewed",
        action="store_true",
        help="列出所有未复核的记录"
    )
    records_group.add_argument(
        "--export",
        metavar="FILE",
        help="导出所有记录到指定文件"
    )
    records_parser.add_argument(
        "--records-dir",
        default="./euler_records",
        help="处理记录存储目录"
    )

    # review 子命令 - 复核记录
    review_parser = subparsers.add_parser(
        "review",
        help="复核处理记录（无需重新导入）",
        description="对已存在的处理记录进行复核，添加复核意见，无需重新导入数据"
    )
    review_parser.add_argument(
        "--record", "-r",
        required=True,
        metavar="RECORD_ID",
        help="要复核的记录ID"
    )
    review_parser.add_argument(
        "--notes", "-n",
        default=None,
        help="复核意见或备注"
    )
    review_parser.add_argument(
        "--records-dir",
        default="./euler_records",
        help="处理记录存储目录"
    )

    # gaps 子命令 - 参数缺口管理
    gaps_parser = subparsers.add_parser(
        "gaps",
        help="参数缺口报告管理",
        description="查看和导出参数缺口，供算法工程师补全"
    )
    gaps_group = gaps_parser.add_mutually_exclusive_group(required=True)
    gaps_group.add_argument(
        "--list", "-l",
        action="store_true",
        help="列出本次运行发现的参数缺口（需要配合 check 使用）"
    )
    gaps_group.add_argument(
        "--export",
        metavar="FILE",
        help="导出缺口报告到指定文件"
    )

    return parser


def cmd_check(args: argparse.Namespace) -> int:
    """执行检测命令"""
    input_files: List[str] = args.input
    file_format = args.format

    manager = RecordManager(args.records_dir)
    manager.load_all()

    notes = [args.notes] if args.notes else []
    batch = manager.start_batch(operator=args.operator, notes=notes)

    processor = FaultTolerantProcessor()

    print("=" * 60)
    print(f"欧拉路径巡检 - 批次 {batch.batch_id}")
    print(f"操作员: {batch.operator}")
    print(f"输入文件数: {len(input_files)}")
    print("=" * 60)

    construct = not args.no_construct

    for idx, file_path in enumerate(input_files, 1):
        print(f"\n[{idx}/{len(input_files)}] 处理文件: {file_path}")
        print("-" * 40)

        import_result = import_graph(file_path, file_format)

        if not import_result.success or import_result.graph is None:
            print("  ✗ 导入失败")
            for err in import_result.errors:
                print(f"    错误: {err}")
            for warn in import_result.warnings:
                print(f"    警告: {warn}")
            processor.add_note(f"{file_path}: 导入失败")
            continue

        graph = import_result.graph
        print(f"  ✓ 导入成功: {graph.name}")
        print(f"    顶点: {graph.vertex_count}, 边: {graph.edge_count}, "
              f"{'有向图' if graph.directed else '无向图'}")

        for warn in import_result.warnings:
            print(f"    ⚠ {warn}")

        if import_result.missing_fields:
            for field in import_result.missing_fields:
                processor.add_gap(ParameterGap(
                    parameter_name=field,
                    description=f"文件 {file_path} 缺少字段",
                    severity=GapSeverity.WARNING,
                    affected_items=[file_path]
                ))

        euler_result = None
        if construct:
            start_v = args.start_vertex
            if start_v is not None and graph.vertex_count > 0:
                try:
                    converted = type(next(iter(graph.vertices)))(start_v)
                    start_v = converted
                except (ValueError, TypeError):
                    processor.add_note(f"起始顶点类型转换失败，将自动选择")
                    start_v = None

            euler_result = find_euler_path(graph, start_vertex=start_v)
        else:
            from ..core.euler import EulerPathResult
            check = check_euler_conditions(graph)
            euler_result = EulerPathResult(check_result=check)

        explanation = generate_explanation(euler_result)
        for line in explanation:
            print(f"    {line}")

        graph_dict = graph.to_dict()
        graph_hash = RecordManager.compute_graph_hash(graph_dict)

        record = ProcessingRecord(
            record_id=RecordManager.generate_record_id(),
            graph_name=graph.name,
            graph_hash=graph_hash,
            timestamp=batch.timestamp,
            euler_type=euler_result.check_result.euler_type.value,
            has_euler_path=euler_result.check_result.has_euler_path,
            has_euler_circuit=euler_result.check_result.has_euler_circuit,
            is_connected=euler_result.check_result.is_connected,
            vertex_count=graph.vertex_count,
            edge_count=graph.edge_count,
            warnings=euler_result.check_result.warnings + import_result.warnings,
            errors=euler_result.check_result.errors + import_result.errors,
            boundary_cases=euler_result.check_result.boundary_cases,
            start_vertex=euler_result.check_result.start_vertex,
            end_vertex=euler_result.check_result.end_vertex,
            path_preview=(
                " → ".join(str(v) for v in euler_result.path[:5]) + "..."
                if euler_result.path and len(euler_result.path) > 5
                else (
                    " → ".join(str(v) for v in euler_result.path)
                    if euler_result.path
                    else None
                )
            )
        )
        manager.add_record(batch.batch_id, record)

        if args.output:
            if len(input_files) == 1 and not os.path.isdir(args.output):
                out_path = args.output
            else:
                os.makedirs(args.output, exist_ok=True)
                safe_name = "".join(c if c.isalnum() or c in "-_." else "_"
                                    for c in graph.name)
                out_path = os.path.join(
                    args.output,
                    f"result_{safe_name}_{record.record_id}.{args.output_format}"
                )

            export_res = export_result(
                graph,
                euler_result,
                out_path,
                export_format=args.output_format,
                include_graph=not args.no_graph_data
            )
            if export_res.success:
                print(f"  ✓ 结果已导出: {out_path}")
            else:
                for err in export_res.errors:
                    print(f"    ✗ 导出失败: {err}")

        print(f"  [复核入口] 记录ID: {record.record_id}")
        print(f"      复核命令: euler-inspect review --record {record.record_id} --notes \"你的意见\"")

    manager.save_batch(batch.batch_id)

    print("\n" + "=" * 60)
    print(f"批次处理完成")
    print(f"  总计: {batch.total_count}, 成功: {batch.success_count}, "
          f"含错: {batch.error_count}, 边界: {batch.boundary_count}, "
          f"待复核: {batch.unreviewed_count}")

    ft_result = processor.process_with_fallback(
        [], lambda x, p: None
    )
    ft_result.gaps = processor._gaps
    ft_result.process_notes = processor._notes
    ft_result.total_count = batch.total_count
    ft_result.success_count = batch.success_count
    ft_result.partial_count = batch.error_count

    if ft_result.has_gaps:
        print("\n⚠ 检测到参数缺口，建议补全:")
        for line in ft_result.generate_gap_report()[2:8]:
            print(f"  {line}")
        print(f"  完整报告: euler-inspect gaps --export gaps_{batch.batch_id}.json")

        gaps_data = {
            "batch_id": batch.batch_id,
            "timestamp": batch.timestamp,
            "gaps": [g.to_dict() for g in ft_result.gaps],
            "process_notes": ft_result.process_notes
        }
        gaps_file = f"gaps_{batch.batch_id}.json"
        try:
            with open(gaps_file, "w", encoding="utf-8") as f:
                json.dump(gaps_data, f, ensure_ascii=False, indent=2)
            print(f"  ✓ 缺口报告已保存: {gaps_file}")
        except Exception as e:
            print(f"  ✗ 缺口报告保存失败: {e}")

    print(f"  批次记录已保存: {args.records_dir}/batch_{batch.batch_id}.json")
    print("=" * 60)

    return 0 if batch.error_count == 0 else 1


def cmd_boundary(args: argparse.Namespace) -> int:
    """边界样例命令"""
    if args.list:
        print("=" * 60)
        print("预定义边界样例列表")
        print("=" * 60)
        tags = get_all_boundary_tags()
        for tag in tags:
            bc = get_boundary_case(tag)
            if bc:
                severity_icon = {"error": "✗", "warning": "⚠", "info": "ℹ"}.get(bc.severity, "?")
                print(f"\n{severity_icon} [{bc.severity.upper()}] {tag} - {bc.name}")
                print(f"    描述: {bc.description}")
                print(f"    触发: {bc.detection_condition}")
        print("\n" + "=" * 60)
        print(f"共 {len(tags)} 个边界样例定义")
        print("追溯详情: euler-inspect boundary --trace <TAG>")
        print("=" * 60)

    elif args.trace:
        tag = args.trace
        print("=" * 60)
        print(f"边界样例追溯: {tag}")
        print("=" * 60)
        trace = trace_boundary_case(tag)
        for line in trace["trace_path"]:
            print(f"  {line}")
        if trace["definition"]:
            d = trace["definition"]
            print(f"\n详细处理意见:")
            print(f"  {d['handling_advice']}")
            if d["examples"]:
                print(f"\n典型场景:")
                for ex in d["examples"]:
                    print(f"  - {ex}")
        print("=" * 60)

    elif args.find:
        tag = args.find
        manager = RecordManager("./euler_records")
        manager.load_all()
        records = manager.find_by_boundary_case(tag)
        print("=" * 60)
        print(f"查找包含边界标签 '{tag}' 的记录")
        print("=" * 60)
        if records:
            print(f"找到 {len(records)} 条记录:")
            for r in records:
                print(f"\n  记录ID: {r.record_id}")
                print(f"  图名: {r.graph_name}")
                print(f"  时间: {r.timestamp}")
                print(f"  类型: {r.euler_type}")
                print(f"  边界标签: {r.boundary_cases}")
        else:
            print("未找到相关记录")
        print("=" * 60)

    return 0


def cmd_records(args: argparse.Namespace) -> int:
    """记录管理命令"""
    manager = RecordManager(args.records_dir)
    loaded = manager.load_all()

    if args.list:
        print("=" * 60)
        print(f"最近处理批次（已加载 {loaded} 个批次）")
        print("=" * 60)
        batches = manager.list_batches()
        if batches:
            for b in batches:
                print(f"\n  批次ID: {b.batch_id}")
                print(f"  时间: {b.timestamp}, 操作员: {b.operator}")
                print(f"  统计: 总{b.total_count} 成{b.success_count} "
                      f"错{b.error_count} 边界{b.boundary_count} 待复核{b.unreviewed_count}")
        else:
            print("暂无历史记录")
        print("=" * 60)

    elif args.show:
        batch = manager.get_batch(args.show)
        if batch is None:
            print(f"未找到批次: {args.show}")
            return 1
        print("=" * 60)
        print(f"批次详情: {batch.batch_id}")
        print("=" * 60)
        print(f"时间: {batch.timestamp}")
        print(f"操作员: {batch.operator}")
        if batch.batch_notes:
            print(f"备注: {'; '.join(batch.batch_notes)}")
        print(f"\n  总{b.total_count} 成{b.success_count} "
              f"错{b.error_count} 边界{b.boundary_count} 待复核{b.unreviewed_count}")
        print("\n记录明细:")
        for r in batch.records:
            status_icon = "✓" if not r.errors else "✗"
            review_icon = "✓" if r.reviewed else "○"
            print(f"\n  [{status_icon}][{review_icon}] {r.record_id}")
            print(f"    图: {r.graph_name} ({r.vertex_count}顶点, {r.edge_count}边)")
            print(f"    结果: {r.euler_type}, 连通: {r.is_connected}")
            if r.boundary_cases:
                print(f"    边界: {r.boundary_cases}")
            if r.errors:
                print(f"    错误: {r.errors}")
            if r.review_notes:
                print(f"    复核意见: {r.review_notes}")
        print("=" * 60)

    elif args.compare:
        r1_id, r2_id = args.compare
        diff = manager.compare_records(r1_id, r2_id)
        if "error" in diff:
            print(diff["error"])
            return 1
        print("=" * 60)
        print(f"记录对比: {r1_id} vs {r2_id}")
        print("=" * 60)
        if diff["differences"]:
            print("发现差异:")
            for key, val in diff["differences"].items():
                if isinstance(val, dict) and "record_1" in val:
                    print(f"  {key}:")
                    print(f"    记录1: {val['record_1']}")
                    print(f"    记录2: {val['record_2']}")
                elif isinstance(val, list) and val:
                    print(f"  {key}: {val}")
        else:
            print("两条记录无差异")
        print("=" * 60)

    elif args.errors:
        records = manager.find_errors()
        print("=" * 60)
        print(f"含错误的记录（共 {len(records)} 条）")
        print("=" * 60)
        for r in records:
            print(f"\n  {r.record_id} | {r.graph_name} | {r.timestamp}")
            for e in r.errors:
                print(f"    ✗ {e}")
        print("=" * 60)

    elif args.unreviewed:
        records = manager.find_unreviewed()
        print("=" * 60)
        print(f"待复核记录（共 {len(records)} 条）")
        print("=" * 60)
        for r in records:
            print(f"\n  {r.record_id} | {r.graph_name} | {r.timestamp}")
            print(f"    复核命令: euler-inspect review --record {r.record_id} --notes \"...\"")
        print("=" * 60)

    elif args.export:
        batches = manager.list_batches(limit=1000)
        data = {
            "export_time": manager._generate_batch_id(),
            "total_batches": len(batches),
            "batches": [b.to_dict() for b in batches]
        }
        try:
            with open(args.export, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
            print(f"✓ 已导出 {len(batches)} 个批次到: {args.export}")
        except Exception as e:
            print(f"✗ 导出失败: {e}")
            return 1

    return 0


def cmd_review(args: argparse.Namespace) -> int:
    """复核命令"""
    manager = RecordManager(args.records_dir)
    manager.load_all()

    success = manager.review_record(args.record, args.notes)

    if success:
        print(f"✓ 记录 {args.record} 已标记为已复核")
        if args.notes:
            print(f"  复核意见: {args.notes}")

        for batch_id, batch in manager._batches.items():
            for record in batch.records:
                if record.record_id == args.record:
                    manager.save_batch(batch_id)
                    print(f"  已保存到批次: {batch_id}")
                    break

        print(f"\n追溯边界样例: euler-inspect boundary --trace <边界标签>")
        print("查看历史记录: euler-inspect records --list")
        return 0
    else:
        print(f"✗ 未找到记录: {args.record}")
        print("  可通过 'euler-inspect records --unreviewed' 查看待复核记录")
        return 1


def cmd_gaps(args: argparse.Namespace) -> int:
    """参数缺口命令"""
    if args.list:
        print("参数缺口需要配合 check 命令使用，每次检测后会自动生成缺口报告")
        print("运行检测: euler-inspect check --input <files>")
        return 0

    if args.export:
        gaps_files = [f for f in os.listdir(".") if f.startswith("gaps_") and f.endswith(".json")]
        if not gaps_files:
            print("当前目录未找到缺口报告文件")
            print("运行检测后会自动生成: gaps_<batch_id>.json")
            return 1

        latest = max(gaps_files)
        print(f"使用最近的缺口报告: {latest}")

        try:
            with open(latest, "r", encoding="utf-8") as f:
                data = json.load(f)

            if args.export:
                import shutil
                shutil.copy(latest, args.export)
                print(f"✓ 已导出到: {args.export}")

            gaps = [ParameterGap(**{
                **g,
                "severity": GapSeverity(g["severity"])
            }) for g in data["gaps"]]

            ft_result = FaultTolerantResult(gaps=gaps)
            for line in ft_result.generate_gap_report():
                print(line)

        except Exception as e:
            print(f"✗ 处理失败: {e}")
            return 1

    return 0


def main(argv: List[str] = None) -> int:
    """主入口函数"""
    parser = create_parser()
    args = parser.parse_args(argv)

    if args.command is None:
        parser.print_help()
        return 0

    handlers = {
        "check": cmd_check,
        "boundary": cmd_boundary,
        "records": cmd_records,
        "review": cmd_review,
        "gaps": cmd_gaps,
    }

    handler = handlers.get(args.command)
    if handler is None:
        print(f"未知命令: {args.command}")
        parser.print_help()
        return 2

    try:
        return handler(args)
    except KeyboardInterrupt:
        print("\n已中止")
        return 130
    except Exception as e:
        print(f"运行出错: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
