#!/usr/bin/env python3
"""
知识库召回人工改判 - 主入口脚本

功能:
1. 加载样本表、新旧模型结果、人工改判记录
2. 检测重复样本和坏数据
3. 对比新旧模型，融合人工改判（人工判断优先，不被阈值盖过）
4. 分析待确认事项（重复评测、阈值与人工冲突等）
5. 输出交付物：样本表、处理记录、历史时间线

用法:
    python run_review.py \
        --samples example_data/samples.csv \
        --old-model example_data/old_model_results.csv \
        --new-model example_data/new_model_results.csv \
        --manual-reviews example_data/manual_reviews.csv \
        --old-threshold 0.6 \
        --new-threshold 0.55 \
        --output output/
"""

import argparse
import os
import sys
from datetime import datetime

from kb_recall_review import (
    load_samples_from_csv,
    detect_duplicates,
    get_unique_samples,
    flag_bad_data,
    load_model_results_from_csv,
    load_manual_reviews_from_csv,
    compare_models,
    apply_manual_reviews,
    compute_metrics,
    find_threshold_influenced,
    build_timeline,
    analyze_duplicate_impact,
    analyze_bad_data_impact,
    analyze_threshold_vs_manual,
    summarize_confirmation_items,
    export_all,
    ReviewSummary,
)


def main():
    parser = argparse.ArgumentParser(description="知识库召回人工改判处理工具")
    parser.add_argument("--samples", required=True, help="样本表 CSV 路径")
    parser.add_argument("--old-model", required=True, help="旧模型结果 CSV 路径")
    parser.add_argument("--new-model", required=True, help="新模型结果 CSV 路径")
    parser.add_argument("--manual-reviews", default="", help="人工改判记录 CSV 路径")
    parser.add_argument("--old-threshold", type=float, default=0.6, help="旧模型阈值")
    parser.add_argument("--new-threshold", type=float, default=0.55, help="新模型阈值")
    parser.add_argument("--output", default="output", help="输出目录")
    parser.add_argument("--sheet-name", default="样本表", help="来源表名（用于标注行号来源）")

    args = parser.parse_args()

    print("=" * 60)
    print("知识库召回人工改判 - 处理开始")
    print("=" * 60)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    print("[1/7] 加载样本表...")
    samples = load_samples_from_csv(args.samples, sheet_name=args.sheet_name)
    print(f"  加载样本数: {len(samples)}")

    print("[2/7] 检测重复与坏数据...")
    samples = flag_bad_data(samples)
    duplicates, duplicate_groups = detect_duplicates(samples)
    unique_samples = get_unique_samples(samples)
    bad_data_count = sum(1 for s in unique_samples if s.is_bad_data)
    print(f"  去重后样本数: {len(unique_samples)}")
    print(f"  重复样本数: {len(duplicates)}")
    print(f"  坏数据数: {bad_data_count}")

    print("[3/7] 加载模型结果...")
    old_results = load_model_results_from_csv(args.old_model, "old_model", args.old_threshold)
    new_results = load_model_results_from_csv(args.new_model, "new_model", args.new_threshold)
    print(f"  旧模型结果数: {len(old_results)}")
    print(f"  新模型结果数: {len(new_results)}")

    print("[4/7] 加载人工改判...")
    manual_reviews = []
    if args.manual_reviews and os.path.exists(args.manual_reviews):
        manual_reviews = load_manual_reviews_from_csv(args.manual_reviews)
        print(f"  人工改判数: {len(manual_reviews)}")
    else:
        print("  未提供人工改判记录，将使用模型判断作为基准")

    print("[5/7] 模型对比与人工改判融合...")
    comparison = compare_models(unique_samples, old_results, new_results)
    comparison = apply_manual_reviews(comparison, manual_reviews)

    metrics = compute_metrics(comparison, exclude_bad_data=True)
    threshold_influenced = find_threshold_influenced(comparison)

    manual_changed_count = sum(
        1 for v in comparison.values()
        if v.get("manual_changed") and v["judgment_source"] == "manual"
    )
    threshold_changed_count = len(threshold_influenced)

    print(f"  旧模型命中率: {metrics['old_hit_rate']:.2%}")
    print(f"  新模型命中率: {metrics['new_hit_rate']:.2%}")
    print(f"  命中率变化: {metrics['new_hit_rate'] - metrics['old_hit_rate']:+.2%}")
    print(f"  人工改判修正数: {manual_changed_count}")
    print(f"  阈值影响数: {threshold_changed_count}")

    print("[6/7] 待确认事项分析...")
    dup_items = analyze_duplicate_impact(
        duplicates, duplicate_groups, old_results, new_results, manual_reviews
    )
    bad_items = analyze_bad_data_impact(unique_samples, comparison)
    thresh_items = analyze_threshold_vs_manual(comparison, threshold_influenced)

    all_confirmation_items = dup_items + bad_items + thresh_items
    conf_summary = summarize_confirmation_items(all_confirmation_items)

    print(f"  待确认事项数: {conf_summary['total_items']}")
    print(f"  涉及样本数: {conf_summary['unique_samples']}")

    print("[7/7] 生成交付物...")
    summary = ReviewSummary(
        total_samples=len(samples),
        unique_samples=len(unique_samples),
        bad_data_count=bad_data_count,
        duplicate_count=len(duplicates),
        old_model_hit_rate=metrics["old_hit_rate"],
        new_model_hit_rate=metrics["new_hit_rate"],
        manual_changed_count=manual_changed_count,
        threshold_changed_count=threshold_changed_count,
        needs_confirmation_count=conf_summary["total_items"],
    )

    timeline = build_timeline(unique_samples, old_results, new_results, manual_reviews)

    output_paths = export_all(
        output_dir=args.output,
        comparison=comparison,
        duplicates=duplicates,
        threshold_influenced=threshold_influenced,
        confirmation_items=all_confirmation_items,
        timeline=timeline,
        summary=summary,
        metrics=metrics,
        confirmation_summary=conf_summary,
    )

    print()
    print("=" * 60)
    print("处理完成！交付物清单：")
    print("=" * 60)
    for name, path in output_paths.items():
        print(f"  - {name}: {path}")
    print()
    print(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    print("要点说明:")
    print("  1. 样本、阈值、人工修正、指标变化在样本表中已分别列示")
    print("  2. 人工判断不会被阈值变化覆盖，人工改判优先")
    print("  3. 重复评测已单独标注，给出待确认原因和影响范围")
    print("  4. 坏数据已标记，可追溯原始行号")
    print("  5. 时间线记录了模型运行和人工改判的先后顺序")
    print()
    print("评测同事小孟可以用这些文件对给别人看：")
    print("  sample_table.csv    - 样本总表（主线）")
    print("  process_records.csv - 处理细节（重复/阈值/待确认）")
    print("  timeline.csv        - 历史时间线")
    print("  summary_report.txt  - 一页纸汇总")


if __name__ == "__main__":
    main()
