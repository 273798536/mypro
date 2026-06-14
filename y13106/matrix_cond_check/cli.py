import argparse
import os
import sys
from typing import List, Tuple, Optional, Dict, Any

from .core import MatrixConditionChecker, BoundaryConfig, CheckResult
from .source_tracker import SourceTracker, ProcessingStatus
from .validator import BoundaryValidator
from .timeline import TimelineGenerator
from .utils import load_csv, safe_float, resolve_field
from .charts import generate_charts


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


def load_manual_overrides(file_path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"人工改判文件不存在: {file_path}")
    import csv
    overrides = []
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        required = ["来源文件", "来源行号", "矩阵名称", "改判结论", "改判理由", "操作人"]
        missing = [c for c in required if c not in reader.fieldnames]
        if missing:
            raise ValueError(f"人工改判文件缺少必要列: {missing}，必需列: {required}")
        for row in reader:
            try:
                line = int(str(row["来源行号"]).strip())
            except (ValueError, TypeError):
                print(f"⚠️  人工改判行跳过，来源行号无效：{row}")
                continue
            overrides.append({
                "source_file": str(row["来源文件"]).strip(),
                "source_line": line,
                "matrix_name": str(row["矩阵名称"]).strip(),
                "decision": str(row["改判结论"]).strip(),
                "reason": str(row["改判理由"]).strip(),
                "operator": str(row.get("操作人", "未知")).strip(),
                "override_time": str(row.get("改判时间", "")).strip(),
            })
    return overrides


def apply_structured_overrides(
    tracker: SourceTracker,
    structured_overrides: List[Dict[str, Any]],
) -> List[str]:
    applied = []
    for ov in structured_overrides:
        rid = tracker._make_id(ov["source_file"], ov["source_line"], ov["matrix_name"])
        if rid not in tracker.records:
            print(f"⚠️  人工改判未生效：未找到记录 {ov['source_file']} L{ov['source_line']} {ov['matrix_name']}")
            continue
        record = tracker.records[rid]
        decision = ov["decision"].strip()
        reason = ov["reason"]
        operator = ov["operator"]
        ts = ov.get("override_time", "")
        note_prefix = f"[{ts}] " if ts else ""
        if decision in ("通过", "OK", "accept", "通过（人工改判）"):
            record.change_status(
                ProcessingStatus.MANUAL_OVERRIDDEN,
                f"{note_prefix}人工改判为通过：{reason}",
                operator,
            )
            applied.append(rid)
        elif decision in ("驳回", "reject", "不通过", "NA", "不通过（人工改判）"):
            record.change_status(
                ProcessingStatus.NEEDS_MATERIAL,
                f"{note_prefix}人工改判为驳回：{reason}，仍待补材料",
                operator,
            )
            applied.append(rid)
        else:
            print(f"⚠️  人工改判未生效：未知改判结论 '{decision}'，支持：通过/驳回")
    return applied


def resolve_duplicate_matrices(
    all_results: List[CheckResult],
    tracker: SourceTracker,
    input_files: List[str],
) -> List[CheckResult]:
    file_priority = {os.path.basename(fp): i for i, fp in enumerate(input_files)}
    matrix_to_results: Dict[str, List[CheckResult]] = {}
    for r in all_results:
        matrix_to_results.setdefault(r.matrix_name, []).append(r)

    superseded_count = 0
    for matrix_name, rs in matrix_to_results.items():
        if len(rs) < 2:
            continue
        rs_with_prio = [
            (r, file_priority.get(r.source_file, 0))
            for r in rs
        ]
        rs_with_prio.sort(key=lambda x: x[1], reverse=True)
        winner = rs_with_prio[0][0]
        for cand, _ in rs_with_prio[1:]:
            old_rid = tracker._make_id(cand.source_file, cand.source_line, cand.matrix_name)
            new_rid = tracker._make_id(winner.source_file, winner.source_line, winner.matrix_name)
            if tracker.mark_superseded(old_rid, new_rid):
                superseded_count += 1
    if superseded_count > 0:
        print(f"\n🔄 同名矩阵合并：已标记 {superseded_count} 条草稿记录为『已被晚到附件取代』，以最新文件数据为准。")
    return all_results


def get_active_results(all_results: List[CheckResult], tracker: SourceTracker) -> List[CheckResult]:
    active_ids = {r.record_id for r in tracker.get_active_records()}
    return [
        r for r in all_results
        if tracker._make_id(r.source_file, r.source_line, r.matrix_name) in active_ids
    ]


def print_exit_summary(
    validator: BoundaryValidator,
    checker: MatrixConditionChecker,
    tracker: SourceTracker,
    applied_override_count: int = 0,
    active_results: Optional[List[CheckResult]] = None,
) -> int:
    extrap_violations = validator.extrapolation_violations()
    if active_results is not None:
        invalid_results = [r for r in active_results if not r.is_valid]
    else:
        invalid_results = checker.get_invalid_results()

    print("\n" + "=" * 70)
    print("矩阵条件数边界校验 · 退出提示")
    print("=" * 70)

    if applied_override_count > 0:
        print(f"✅ 本次已应用 {applied_override_count} 条人工改判，已反映在时间线『人工改判』块。")

    status_summary = tracker.status_summary()
    superseded_n = status_summary.get(ProcessingStatus.SUPERSEDED.value, 0)
    if superseded_n > 0:
        print(f"🔄 本次合并 {superseded_n} 条重复记录：草稿同名矩阵已被晚到附件覆盖（详见时间线『已被晚到附件取代』块）。")

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
    if status_summary.get("人工改判", 0) > 0:
        manual_records = tracker.get_by_status(ProcessingStatus.MANUAL_OVERRIDDEN)
        print(f"📝 人工改判明细（共 {len(manual_records)} 条）：")
        for rec in manual_records:
            print(f"  - {rec.matrix_name}（{rec.source_file} L{rec.source_line}）：{rec.notes[-1] if rec.notes else '无备注'}")

    print("\n💡 核对口径：打开 charts_summary.html 可查看图表 ↔ 明细的逐行对应关系")
    print("=" * 70)
    return exit_code


def run_pipeline(
    input_files: List[str],
    output_dir: str,
    expected_unit: str = "无量纲",
    recheck: bool = False,
    previous_results: dict = None,
    override_file: Optional[str] = None,
    generate_charts_flag: bool = True,
    run_label: Optional[str] = None,
    merge_duplicates: bool = True,
) -> int:
    os.makedirs(output_dir, exist_ok=True)

    config = BoundaryConfig(default_lower=1.0, default_upper=100.0, warn_ratio=0.8)
    checker = MatrixConditionChecker(config)
    tracker = SourceTracker()
    validator = BoundaryValidator()
    timeline = TimelineGenerator()

    all_results: List[CheckResult] = []
    for fp in input_files:
        if not os.path.exists(fp):
            print(f"⚠️  跳过不存在的输入文件: {fp}")
            continue
        try:
            rows = load_csv(fp)
        except Exception as e:
            print(f"❌ 读取文件失败 {fp}: {e}")
            continue
        if not rows:
            print(f"⚠️  文件 {fp} 没有有效数据行，已跳过")
            continue
        results = process_rows(rows, checker, tracker, expected_unit)
        all_results.extend(results)

    if not all_results:
        print("❌ 没有任何有效数据可以处理，请检查输入文件。")
        return 3

    if merge_duplicates:
        resolve_duplicate_matrices(all_results, tracker, input_files)

    active_results = get_active_results(all_results, tracker)

    violations = validator.analyze(active_results)

    applied_override_ids = []
    if override_file:
        try:
            override_list = load_manual_overrides(override_file)
            applied_override_ids = apply_structured_overrides(tracker, override_list)
            print(f"\n✅ 已应用 {len(applied_override_ids)} 条人工改判（共读取 {len(override_list)} 条）")
        except Exception as e:
            print(f"❌ 应用人工改判失败：{e}")
            return 4

    actual_label = run_label or ("复算运行" if recheck else "首次运行")
    events = timeline.build_from_pipeline(tracker, validator, all_results, actual_label)

    if recheck and previous_results:
        for r in active_results:
            if r.matrix_name in previous_results:
                prev_valid = previous_results[r.matrix_name]
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
            "是否被晚到附件取代", "取代关系",
        ])
        for r in all_results:
            rec = tracker.get_record(r.source_file, r.source_line, r.matrix_name)
            status_val = rec.status.value if rec else ""
            is_superseded = "是" if rec and rec.status == ProcessingStatus.SUPERSEDED else "否"
            relation = ""
            if rec:
                if rec.superseded_by and rec.superseded_by in tracker.records:
                    nr = tracker.records[rec.superseded_by]
                    relation = f"被 {nr.source_file} L{nr.source_line} 取代"
                elif rec.supersedes and rec.supersedes in tracker.records:
                    orr = tracker.records[rec.supersedes]
                    relation = f"取代 {orr.source_file} L{orr.source_line}"
            writer.writerow([
                r.source_file, r.source_line, r.matrix_name, r.condition_number,
                r.lower_bound, r.upper_bound, r.unit,
                "是" if r.is_extrapolated else "否",
                "通过" if r.is_valid else "未通过",
                r.boundary_msg, status_val,
                is_superseded, relation,
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

    chart_paths: Dict[str, str] = {}
    if generate_charts_flag:
        try:
            chart_paths = generate_charts(active_results, validator, tracker, output_dir)
        except Exception as e:
            print(f"⚠️  图表生成失败：{e}（不影响文本/CSV产物）")

    print(timeline.render_text())

    print(f"\n📁 输出文件已写入：{output_dir}")
    print(f"   - 时间线:          {timeline_path}")
    print(f"   - 时间线CSV:       {timeline_csv_path}")
    print(f"   - 校验明细:        {detail_path}")
    print(f"   - 违规明细:        {violation_path}")
    if chart_paths:
        print(f"   - 图表汇总页:      {chart_paths.get('charts_summary', '')}")
        for key, path in chart_paths.items():
            if key != "charts_summary":
                title_map = {
                    "condition_number_chart": "条件数边界图",
                    "violation_distribution": "违规分布图",
                    "status_distribution": "状态分布图",
                    "extrapolation_chart": "外推内插对比图",
                }
                title = title_map.get(key, key)
                print(f"     - {title}: {path}")

    return print_exit_summary(
        validator, checker, tracker,
        applied_override_count=len(applied_override_ids),
        active_results=active_results,
    )


def main():
    parser = argparse.ArgumentParser(
        prog="matrix-cond-check",
        description="矩阵条件数边界校验工具：一条命令跑完整包样例，输出历史时间线、明细、图表、违规定位。",
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
        "--override-file",
        default=None,
        help="人工改判CSV文件路径，格式见 data/manual_overrides.csv 示例",
    )
    parser.add_argument(
        "--no-charts",
        action="store_true",
        help="跳过图表生成，仅输出文本/CSV",
    )
    parser.add_argument(
        "--no-merge",
        action="store_true",
        help="关闭同名矩阵合并：即使多文件出现同一矩阵名称，也各自保留不互相覆盖",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="直接运行内置完整示例：首次校验 → 人工改判 → 晚到附件复算",
    )
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    if args.sample:
        print("🚀 运行内置完整示例：首次校验 → 人工改判 → 晚到附件复算")
        print("=" * 70 + "\n")

        sample_draft = os.path.join(base_dir, "data", "sample_draft.csv")
        manual_override = os.path.join(base_dir, "data", "manual_overrides.csv")
        late_attachment = os.path.join(base_dir, "data", "late_attachment.csv")

        print("【第 1/3 步】首次校验：加载计算草稿 sample_draft.csv")
        print("-" * 70)
        output_first = os.path.join(base_dir, "output", "first_run")
        code1 = run_pipeline(
            [sample_draft],
            output_first,
            expected_unit=args.unit,
            recheck=False,
            run_label="首次运行",
        )

        print("\n\n" + "#" * 70)
        print("【第 2/3 步】应用人工改判：加载 data/manual_overrides.csv")
        print("#" * 70 + "\n")
        output_overridden = os.path.join(base_dir, "output", "overridden_run")
        code2 = run_pipeline(
            [sample_draft],
            output_overridden,
            expected_unit=args.unit,
            recheck=False,
            override_file=manual_override,
            run_label="人工改判后",
        )

        print("\n\n" + "#" * 70)
        print("【第 3/3 步】晚到附件复算：结合 late_attachment.csv")
        print("#" * 70 + "\n")

        previous_results = {}
        detail_csv = os.path.join(output_overridden, "check_details.csv")
        if os.path.exists(detail_csv):
            import csv
            with open(detail_csv, "r", encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    if row.get("是否被晚到附件取代") == "是":
                        continue
                    previous_results[row["矩阵名称"]] = (row["是否通过"] == "通过")

        output_recheck = os.path.join(base_dir, "output", "recheck_run")
        code3 = run_pipeline(
            [sample_draft, late_attachment],
            output_recheck,
            expected_unit=args.unit,
            recheck=True,
            previous_results=previous_results,
            override_file=manual_override,
            run_label="晚到附件复算",
        )
        sys.exit(max(code1, code2, code3))

    if not args.input:
        args.input = [os.path.join(base_dir, "data", "sample_draft.csv")]

    exit_code = run_pipeline(
        args.input,
        args.output,
        expected_unit=args.unit,
        recheck=args.recheck,
        override_file=args.override_file,
        generate_charts_flag=not args.no_charts,
        merge_duplicates=not args.no_merge,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
