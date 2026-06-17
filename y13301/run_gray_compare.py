#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src import (
    GrayComparator,
    DuplicateDetector,
    MisjudgmentBacktest,
    ReportGenerator,
)
from src.models import JudgmentStatus, ModelPrediction
from data.samples import create_sample_data


def main():
    print("=" * 60)
    print("客服摘要灰度对比系统")
    print("=" * 60)
    print()

    samples, version_notes, withdrawals, supplementary = create_sample_data()
    print(f"[1/5] 加载数据完成：{len(samples)} 条样本，{len(version_notes)} 条版本说明")

    print("[2/5] 检测重复评测...")
    detector = DuplicateDetector()
    duplicates = detector.detect_from_notes(version_notes)

    if duplicates:
        print(f"  ⚠️  发现 {len(duplicates)} 条重复评测：")
        for dup in duplicates:
            print(f"    - 样本 {dup.sample_id}：涉及版本 {', '.join(dup.versions)}")
            print(f"      待确认原因：{dup.reason}")
            print(f"      影响范围：{dup.impact_scope}")
        print()
        print("  建议：先人工确认重复原因，确认后可调用 detector.confirm_duplicate()")
        print()

    samples = detector.mark_samples_pending(samples, duplicates)

    print("[3/5] 误判样本回测...")
    backtest = MisjudgmentBacktest()
    misjudged = [s for s in samples if "误判样本" in s.tags and not s.is_misjudgment_backtest]
    print(f"  找到 {len(misjudged)} 条旧模型误判样本，准备回测...")

    new_predictions = {}
    for s in misjudged:
        if s.new_model:
            new_pred = ModelPrediction(
                model_version=s.new_model.model_version + "_backtest",
                score=s.new_model.score,
                judgment=s.new_model.judgment,
                threshold=s.new_model.threshold,
                features=s.new_model.features.copy(),
                explanation=s.new_model.explanation,
            )
            new_predictions[s.sample_id] = new_pred

    backtest_samples = backtest.batch_backtest(misjudged, new_predictions)
    samples.extend(backtest_samples)

    backtest_stats = backtest.analyze_backtest_results(backtest_samples)
    print(f"  回测完成：{backtest_stats['corrected_count']}/{backtest_stats['total_backtest']} 条已修正")
    print(f"  修正率：{backtest_stats['correction_rate']:.1%}")

    print()
    print("[4/5] 新旧模型对比...")
    comparator = GrayComparator(
        old_threshold=0.5,
        new_threshold=0.5,
        respect_manual=True,
    )
    result = comparator.compare(samples, duplicates)

    print(f"  总样本数：{result.total_samples}")
    print(f"  模型一致：{result.consistent_count}")
    print(f"  模型不一致：{result.inconsistent_count}")
    print(f"  人工改判：{result.manual_revised_count}")
    print(f"  待补材料：{result.pending_count}")
    print(f"  待确认：{result.to_confirm_count}")
    print(f"  受阈值影响：{result.threshold_impact_count}")

    print()
    print("[5/5] 生成Markdown报告...")
    generator = ReportGenerator(title="客服摘要灰度对比报告")
    report_content = generator.generate(
        result=result,
        version_notes=version_notes,
        withdrawals=withdrawals,
        supplementary=supplementary,
        include_samples=True,
    )

    output_path = Path(__file__).parent / "output" / "gray_comparison_report.md"
    generator.save_to_file(report_content, str(output_path))

    print(f"  报告已生成：{output_path}")
    print()
    print("=" * 60)
    print("对比完成！请查看 output/gray_comparison_report.md")
    print("=" * 60)

    pending_confirm = [d for d in duplicates if not d.confirmed]
    if pending_confirm:
        print()
        print(f"⚠️  注意：仍有 {len(pending_confirm)} 条重复评测待确认，")
        print("         报告中已标记为『待确认』，暂未计入最终统计。")
        print("         请先人工确认后重新运行。")

    return 0


if __name__ == "__main__":
    sys.exit(main())
