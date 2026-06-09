#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import List, Optional

import numpy as np

from normality_checker import (
    DataProcessor,
    NormalityTester,
    NormalityVisualizer,
    ReportGenerator,
)
from normality_checker.core import NormalityVerdict


def parse_args():
    parser = argparse.ArgumentParser(
        description="正态性检验说明器 - 建模社助教批量处理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 使用内置边界样例运行:
    python run_cli.py --demo

  # 运行并导出Excel报告:
    python run_cli.py --demo --excel report.xlsx

  # 自定义数据（逗号分隔):
    python run_cli.py -d "1.2,2.3,3.4,4.5,5.6,6.7 -n "我的数据" -s "材料A.xlsx

  # 从JSON文件加载多组数据:
    python run_cli.py --json input.json --output ./output

  # 生成图表:
    python run_cli.py --demo --charts ./charts
        """,
    )
    parser.add_argument("--demo", action="store_true",
                        help="使用内置边界测试样例运行")
    parser.add_argument("-d", "--data", type=str,
                        help="单组数据，逗号/空格分隔的数值")
    parser.add_argument("-n", "--name", type=str, default="未命名",
                        help="数据集名称")
    parser.add_argument("-s", "--source", type=str, default="未知材料",
                        help="来源材料名称")
    parser.add_argument("--json", type=str,
                        help='从JSON文件加载多组数据，格式: [{"name":..., "source":..., "data":..., "gaps":[...]}]')
    parser.add_argument("--alpha", type=float, default=0.05,
                        help="显著性水平α (默认0.05)")
    parser.add_argument("--no-outlier-removal", action="store_true",
                        help="不移除异常值")
    parser.add_argument("--outlier-method", choices=["iqr", "zscore"],
                        default="iqr",
                        help="异常值检测方法 (默认iqr)")
    parser.add_argument("--excel", type=str, default=None,
                        help="导出Excel报告的文件路径")
    parser.add_argument("--csv", type=str, default=None,
                        help="导出CSV报告的目录路径")
    parser.add_argument("--charts", type=str, default=None,
                        help="导出图表的目录路径")
    parser.add_argument("--txt", type=str, default=None,
                        help="导出文字摘要的文件路径")
    parser.add_argument("--no-comparison", action="store_true",
                        help="不生成清洗前后对比图")
    parser.add_argument("--dpi", type=int, default=120,
                        help="图表DPI")
    parser.add_argument("--author", type=str, default="建模社助教",
                        help="报告编制人")
    return parser.parse_args()


def load_from_json(path: str) -> list:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    args = parse_args()
    datasets = []

    if args.demo:
        print("📊 使用内置边界测试样例...")
        datasets = DataProcessor.create_edge_case_datasets()
    elif args.json:
        if not os.path.exists(args.json):
            print(f"❌ JSON文件不存在: {args.json}")
            sys.exit(1)
        datasets = load_from_json(args.json)
    elif args.data:
        datasets = [{
            "name": args.name,
            "source": args.source,
            "data": args.data,
            "gaps": [],
        }]
    else:
        print("ℹ️ 未提供数据，使用 --demo 或指定 --data / --json\n")
        args.demo = True
        datasets = DataProcessor.create_edge_case_datasets()

    processor = DataProcessor(
        remove_outliers=not args.no_outlier_removal,
        outlier_method=args.outlier_method,
    )
    tester = NormalityTester(alpha=args.alpha)
    visualizer = NormalityVisualizer(dpi=args.dpi)
    reporter = ReportGenerator(author=args.author)

    processed_list = []
    results_list = []
    vis_list = []

    print("\n" + "=" * 60)
    print("  正态性检验说明器 - 批量处理")
    print("=" * 60 + "\n")

    for i, ds in enumerate(datasets):
        name = ds.get("name", f"数据集{i+1}")
        source = ds.get("source", "未知材料")
        data = ds.get("data", [])
        gaps = ds.get("gaps", [])

        print(f"[{i+1}/{len(datasets)}] 处理: {name}")
        print(f"    来源: {source}")

        processed = processor.process(data, name, source, known_gaps=gaps)
        processed_list.append(processed)

        if processed.can_test:
            result = tester.run_all_tests(
                processed.cleaned_data,
                processed.dataset_name,
                processed.source_material,
                gaps=processed.gaps,
            )
            results_list.append(result)

            print(f"    ✅ 样本量: {processed.n_clean} | 结论: {result.overall_verdict.value} "
                  f"({result.overall_confidence:.1%})")

            if result.issues:
                for issue in result.issues[:3]:
                    print(f"    ⚠️  {issue}")
            if processed.gaps:
                for gap in processed.gaps[:3]:
                    print(f"    📋 缺口: {gap}")

            vis = visualizer.generate_all(
                processed, result,
                include_comparison=not args.no_comparison,
            )
            vis_list.append(vis)

            if vis.failed_figures:
                print(f"    🖼️  图表成功 {vis.success_count} 张, 失败 {vis.fail_count} 张")
        else:
            results_list.append(None)
            vis_empty = visualizer.generate_all(processed, None)
            vis_list.append(vis_empty)
            reason = processed.issues[0] if processed.issues else "数据为空"
            print(f"    ❌ 无法检验: {reason}")

        print()

    report = reporter.generate_batch_report(processed_list, results_list)

    print("=" * 60)
    print("  汇总")
    print("=" * 60)
    print(f"  数据集总数: {report.n_datasets}")
    print(f"  成功得出结论: {report.n_success}")
    print(f"  空集合: {report.n_empty}")
    print(f"  含材料缺口: {report.n_with_gaps}")
    print("=" * 60 + "\n")

    text_summary = reporter.generate_text_summary(report)
    print(text_summary)

    if args.txt:
        with open(args.txt, "w", encoding="utf-8") as f:
            f.write(text_summary)
        print(f"\n📝 文字摘要已保存: {args.txt}")

    if args.excel:
        path = reporter.export_to_excel(report, args.excel)
        print(f"📄 Excel报告已保存: {path}")

    if args.csv:
        files = reporter.export_to_csv(report, args.csv)
        print(f"📑 CSV报告已保存 {len(files)} 个文件至: {args.csv}")

    if args.charts:
        os.makedirs(args.charts, exist_ok=True)
        all_saved = []
        all_failed = []
        for processed, vis in zip(processed_list, vis_list):
            saved, failed = visualizer.save_all(vis, args.charts)
            all_saved.extend(saved)
            all_failed.extend(failed)
        print(f"🖼️  图表已保存 {len(all_saved)} 张至: {args.charts}")
        if all_failed:
            print(f"   失败 {len(all_failed)} 张:")
            for f in all_failed:
                print(f"     - {f}")

    if not any([args.txt, args.excel, args.csv, args.charts]):
        print("=" * 60)
        print("  处理完成！使用以下参数保存结果:")
        print("    --excel <文件>   导出Excel报告")
        print("    --csv <目录>     导出CSV报告")
        print("    --charts <目录>   导出图表")
        print("    --txt <文件>   导出文字摘要")
        print("=" * 60)

    print("\n✅ 全部处理完成!")


if __name__ == "__main__":
    main()
