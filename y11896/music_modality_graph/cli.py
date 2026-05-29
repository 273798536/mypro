#!/usr/bin/env python3
import argparse
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from core import (
    ModalityType, create_modality, create_all_modalities,
    build_graph, find_all_paths, AnalysisResult,
    export_to_json, export_paths_to_csv, export_edges_to_csv, export_issues_to_csv,
    compare_runs, export_comparison_to_json, get_path_detail, Issue
)


def print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def print_section(title: str):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}\n")


def print_modality_info(mod):
    print(f"调式: {mod}")
    print(f"  主音: {mod.key_note.name} (pitch class: {mod.key_note.pitch_class})")
    print(f"  音级:")
    for degree in sorted(mod.scale_degrees.keys()):
        note = mod.scale_degrees[degree]
        roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][degree-1]
        print(f"    {degree} ({roman}): {note.name}")


def print_path(path, rank: int = 1):
    print(f"路径 #{rank} - 难度评分: {path.total_difficulty:.2f} - 步数: {path.length}")
    print(f"  {path}")
    print(f"  总共同音数: {path.total_common_tones}")
    print(f"  详细步骤:")
    for i, edge in enumerate(path.edges, 1):
        conf_mark = " ⚠️待确认" if edge.needs_confirmation else ""
        enh_mark = " 🎵等音" if edge.is_enharmonic else ""
        print(f"    步骤 {i}: {edge.source} → {edge.target}")
        print(f"      共同音 ({edge.common_tone_count}): {', '.join(n.name for n in edge.common_tones)}")
        print(f"      难度: {edge.difficulty_score:.2f} | 类型: {edge.modulation_type}{conf_mark}{enh_mark}")


def print_issues(issues: List[Issue], limit: int = 10):
    if not issues:
        print("  无问题报告")
        return
    
    severity_order = {'warning': 0, 'info': 1}
    sorted_issues = sorted(issues, key=lambda x: severity_order.get(x.severity, 2))
    
    for i, issue in enumerate(sorted_issues[:limit], 1):
        severity_icon = "⚠️" if issue.severity == "warning" else "ℹ️"
        print(f"  {severity_icon} [{issue.severity.upper()}] {issue.issue_type}")
        print(f"     {issue.description}")
        print(f"     建议: {issue.suggested_action}")
    
    if len(issues) > limit:
        print(f"  ... 还有 {len(issues) - limit} 个问题，请查看导出文件")


def run_analysis(
    start_key: str,
    start_type: str,
    target_key: str,
    target_type: str,
    min_common_tones: int = 1,
    max_paths: int = 5,
    max_path_length: int = 4,
    output_dir: str = "./output",
    modality_filter: Optional[List[str]] = None
) -> tuple:
    
    run_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now().isoformat()
    
    print_header(f"音乐调式关系图谱分析 - 运行ID: {run_id}")
    
    try:
        start_mod = create_modality(start_key, ModalityType(start_type))
        target_mod = create_modality(target_key, ModalityType(target_type))
    except ValueError as e:
        print(f"错误: {e}")
        return None, [], run_id
    
    print_section("起始调式信息")
    print_modality_info(start_mod)
    
    print_section("目标调式信息")
    print_modality_info(target_mod)
    
    if modality_filter:
        modalities = []
        for key_name in modality_filter:
            for mod_type in [start_mod.modality_type, target_mod.modality_type]:
                try:
                    modalities.append(create_modality(key_name, mod_type))
                except ValueError:
                    pass
        if start_mod not in modalities:
            modalities.append(start_mod)
        if target_mod not in modalities:
            modalities.append(target_mod)
    else:
        modalities = create_all_modalities()
    
    print_section("构建调式关系图")
    print(f"  节点数: {len(modalities)} 个调式")
    print(f"  最小共同音: {min_common_tones}")
    
    graph, build_issues = build_graph(
        modalities,
        min_common_tones=min_common_tones,
        max_score_threshold=15.0
    )
    
    edge_count = sum(len(edges) for edges in graph.edges.values())
    print(f"  边数: {edge_count} 个转调关系")
    
    print_section("搜索转调路径")
    print(f"  从 {start_mod} 到 {target_mod}")
    print(f"  最大路径数: {max_paths}")
    print(f"  最大路径长度: {max_path_length}")
    
    paths, path_issues = find_all_paths(
        graph,
        start_mod.id,
        target_mod.id,
        max_paths=max_paths,
        max_path_length=max_path_length
    )
    
    all_issues = build_issues + path_issues
    
    all_edges = []
    for source_edges in graph.edges.values():
        all_edges.extend(source_edges.values())
    
    result = AnalysisResult(
        start_modality=start_mod,
        target_modality=target_mod,
        paths=paths,
        all_edges=all_edges,
        timestamp=timestamp,
        run_id=run_id
    )
    
    print_section(f"找到 {len(paths)} 条转调路径 (按难度排序)")
    for i, path in enumerate(paths, 1):
        print_path(path, i)
        print()
    
    print_section("问题与建议")
    print_issues(all_issues)
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    print_section("导出数据")
    
    json_path = output_path / f"analysis_{run_id}.json"
    export_to_json(result, all_issues, str(json_path))
    print(f"  ✓ 完整分析结果: {json_path}")
    
    csv_paths = output_path / f"paths_{run_id}.csv"
    export_paths_to_csv(result, str(csv_paths))
    print(f"  ✓ 路径明细: {csv_paths}")
    
    csv_edges = output_path / f"edges_{run_id}.csv"
    export_edges_to_csv(all_edges, str(csv_edges))
    print(f"  ✓ 转调关系明细: {csv_edges}")
    
    csv_issues = output_path / f"issues_{run_id}.csv"
    export_issues_to_csv(all_issues, str(csv_issues))
    print(f"  ✓ 问题报告: {csv_issues}")
    
    print()
    print(f"分析完成! 运行ID: {run_id}")
    
    return result, all_issues, run_id


def run_comparison(run1_path: str, run2_path: str, output_dir: str = "./output"):
    print_header("两次运行对比分析")
    
    print(f"  运行1: {run1_path}")
    print(f"  运行2: {run2_path}")
    
    comparison = compare_runs(run1_path, run2_path)
    
    comp = comparison['comparison']
    
    print_section("路径变化")
    print(f"  新增路径: {comp['paths']['new_count']}")
    print(f"  移除路径: {comp['paths']['removed_count']}")
    print(f"  变化路径: {comp['paths']['changed_count']}")
    
    if comp['paths']['new_paths']:
        print(f"\n  新增路径列表:")
        for p in comp['paths']['new_paths']:
            print(f"    + {p['path_str']} (难度: {p['total_difficulty']})")
    
    if comp['paths']['changed_paths']:
        print(f"\n  变化路径列表:")
        for c in comp['paths']['changed_paths']:
            diff = c['diff']['score_change']
            sign = "+" if diff > 0 else ""
            print(f"    ~ {c['path']} (难度变化: {sign}{diff})")
    
    print_section("转调关系变化")
    print(f"  新增关系: {comp['edges']['new_count']}")
    print(f"  移除关系: {comp['edges']['removed_count']}")
    print(f"  变化关系: {comp['edges']['changed_count']}")
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    comp_file = output_path / f"comparison_{comparison['run1_id']}_{comparison['run2_id']}.json"
    export_comparison_to_json(comparison, str(comp_file))
    print(f"\n  ✓ 对比结果已导出: {comp_file}")
    
    return comparison


def main():
    parser = argparse.ArgumentParser(
        description="音乐调式关系图谱分析工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本分析: C大调 到 G大调
  python cli.py analyze --start-key C --start-type major --target-key G --target-type major
  
  # 限制共同音数量，获取更多路径
  python cli.py analyze -s C -st major -t F# -tt minor --min-common-tones 2 --max-paths 10
  
  # 对比两次运行结果
  python cli.py compare --run1 output/analysis_abc123.json --run2 output/analysis_def456.json

调式类型 (--start-type, --target-type):
  major, minor, dorian, phrygian, lydian, mixolydian, locrian, harmonic_minor, melodic_minor
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    analyze_parser = subparsers.add_parser("analyze", help="分析转调路径")
    analyze_parser.add_argument("-s", "--start-key", required=True, help="起始调的主音 (如 C, F#, Bb)")
    analyze_parser.add_argument("-st", "--start-type", required=True, help="起始调式类型")
    analyze_parser.add_argument("-t", "--target-key", required=True, help="目标调的主音")
    analyze_parser.add_argument("-tt", "--target-type", required=True, help="目标调式类型")
    analyze_parser.add_argument("-c", "--min-common-tones", type=int, default=1, help="最小共同音数 (默认: 1)")
    analyze_parser.add_argument("-p", "--max-paths", type=int, default=5, help="最大路径数 (默认: 5)")
    analyze_parser.add_argument("-l", "--max-path-length", type=int, default=4, help="最大路径长度 (默认: 4)")
    analyze_parser.add_argument("-o", "--output-dir", default="./output", help="输出目录")
    analyze_parser.add_argument("-f", "--filter", nargs="+", help="仅分析指定的调 (如 C G D)")
    
    compare_parser = subparsers.add_parser("compare", help="对比两次分析结果")
    compare_parser.add_argument("-1", "--run1", required=True, help="第一次运行的JSON文件")
    compare_parser.add_argument("-2", "--run2", required=True, help="第二次运行的JSON文件")
    compare_parser.add_argument("-o", "--output-dir", default="./output", help="输出目录")
    
    args = parser.parse_args()
    
    if args.command == "analyze":
        run_analysis(
            start_key=args.start_key,
            start_type=args.start_type,
            target_key=args.target_key,
            target_type=args.target_type,
            min_common_tones=args.min_common_tones,
            max_paths=args.max_paths,
            max_path_length=args.max_path_length,
            output_dir=args.output_dir,
            modality_filter=args.filter
        )
    elif args.command == "compare":
        run_comparison(args.run1, args.run2, args.output_dir)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
