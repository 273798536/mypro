#!/usr/bin/env python3
"""
组合计数图表解释 - 一键运行脚本
用法: python3 run_combo.py [--clean]
"""
import json
import sys
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

from combo_chart_explainer import Runner, ChartGenerator


def main():
    parser = argparse.ArgumentParser(description="组合计数图表解释 - 一键运行")
    parser.add_argument("--clean", action="store_true", help="清空历史记录后运行")
    parser.add_argument("--rerun", action="store_true", help="对上次结果进行重跑验证")
    args = parser.parse_args()

    print("=" * 70)
    print("组合计数图表解释 - 完整样例运行")
    print("=" * 70)
    print()

    runner = Runner(
        data_dir=str(BASE_DIR / "data"),
        output_dir=str(BASE_DIR / "output"),
        max_combo_size=3,
        weight_bounds=(0.0, 100.0),
        count_bounds=(1, 10000),
    )

    if args.clean:
        hist_file = BASE_DIR / "output" / "change_history.json"
        if hist_file.exists():
            hist_file.unlink()
            print("[清理] 已删除历史记录文件")

    runner.history.load()

    print("[步骤 1/5] 加载题目清单（保留原始来源和脏数据痕迹）...")
    questions_file = BASE_DIR / "samples" / "questions_sample.json"
    loaded_questions = runner.load_questions_from_json(
        str(questions_file),
        source_name="2026年6月建模题库原始导出"
    )
    print(f"  ✓ 加载 {len(loaded_questions)} 道题目")
    dirty_count = sum(1 for q in runner.questions if q.is_dirty)
    if dirty_count > 0:
        print(f"  ⚠ 检测到 {dirty_count} 条脏数据，已保留原始痕迹，未做清洗")
        for q in runner.questions:
            if q.is_dirty:
                print(f"    · {q.qid}: {q.dirty_reason}")
    print()

    print("[步骤 2/5] 加载权重和出现次数（记录变更历史）...")
    weights_file = BASE_DIR / "samples" / "weights_sample.json"
    with open(weights_file, "r", encoding="utf-8") as f:
        weight_data = json.load(f)

    for w in weight_data["weights"]:
        runner.set_weight(
            qid=w["qid"],
            weight=w["weight"],
            changed_by=w.get("changed_by", "unknown"),
            reason=w.get("reason", ""),
        )

    for qid, count in weight_data["occurrence_counts"].items():
        runner.set_occurrence_count(qid, count)

    print(f"  ✓ 设置 {len(weight_data['weights'])} 个权重")
    print(f"  ✓ 设置 {len(weight_data['occurrence_counts'])} 个出现次数")

    bad_weight_qid = "Q005"
    bad_weight = weight_data["weights"][4]["weight"]
    print(f"  ⚠ 故意设置 {bad_weight_qid} 权重={bad_weight}，超出范围[0, 100]，用于测试外推越界检测")
    print()

    runner.history.print_summary()

    print("[步骤 3/5] 执行组合计数计算...")
    result = runner.run()
    print(f"  ✓ 运行ID: {result.run_id}")
    print(f"  ✓ 总组合数: {result.total_combos}")
    print(f"  ✓ 总权重: {result.total_weight:.4f}")
    print(f"  ✓ 外推越界错误: {len(result.errors)} 个")
    print()

    print("[步骤 4/5] 生成图表并校验口径一致性...")
    chart_gen = ChartGenerator()
    chart_gen.print_chart(result)

    if result.errors:
        print("外推越界卡壳点明细:")
        for i, err in enumerate(result.errors, 1):
            print(f"  {i}. 题目 {err.qid}:")
            print(f"     字段: {err.field_name} = {err.current_value}")
            print(f"     有效范围: [{err.lower_bound}, {err.upper_bound}]")
            print(f"     问题: {err.message}")
        print()

    print("[步骤 5/5] 导出CSV明细（页面状态与文件状态一致）...")
    csv_files = runner.export_csv(result)
    print(f"  ✓ 明细文件: {csv_files['details']}")
    print(f"  ✓ 汇总文件: {csv_files['summary']}")
    print(f"  ✓ 权重变更记录: {csv_files['weight_changes']}")

    verify_result = runner.verify_csv(csv_files["details"], result)
    print()
    print("CSV状态一致性校验:")
    print(f"  文件存在: {'✓ 是' if verify_result['exists'] else '✗ 否'}")
    print(f"  总数一致: {'✓ 是' if verify_result.get('is_consistent', False) else '✗ 否'}")
    if "error" in verify_result:
        print(f"  错误: {verify_result['error']}")
    print()

    if args.rerun:
        print("[重跑验证] 对上次结果进行复算...")
        rerun_result = runner.rerun(result)
        print(f"  ✓ 重跑ID: {rerun_result.run_id}")
        print(f"  ✓ 原总组合数: {result.total_combos}, 重跑总组合数: {rerun_result.total_combos}")
        print(f"  ✓ 结果一致: {'✓ 是' if result.total_combos == rerun_result.total_combos else '✗ 否'}")
        print()

        print("复算图表口径一致性:")
        chart_gen.print_chart(rerun_result)
        result = rerun_result

    print()
    print("=" * 70)
    runner.print_exit_summary(result)

    print()
    print("退出提示：")
    if result.errors:
        for err in result.errors:
            print(f"  ✗ 外推越界卡壳在: 题目[{err.qid}]的{err.field_name}={err.current_value}，")
            print(f"    有效范围是[{err.lower_bound}, {err.upper_bound}]。")
            print(f"    原始数据已保留，请检查权重配置是否合理，或调整 weight_bounds。")
    else:
        print("  ✓ 运行正常，无外推越界。")

    print()
    print("=" * 70)
    print("运行完成。输出文件位于 output/ 目录。")
    print("=" * 70)

    return 0 if not result.errors else 1


if __name__ == "__main__":
    sys.exit(main())
