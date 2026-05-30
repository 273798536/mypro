"""CLI入口 - 贝叶斯质检抽样命令行工具"""

import argparse
import sys
import os
from typing import List, Dict, Tuple

from .models import PriorParams, BayesianResult
from .io_handler import InputReader
from .analysis import BayesianAnalyzer
from .history import HistoryManager
from .report import ReportGenerator


def parse_args() -> argparse.Namespace:
    """解析命令行参数"""
    parser = argparse.ArgumentParser(
        description="贝叶斯质检抽样分析工具 - 基于Beta分布共轭先验的批次质量评估",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本用法 - 指定输入输出目录
  bayesian-qc --input ./data --output ./results

  # 指定可接受缺陷率阈值
  bayesian-qc --input ./data --output ./results --threshold 0.03

  # 启用批次对比
  bayesian-qc --input ./data --output ./results --compare

  # 清空历史记录后重新分析
  bayesian-qc --input ./data --output ./results --clear-history
        """,
    )

    parser.add_argument(
        "--input", "-i",
        required=True,
        help="输入数据目录 (包含抽样记录、先验参数等文件)",
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="输出结果目录 (报告、历史记录将保存于此)",
    )
    parser.add_argument(
        "--threshold", "-t",
        type=float,
        default=0.02,
        help="可接受缺陷率阈值 (默认: 0.02, 即2%)",
    )
    parser.add_argument(
        "--credible-level",
        type=float,
        default=0.95,
        help="置信水平 (默认: 0.95, 即95%)",
    )
    parser.add_argument(
        "--compare",
        action="store_true",
        help="启用批次对比分析",
    )
    parser.add_argument(
        "--clear-history",
        action="store_true",
        help="清空历史记录后重新分析",
    )
    parser.add_argument(
        "--no-report",
        action="store_true",
        help="不生成可转发报告 (仅输出终端摘要)",
    )
    parser.add_argument(
        "--prior-alpha",
        type=float,
        help="强制指定先验Alpha参数 (覆盖文件配置)",
    )
    parser.add_argument(
        "--prior-beta",
        type=float,
        help="强制指定先验Beta参数 (覆盖文件配置)",
    )

    return parser.parse_args()


def run_analysis(args: argparse.Namespace) -> int:
    """执行分析主流程"""
    try:
        input_reader = InputReader(args.input)
    except ValueError as e:
        print(f"错误: {e}")
        return 1

    history_manager = HistoryManager(args.output)
    if args.clear_history:
        history_manager.clear()
        print("已清空历史记录")

    prior = input_reader.read_prior()
    if args.prior_alpha is not None and args.prior_beta is not None:
        prior = PriorParams(
            alpha=args.prior_alpha,
            beta=args.prior_beta,
            description="命令行指定先验",
            source="CLI参数",
        )
    if prior is None:
        prior = PriorParams(alpha=1.0, beta=1.0, description="无信息先验", source="默认配置")
        print("提示: 未找到先验参数文件，使用默认无信息先验 Beta(α=1.0, β=1.0)")

    batches = input_reader.get_samples_by_batch()
    if not batches:
        print("错误: 未找到任何抽样记录")
        print(f"请确保 {args.input} 目录下包含有效的抽样记录文件 (JSON/CSV)")
        return 1

    print(f"找到 {len(batches)} 个批次的抽样记录")
    for batch_id, samples in batches.items():
        print(f"  - 批次 {batch_id}: {len(samples)} 个样本")

    analyzer = BayesianAnalyzer(
        credible_level=args.credible_level,
        defect_threshold=args.threshold,
    )

    report_generator = ReportGenerator(args.output)

    results: List[BayesianResult] = []
    is_new: Dict[str, bool] = {}
    compared_results = history_manager.get_all_results() if args.compare else None

    for batch_id, samples in sorted(batches.items()):
        existing = history_manager.get_existing(batch_id, samples, prior)
        if existing is not None:
            results.append(existing.result)
            is_new[batch_id] = False
            print(f"\n批次 {batch_id}: 复用历史记录 (相同输入已去重)")
            continue

        compared = compared_results if args.compare else None
        result = analyzer.analyze(batch_id, samples, prior, compared)

        record, new_flag = history_manager.add(result, samples, prior)
        results.append(result)
        is_new[batch_id] = new_flag

        if args.compare and batch_id not in compared_results:
            compared_results[batch_id] = result

    terminal_summary = report_generator.generate_terminal_summary(results, is_new)
    print("\n" + terminal_summary)

    if not args.no_report:
        report_path = report_generator.generate_shareable_report(results)
        json_path = report_generator.generate_json_result(results)
        print(f"\n📄 可转发报告已生成: {report_path}")
        print(f"📊 JSON结果已生成: {json_path}")

    print(f"\n📜 历史记录已保存至: {os.path.join(args.output, 'history.json')}")

    return 0


def main() -> int:
    """主入口函数"""
    args = parse_args()
    return run_analysis(args)


if __name__ == "__main__":
    sys.exit(main())
