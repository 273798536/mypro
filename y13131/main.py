import argparse
import json
import os

from convex_hull_verify import (
    ItemStatus,
    RunMeta,
    RunParameters,
    VerificationResult,
    build_unit_missing_report,
    check_unit_missing,
    clear_runs,
    cross_run_compare,
    file_hash,
    generate_html_report,
    generate_run_id,
    generate_status_summary,
    get_baseline_run,
    list_runs,
    load_manual_overrides,
    load_question_items,
    load_supplementary_notes,
    save_run_artifact,
    set_baseline,
    verify_item,
    write_results_csv,
    write_status_csv,
    write_trace_json,
)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")


def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def print_runs_table(runs):
    print(f"{'运行ID':<18} {'时间':<25} {'标签':<15} {'基准':<6}")
    print("-" * 70)
    for r in runs:
        baseline_marker = "✓" if r["is_baseline"] else ""
        print(f"{r['run_id']:<18} {r['timestamp']:<25} {r['label']:<15} {baseline_marker:<6}")


def build_run_parameters(args) -> RunParameters:
    q_path = args.questions or os.path.join(DATA_DIR, "question_items.csv")
    o_path = args.overrides or os.path.join(DATA_DIR, "manual_overrides.csv")
    n_path = args.notes or os.path.join(DATA_DIR, "supplementary_notes.csv")
    return RunParameters(
        threshold=args.threshold,
        skip_unit_check=args.skip_unit_check,
        question_file=q_path,
        override_file=o_path,
        notes_file=n_path,
        question_file_hash=file_hash(q_path),
        override_file_hash=file_hash(o_path),
        notes_file_hash=file_hash(n_path),
    )


def run_verification(args):
    params = build_run_parameters(args)
    q_path = params.question_file
    o_path = params.override_file
    n_path = params.notes_file

    print("=" * 70)
    print("凸包面积边界校验")
    print("=" * 70)

    baseline_run = get_baseline_run(OUTPUT_DIR)
    baseline_label = "无"
    if baseline_run:
        bmeta = baseline_run.get("meta", {})
        baseline_label = bmeta.get("label") or bmeta.get("run_id", "")
        print(f"\n基准运行: {baseline_label} (将进行跨运行对比)")
    else:
        print(f"\n基准运行: 无 (本次结果可用 --set-baseline 设为基准)")

    print(f"\n[1/5] 加载题目清单: {q_path}")
    items = load_question_items(q_path)
    print(f"      共 {len(items)} 条题目")

    print(f"\n[2/5] 加载人工改判记录: {o_path}")
    overrides = load_manual_overrides(o_path)
    print(f"      共 {len(overrides)} 条改判")

    print(f"\n[3/5] 加载后补说明: {n_path}")
    notes = load_supplementary_notes(n_path)
    print(f"      共 {len(notes)} 条说明")

    baseline_item_map = {}
    baseline_overrides = []
    if baseline_run:
        try:
            baseline_params = RunParameters(**baseline_run["meta"]["parameters"])
            baseline_item_map = {
                it.item_id: it for it in load_question_items(baseline_params.question_file)
            }
            baseline_overrides = load_manual_overrides(baseline_params.override_file)
        except Exception as e:
            print(f"      ⚠ 加载基准运行数据失败: {e}")
            baseline_run = None

    if not args.skip_unit_check:
        print("\n[4/5] 单位缺失检测")
        missing = check_unit_missing(items)
        if missing:
            report = build_unit_missing_report(missing)
            ensure_output_dir()
            unit_report_path = os.path.join(OUTPUT_DIR, "unit_missing_report.json")
            with open(unit_report_path, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            print(f"      ⚠ 发现 {len(missing)} 条单位缺失，暂停计算")
            for m in missing:
                print(f"        - {m.item_id}: {m.description} (value={m.value})")
            print(f"      单位缺失报告已写入: {unit_report_path}")
            print("      请确认单位后重新运行（可加 --skip-unit-check 跳过检测继续计算）")
            print("\n      待确认原因: 题目清单中未标注度量单位")
            print("      影响范围: 凸包面积计算结果缺乏量纲，无法与标准答案比对")
            return None
        else:
            print("      ✓ 所有题目单位完整")
    else:
        print("\n[4/5] 单位缺失检测（已跳过）")

    print("\n[5/5] 逐条执行凸包面积校验（跨运行对比模式）")
    results = []
    for idx, item in enumerate(items, 1):
        if item.status == ItemStatus.UNIT_MISSING and not args.skip_unit_check:
            result = VerificationResult(
                item_id=item.item_id,
                convex_hull_area=0.0,
                boundary_points=[],
                status=ItemStatus.UNIT_MISSING,
                unit_missing=True,
                notes="单位缺失，跳过计算",
            )
            results.append(result)
            print(f"  [{idx}/{len(items)}] {item.item_id}: ⚠ 单位缺失，跳过")
            continue

        temp_result_for_compare = verify_item(
            item, overrides, notes, threshold=args.threshold
        )

        baseline_comparison = cross_run_compare(
            temp_result_for_compare,
            item,
            params,
            overrides,
            baseline_run,
            baseline_item_map,
            baseline_overrides,
        ) if baseline_run else None

        result = verify_item(
            item, overrides, notes, threshold=args.threshold,
            baseline_comparison=baseline_comparison,
        )
        results.append(result)

        status_icon = "✓" if result.status == ItemStatus.CONFIRMED else "⚠"
        cause_str = ""
        if result.jump_causes:
            cause_str = f" [跳变归因: {', '.join(c.value for c in result.jump_causes)}]"
        baseline_info = ""
        if baseline_comparison and baseline_comparison.final_causes:
            baseline_info = f" (vs 基准 Δ={baseline_comparison.relative_delta*100:.2f}%)"
        elif baseline_comparison:
            baseline_info = f" (vs 基准 Δ={baseline_comparison.relative_delta*100:.2f}%)"
        print(f"  [{idx}/{len(items)}] {item.item_id}: {status_icon} 面积={result.convex_hull_area:.4f} "
              f"状态={result.status.value}{baseline_info}{cause_str}")

    ensure_output_dir()

    results_csv = os.path.join(OUTPUT_DIR, "verification_results.csv")
    write_results_csv(results, results_csv)
    print(f"\n      校验结果明细: {results_csv}")

    trace_json = os.path.join(OUTPUT_DIR, "verification_trace.json")
    write_trace_json(results, trace_json)
    print(f"      逐步骤追溯: {trace_json}")

    summary = generate_status_summary(results)
    status_csv = os.path.join(OUTPUT_DIR, "verification_status.csv")
    write_status_csv(summary, status_csv)
    print(f"      状态总览: {status_csv}")

    run_id = generate_run_id()
    run_meta = RunMeta(
        run_id=run_id,
        timestamp=run_id,
        parameters=params,
        label=args.label or "",
        is_baseline=False,
    )

    artifact_path = save_run_artifact(OUTPUT_DIR, run_meta, results, summary)
    print(f"      运行存档: {artifact_path}")

    html_report = os.path.join(OUTPUT_DIR, "verification_report.html")
    generate_html_report(results, summary, run_meta, baseline_run, html_report)
    print(f"      Web 报告: {html_report}")

    print("\n" + "=" * 70)
    print("状态总览")
    print("=" * 70)
    print(f"  已处理:         {summary['confirmed']} 条  {summary['confirmed_ids']}")
    print(f"  待补证据:       {summary['pending_evidence']} 条  {summary['pending_ids']}")
    print(f"  单位缺失-待确认: {summary['unit_missing']} 条  {summary['unit_missing_ids']}")
    print(f"  总计:           {summary['total']} 条")
    print("=" * 70)

    if not baseline_run:
        print(f"\n提示: 首次运行，可用以下命令设为基准:")
        print(f"  python3 main.py --set-baseline {run_id}")
    print(f"\n查看历史运行: python3 main.py --list-runs")
    print(f"打开 Web 报告: open {html_report}")

    return run_id


def main():
    parser = argparse.ArgumentParser(
        description="凸包面积边界校验工具 - 支持跨运行对比与追溯",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
完整工作流示例:
  # 1. 首次运行（设为基准）
  python3 main.py --skip-unit-check --label "原始参数"
  python3 main.py --set-baseline <RUN_ID>

  # 2. 调整阈值再跑，自动与基准对比
  python3 main.py --skip-unit-check --threshold 0.10 --label "阈值0.10"

  # 3. 修改改判记录再跑，自动归因
  # （修改 data/manual_overrides.csv 后）
  python3 main.py --skip-unit-check --label "新增改判"

  # 查看历史运行
  python3 main.py --list-runs

  # 查看输出
  open output/verification_report.html
        """,
    )
    parser.add_argument("--questions", help="题目清单CSV路径", default=None)
    parser.add_argument("--overrides", help="人工改判记录CSV路径", default=None)
    parser.add_argument("--notes", help="后补说明CSV路径", default=None)
    parser.add_argument("--threshold", type=float, default=0.05, help="跳变检测阈值（默认0.05）")
    parser.add_argument("--skip-unit-check", action="store_true", help="跳过单位缺失检测")
    parser.add_argument("--label", help="本次运行标签，便于识别", default="")

    group = parser.add_mutually_exclusive_group()
    group.add_argument("--list-runs", action="store_true", help="列出所有历史运行")
    group.add_argument("--set-baseline", metavar="RUN_ID", help="将指定运行设为基准")
    group.add_argument("--clear-runs", action="store_true", help="清除所有历史运行存档")

    args = parser.parse_args()

    if args.list_runs:
        runs = list_runs(OUTPUT_DIR)
        if not runs:
            print("暂无历史运行记录")
        else:
            print_runs_table(runs)
        return

    if args.set_baseline:
        ok = set_baseline(OUTPUT_DIR, args.set_baseline)
        if ok:
            print(f"✓ 已将 {args.set_baseline} 设为基准运行")
        else:
            print(f"✗ 未找到运行 {args.set_baseline}")
        return

    if args.clear_runs:
        count = clear_runs(OUTPUT_DIR)
        print(f"已清除 {count} 个历史运行存档")
        return

    run_verification(args)


if __name__ == "__main__":
    main()
