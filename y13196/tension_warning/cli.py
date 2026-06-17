import argparse
import json
import sys
import os
from typing import Optional, Dict, Any
from datetime import datetime

from .config import (
    ThresholdConfig,
    FieldMapping,
    DEFAULT_THRESHOLD,
    DEFAULT_FIELD_MAPPINGS,
    ProcessStatus,
    WarningLevel,
    level_rank,
)
from .loader import NameplateLoader, LoadResult
from .direction import DirectionChecker, DirectionCheckResult
from .algorithm import TensionAnalyzer, AnalysisResult
from .output import OutputExporter, PageSummary, ProcessRecord


def _merge_threshold_args(args: argparse.Namespace, base: ThresholdConfig) -> ThresholdConfig:
    params = {}
    for attr in ["warning_threshold", "danger_threshold", "tail_ratio",
                 "extreme_sustain_points", "valid_tension_min", "valid_tension_max",
                 "max_gap_ratio"]:
        val = getattr(args, attr, None)
        if val is not None:
            params[attr] = val
    if args.no_require_human_review:
        params["require_direction_human_review"] = False
    if args.allow_direction_auto_flip:
        params["allow_direction_auto_flip"] = True
    if params:
        merged = {**base.__dict__, **params}
        return ThresholdConfig(**merged)
    return base


def run_analysis(
    input_file: str,
    output_dir: Optional[str] = None,
    config: Optional[ThresholdConfig] = None,
    mapping: Optional[FieldMapping] = None,
    file_prefix: Optional[str] = None,
    print_summary: bool = True,
) -> Dict[str, Any]:
    threshold_cfg = config or DEFAULT_THRESHOLD
    field_mapping = mapping or DEFAULT_FIELD_MAPPINGS

    loader = NameplateLoader(mapping=field_mapping, threshold=threshold_cfg)
    direction_checker = DirectionChecker(config=threshold_cfg)
    analyzer = TensionAnalyzer(config=threshold_cfg)
    exporter = OutputExporter(output_dir=output_dir)

    if not os.path.exists(input_file):
        result = {
            "success": False,
            "exit_code": 2,
            "status": ProcessStatus.FAILED.value,
            "overall_level": WarningLevel.SUSPENDED.value,
            "failure_reason": {
                "code": "FILE_NOT_FOUND",
                "message": f"输入文件不存在: {input_file}",
                "suggestion": "请检查路径是否正确",
            },
            "generated_at": datetime.now().isoformat(),
        }
        if print_summary:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        return result

    load_result = loader.load_file(input_file)

    if not load_result.success:
        direction_result = DirectionCheckResult(
            is_consistent=False,
            is_suspended=False,
            status=load_result.status,
            inferred_direction=None,
            declared_direction=None,
            direction_from_field=None,
            needs_human_review=False,
            records=[],
        )
        analysis_result = AnalysisResult(
            status=load_result.status,
            overall_level=WarningLevel.SUSPENDED,
            direction_suspended=False,
            max_tension=None,
            max_tension_at=None,
            mean_tension_all_valid=None,
            source_file=load_result.source_file,
        )
    else:
        direction_result = direction_checker.check(load_result)
        analysis_result = analyzer.analyze(load_result, direction_result)

    if file_prefix is None:
        base = os.path.splitext(os.path.basename(input_file))[0]
        file_prefix = f"{base}_tension_warn"

    exported_paths = exporter.export_all(
        load_result, direction_result, analysis_result, file_prefix=file_prefix
    )

    page_summary = exporter.build_page_summary(load_result, direction_result, analysis_result)
    process_records = exporter.build_process_records(load_result, direction_result, analysis_result)

    verdict_level = analysis_result.overall_level
    exit_code = 0
    if not load_result.success:
        exit_code = 2
    elif verdict_level == WarningLevel.SUSPENDED:
        exit_code = 3
    elif verdict_level == WarningLevel.CAUTION:
        exit_code = 1
    elif verdict_level == WarningLevel.WARNING:
        exit_code = 5
    elif verdict_level == WarningLevel.DANGER:
        exit_code = 10

    combined = {
        "success": load_result.success or True,
        "exit_code": exit_code,
        "status": analysis_result.status.value,
        "overall_level": analysis_result.overall_level.value,
        "direction_suspended": analysis_result.direction_suspended,
        "max_tension": analysis_result.max_tension,
        "max_tension_at_seq": analysis_result.max_tension_at,
        "warning_count": analysis_result.warning_count,
        "danger_count": analysis_result.danger_count,
        "tail_hidden_risk": analysis_result.has_hidden_tail_risk,
        "failure_reason": load_result.failure_reason,
        "exported_files": exported_paths,
        "page_summary_file": exported_paths.get("page_summary"),
        "process_records_file": exported_paths.get("process_records"),
        "full_report_file": exported_paths.get("full_report"),
        "conclusions": page_summary.conclusions_block,
        "evidence_lines": page_summary.evidence_lines,
        "data_quality_note": page_summary.data_quality_note,
        "generated_at": datetime.now().isoformat(),
        "input_file": os.path.abspath(input_file),
        "threshold_config": {
            "warning_threshold": threshold_cfg.warning_threshold,
            "danger_threshold": threshold_cfg.danger_threshold,
            "tail_ratio": threshold_cfg.tail_ratio,
            "extreme_sustain_points": threshold_cfg.extreme_sustain_points,
            "require_direction_human_review": threshold_cfg.require_direction_human_review,
            "allow_direction_auto_flip": threshold_cfg.allow_direction_auto_flip,
        },
        "field_mapping_used": {
            k: v.matched_source_name or "(未匹配)"
            for k, v in load_result.field_traces.items()
        },
    }

    if print_summary:
        print(json.dumps(combined, ensure_ascii=False, indent=2))

    return combined


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="tension-warning",
        description="滑轮组张力阈值预警：解析设备铭牌，检出极值并检测收尾段隐藏风险",
    )
    parser.add_argument("input_file", help="铭牌数据文件路径 (JSON/CSV)")
    parser.add_argument(
        "-o", "--output-dir",
        default=None,
        help="输出目录，默认为当前目录下的 outputs/",
    )
    parser.add_argument(
        "--prefix",
        default=None,
        help="输出文件名前缀，默认基于输入文件名推导",
    )
    parser.add_argument("--warning-threshold", type=float, default=None, help="预警阈值 (默认80.0)")
    parser.add_argument("--danger-threshold", type=float, default=None, help="危险阈值 (默认95.0)")
    parser.add_argument("--tail-ratio", type=float, default=None, help="收尾段比例 (默认0.15=15%%)")
    parser.add_argument("--extreme-sustain-points", type=int, default=None, help="极值连续判定点数 (默认3)")
    parser.add_argument("--valid-tension-min", type=float, default=None, help="张力有效下限 (默认0.0)")
    parser.add_argument("--valid-tension-max", type=float, default=None, help="张力有效上限 (默认150.0)")
    parser.add_argument("--max-gap-ratio", type=float, default=None, help="最大容忍缺失比例 (默认0.4)")
    parser.add_argument(
        "--allow-direction-auto-flip",
        action="store_true",
        help="允许在方向冲突时自动翻转（不推荐，默认禁止）",
    )
    parser.add_argument(
        "--no-require-human-review",
        action="store_true",
        help="方向冲突时不要求人工复核（不推荐，默认要求）",
    )
    parser.add_argument(
        "-q", "--quiet",
        action="store_true",
        help="不打印摘要JSON到stdout",
    )
    args = parser.parse_args()

    threshold = _merge_threshold_args(args, DEFAULT_THRESHOLD)

    result = run_analysis(
        input_file=args.input_file,
        output_dir=args.output_dir,
        config=threshold,
        file_prefix=args.prefix,
        print_summary=not args.quiet,
    )
    return result.get("exit_code", 0)


if __name__ == "__main__":
    sys.exit(main())
