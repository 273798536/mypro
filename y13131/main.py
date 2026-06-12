import argparse
import json
import os
import sys

from convex_hull_verify import (
    ItemStatus,
    build_unit_missing_report,
    check_unit_missing,
    load_manual_overrides,
    load_question_items,
    load_supplementary_notes,
    verify_item,
    generate_status_summary,
    write_results_csv,
    write_status_csv,
    write_trace_json,
)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")


def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def run_verification(question_csv=None, override_csv=None, notes_csv=None,
                     threshold=0.05, skip_unit_check=False):
    q_path = question_csv or os.path.join(DATA_DIR, "question_items.csv")
    o_path = override_csv or os.path.join(DATA_DIR, "manual_overrides.csv")
    n_path = notes_csv or os.path.join(DATA_DIR, "supplementary_notes.csv")

    print("=" * 60)
    print("凸包面积边界校验")
    print("=" * 60)

    print(f"\n[1/5] 加载题目清单: {q_path}")
    items = load_question_items(q_path)
    print(f"      共 {len(items)} 条题目")

    print(f"\n[2/5] 加载人工改判记录: {o_path}")
    overrides = []
    if os.path.exists(o_path):
        overrides = load_manual_overrides(o_path)
        print(f"      共 {len(overrides)} 条改判")
    else:
        print("      未找到改判文件，跳过")

    print(f"\n[3/5] 加载后补说明: {n_path}")
    notes = []
    if os.path.exists(n_path):
        notes = load_supplementary_notes(n_path)
        print(f"      共 {len(notes)} 条说明")
    else:
        print("      未找到后补说明文件，跳过")

    if not skip_unit_check:
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

    print("\n[5/5] 逐条执行凸包面积校验")
    results = []
    prev_area = 0.0
    for item in items:
        if item.status == ItemStatus.UNIT_MISSING and not skip_unit_check:
            from convex_hull_verify import VerificationResult
            result = VerificationResult(
                item_id=item.item_id,
                convex_hull_area=0.0,
                boundary_points=[],
                status=ItemStatus.UNIT_MISSING,
                unit_missing=True,
                notes="单位缺失，跳过计算",
            )
            results.append(result)
            print(f"      {item.item_id}: ⚠ 单位缺失，跳过")
            continue

        result = verify_item(item, overrides, notes, prev_area=prev_area, threshold=threshold)
        results.append(result)

        status_icon = "✓" if result.status == ItemStatus.CONFIRMED else "⚠"
        cause_str = ""
        if result.jump_causes:
            cause_str = f" [跳变归因: {', '.join(c.value for c in result.jump_causes)}]"
        print(f"      {item.item_id}: {status_icon} 面积={result.convex_hull_area:.4f} "
              f"状态={result.status.value}{cause_str}")

        prev_area = result.convex_hull_area

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

    print("\n" + "=" * 60)
    print("状态总览")
    print("=" * 60)
    print(f"  已处理:       {summary['confirmed']} 条  {summary['confirmed_ids']}")
    print(f"  待补证据:     {summary['pending_evidence']} 条  {summary['pending_ids']}")
    print(f"  单位缺失-待确认: {summary['unit_missing']} 条  {summary['unit_missing_ids']}")
    print(f"  总计:         {summary['total']} 条")
    print("=" * 60)

    return results


def main():
    parser = argparse.ArgumentParser(
        description="凸包面积边界校验工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  python main.py                           # 使用默认示例数据运行
  python main.py --questions data/my.csv   # 指定题目清单
  python main.py --skip-unit-check         # 跳过单位检测继续计算
  python main.py --threshold 0.10          # 自定义跳变阈值
        """,
    )
    parser.add_argument("--questions", help="题目清单CSV路径", default=None)
    parser.add_argument("--overrides", help="人工改判记录CSV路径", default=None)
    parser.add_argument("--notes", help="后补说明CSV路径", default=None)
    parser.add_argument("--threshold", type=float, default=0.05, help="跳变检测阈值（默认0.05）")
    parser.add_argument("--skip-unit-check", action="store_true", help="跳过单位缺失检测")

    args = parser.parse_args()
    run_verification(
        question_csv=args.questions,
        override_csv=args.overrides,
        notes_csv=args.notes,
        threshold=args.threshold,
        skip_unit_check=args.skip_unit_check,
    )


if __name__ == "__main__":
    main()
