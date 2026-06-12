import argparse
import os
import sys
from typing import List, Tuple

from .core import MatrixConditionChecker, BoundaryConfig, CheckResult
from .source_tracker import SourceTracker, ProcessingStatus
from .validator import BoundaryValidator
from .timeline import TimelineGenerator
from .utils import load_csv, safe_float, resolve_field


def process_rows(
    rows: List[dict],
    checker: MatrixConditionChecker,
    tracker: SourceTracker,
    expected_unit: str = "",
) -> List[CheckResult]:
    results = []
    for row in rows:
        matrix_name = resolve_field(row, "matrix_name") or f"未知矩阵_{row.get('__source_line__', 0)}"
        source_file = row.get("__source_file__", "")
        source_line = int(row.get("__source_line__", 0))

        record = tracker.ingest_row(
            source_file=source_file,
            source_line=source_line,
            matrix_name=matrix_name,
            raw_row={k: v for k, v in row.items() if not k.startswith("__")},
        )

        tracker.check_unit_consistency(record, expected_unit)

        cond_value = safe_float(resolve_field(row, "condition_number"))
        lower = safe_float(resolve_field(row, "lower_bound"))
        upper = safe_float(resolve_field(row, "upper_bound"))
        extrap_raw = resolve_field(row, "extrapolation_flag")
        unit = str(resolve_field(row, "calculation_unit") or "")

        is_extrapolated = False
        if extrap_raw is not None:
            s = str(extrap_raw).strip().lower()
            is_extrapolated = s in ("是", "true", "1", "yes", "y", "外推")

        result = checker.check_value(
            matrix_name=matrix_name,
            cond_value=cond_value,
            lower=lower,
            upper=upper,
            unit=unit,
            is_extrapolated=is_extrapolated,
            source_line=source_line,
            source_file=source_file,
            raw_row=row,
        )
        results.append(result)

        if result.is_valid and not record.unit_consistent:
            record.change_status(ProcessingStatus.NEEDS_MATERIAL, f"校验数值通过，但单位不一致需确认（预期:{expected_unit} 检测:{record.detected_unit}）")
        elif not result.is_valid:
            if is_extrapolated:
                record.change_status(ProcessingStatus.NEEDS_MATERIAL, f"外推越界：{result.boundary_msg}，需补充数据")
            elif cond_value is None:
                record.change_status(ProcessingStatus.NEEDS_MATERIAL, "条件数缺失，需补充计算结果")
            else:
                record.change_status(ProcessingStatus.NEEDS_MATERIAL, f"数值越界：{result.boundary_msg}")
        else:
            record.change_status(ProcessingStatus.PROCESSED, f"校验通过，条件数={result.condition_number}")

    return results


def apply_manual_overrides(tracker: SourceTracker, overrides: List[Tuple[str, str, str]]):
    for rid, note, operator in overrides:
        if rid in tracker.records:
            tracker.records[rid].change_status(ProcessingStatus.MANUAL_OVERRIDDEN, note, operator)


def print_exit_summary(validator: BoundaryValidator, checker: MatrixConditionChecker, tracker: SourceTracker) -> int:
    extrap_violations = validator.extrapolation_violations()
    invalid_results = checker.get_invalid_results()

    print("\n" + "=" * 70)
    print("矩阵条件数边界校验 · 退出提示")
    print("=" * 70)

    if not extrap_violations and not invalid_results:
        print("✅ 全部通过：无外推越界，无数值异常。")
        return 0

    exit_code = 0
    if extrap_violations:
        exit_code = max(exit_code, 2)
        print(f"\n⚠️  外推越界共 {len(extrap_violations)} 条，卡在哪：")
        for v in extrap_violations:
            if v.deviation is None:
                span = v.upper_bound - v.lower_bound
                if v.condition_number is not None and span > 0:
                    dist_upper = v.upper_bound - v.condition_number
                    dist_lower = v.condition_number - v.lower_bound
                    direction = "接近上界" if dist_upper < dist_lower else "接近下界"
                else:
                    direction = "接近边界"
            else:
                direction = "上界超限" if v.deviation > 0 else "下界超限"
            print(f"  - [{v.violation_id}] {v.matrix_name}（{v.source_file} 第 {v.source_line} 行）")
            print(f"    {direction}：条件数={v.condition_number}，区间[{v.lower_bound}, {v.upper_bound}]")
            print(f"    {v.impact_scope}")
            print(f"    说明：{v.description}")

    other_invalid = [r for r in invalid_results if not r.is_extrapolated]
    if other_invalid:
        exit_code = max(exit_code, 1)
        print(f"\n⚠️  非外推异常共 {len(other_invalid)} 条：")
        for r in other_invalid:
            print(f"  - {r.matrix_name}（{r.source_file} 第 {r.source_line} 行）：{r.boundary_msg}")

    status_summary = tracker.status_summary()
    print(f"\n📊 处理状态概览：{status_summary}")
    print("=" * 70)
    return exit_code


def run_pipeline(
    input_files: List[str],
    output_dir: str,
    expected_unit: str = "无量纲",
    recheck: bool = False,
    previous_results: dict = None,
) -> int:
    os.makedirs(output_dir, exist_ok=True)

    config = BoundaryConfig(default_lower=1.0, default_upper=100.0, warn_ratio=0.8)
    checker = MatrixConditionChecker(config)
    tracker = SourceTracker()
    validator = BoundaryValidator()
    timeline = TimelineGenerator()

    all_results: List[CheckResult] = []
    for fp in input_files:
        rows = load_csv(fp)
        results = process_rows(rows, checker, tracker, expected_unit)
        all_results.extend(results)

    violations = validator.analyze(all_results)

    overrides = []
    apply_manual_overrides(tracker, overrides)

    run_label = "复算运行" if recheck else "首次运行"
    events = timeline.build_from_pipeline(tracker, validator, all_results, run_label)

    if recheck and previous_results:
        for r in all_results:
            key = f"{r.source_file}::L{r.source_line}::{r.matrix_name}"
            if key in previous_results:
                prev_valid = previous_results[key]
                timeline.add_recheck_event(
                    matrix_name=r.matrix_name,
                    source_file=r.source_file,
                    source_line=r.source_line,
                    previous_valid=prev_valid,
                    current_valid=r.is_valid,
                    note=f"晚到附件复算，条件数={r.condition_number} 单位={r.unit}",
                )

    timeline_path = os.path.join(output_dir, "timeline.txt")
    timeline_csv_path = os.path.join(output_dir, "timeline.csv")
    timeline.render_text(timeline_path)
    timeline.render_csv(timeline_csv_path)

    import csv
    detail_path = os.path.join(output_dir, "check_details.csv")
    with open(detail_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "来源文件", "来源行号", "矩阵名称", "条件数", "下界", "上界", "单位",
            "是否外推", "是否通过", "边界说明", "处理状态",
        ])
        for r in all_results:
            rec = tracker.get_record(r.source_file, r.source_line, r.matrix_name)
            status_val = rec.status.value if rec else ""
            writer.writerow([
                r.source_file, r.source_line, r.matrix_name, r.condition_number,
                r.lower_bound, r.upper_bound, r.unit,
                "是" if r.is_extrapolated else "否",
                "通过" if r.is_valid else "未通过",
                r.boundary_msg, status_val,
            ])

    violation_path = os.path.join(output_dir, "violations.csv")
    with open(violation_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "违规ID", "矩阵名称", "违规类型", "严重程度", "条件数", "下界", "上界",
            "偏差", "是否外推", "来源文件", "来源行号", "影响行号", "关联矩阵", "描述",
        ])
        for v in violations:
            writer.writerow([
                v.violation_id, v.matrix_name, v.violation_type.value, v.severity,
                v.condition_number, v.lower_bound, v.upper_bound,
                v.deviation, "是" if v.is_extrapolated else "否",
                v.source_file, v.source_line,
                ",".join(str(x) for x in sorted(v.affected_rows)),
                ",".join(sorted(v.affected_matrices)),
                v.description,
            ])

    print(timeline.render_text())

    print(f"\n📁 输出文件已写入：{output_dir}")
    print(f"   - 时间线:  {timeline_path}")
    print(f"   - 时间线CSV: {timeline_csv_path}")
    print(f"   - 校验明细: {detail_path}")
    print(f"   - 违规明细: {violation_path}")

    return print_exit_summary(validator, checker, tracker)


def main():
    parser = argparse.ArgumentParser(
        prog="matrix-cond-check",
        description="矩阵条件数边界校验工具：一条命令跑完整包样例，输出历史时间线、明细、违规定位。",
    )
    parser.add_argument(
        "-i", "--input",
        nargs="+",
        default=None,
        help="输入CSV文件路径，可指定多个；默认使用 data/sample_draft.csv",
    )
    parser.add_argument(
        "-o", "--output",
        default="output",
        help="输出目录（默认 output）",
    )
    parser.add_argument(
        "--unit",
        default="无量纲",
        help="预期计算单位，用于一致性校验（默认 无量纲）",
    )
    parser.add_argument(
        "--recheck",
        action="store_true",
        help="复算模式：结合晚到附件重新运行",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="直接运行内置示例（含晚到附件复算）",
    )
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    if args.sample:
        print("🚀 运行内置示例：首次校验 + 晚到附件复算")
        sample_draft = os.path.join(base_dir, "data", "sample_draft.csv")
        output_first = os.path.join(base_dir, "output", "first_run")
        code1 = run_pipeline([sample_draft], output_first, expected_unit=args.unit, recheck=False)

        print("\n\n" + "#" * 70)
        print("# 晚到附件到达，开始复算")
        print("#" * 70 + "\n")

        previous_results = {}
        detail_csv = os.path.join(output_first, "check_details.csv")
        if os.path.exists(detail_csv):
            import csv
            with open(detail_csv, "r", encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    key = f"{row['来源文件']}::L{row['来源行号']}::{row['矩阵名称']}"
                    previous_results[key] = (row["是否通过"] == "通过")

        late_attachment = os.path.join(base_dir, "data", "late_attachment.csv")
        output_recheck = os.path.join(base_dir, "output", "recheck_run")
        code2 = run_pipeline(
            [sample_draft, late_attachment],
            output_recheck,
            expected_unit=args.unit,
            recheck=True,
            previous_results=previous_results,
        )
        sys.exit(max(code1, code2))

    if not args.input:
        args.input = [os.path.join(base_dir, "data", "sample_draft.csv")]

    exit_code = run_pipeline(args.input, args.output, expected_unit=args.unit, recheck=args.recheck)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
