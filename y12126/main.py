#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import sys
from datetime import datetime
from typing import List

from parlay_risk.models import MatchOdds, StakeRecord, MatchResult
from parlay_risk.calculator import ParlayCalculator
from parlay_risk.report import ReportGenerator


def load_json_file(file_path: str) -> List[dict]:
    if not os.path.exists(file_path):
        print(f"❌ 文件不存在: {file_path}")
        sys.exit(1)
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ JSON解析错误 {file_path}: {e}")
        sys.exit(1)


def load_input_data(input_dir: str):
    odds_path = os.path.join(input_dir, "odds.json")
    stakes_path = os.path.join(input_dir, "stakes.json")
    results_path = os.path.join(input_dir, "results.json")
    parlays_path = os.path.join(input_dir, "parlays.json")

    print(f"📂 加载输入数据 from: {input_dir}")
    odds_data = load_json_file(odds_path)
    stakes_data = load_json_file(stakes_path)
    results_data = load_json_file(results_path)
    parlays_data = load_json_file(parlays_path)

    odds = [MatchOdds.from_dict(o) for o in odds_data]
    stakes = [StakeRecord.from_dict(s) for s in stakes_data]
    results = [MatchResult.from_dict(r) for r in results_data]

    print(f"  ✓ 赔率: {len(odds)} 条")
    print(f"  ✓ 本金: {len(stakes)} 条")
    print(f"  ✓ 赛果: {len(results)} 条")
    print(f"  ✓ 组合: {len(parlays_data)} 个")

    return odds, stakes, results, parlays_data


def run_analysis(args):
    input_dir = os.path.abspath(args.input_dir)
    output_dir = os.path.abspath(args.output_dir)

    odds, stakes, results, parlays_data = load_input_data(input_dir)

    current_time = datetime.now()
    if args.as_of:
        try:
            current_time = datetime.fromisoformat(args.as_of)
            print(f"⏰ 使用指定时间: {current_time.isoformat()}")
        except ValueError:
            print(f"❌ 时间格式错误，请使用 ISO 格式 (如: 2026-05-31T12:00:00)")
            sys.exit(1)

    print(f"\n🧮 开始计算分析...")
    calculator = ParlayCalculator(current_time=current_time)
    calculator.load_data(odds, results, stakes)

    report = calculator.calculate_report(parlays_data)

    print(f"📝 生成报告 to: {output_dir}")
    report_gen = ReportGenerator(output_dir)
    report_gen.generate_all(report)

    return report, report_gen


def run_trace(args, report=None, report_gen=None):
    output_dir = os.path.abspath(args.output_dir)
    report_gen = report_gen or ReportGenerator(output_dir)

    if report:
        success = report_gen.print_trace_detail(args.trace, report)
    else:
        input_dir = os.path.abspath(args.input_dir)
        odds, stakes, results, parlays_data = load_input_data(input_dir)
        calculator = ParlayCalculator()
        calculator.load_data(odds, results, stakes)
        report = calculator.calculate_report(parlays_data)
        success = report_gen.print_trace_detail(args.trace, report)

    if not success:
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="组合投注风险分析工具 - Parlay Risk Analyzer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本用法 - 使用默认输入输出目录
  python main.py

  # 指定输入输出目录
  python main.py --input-dir ./my_data --output-dir ./my_report

  # 指定分析时间点（用于模拟历史分析）
  python main.py --as-of 2026-06-01T00:00:00

  # 追溯特定组合的计算过程
  python main.py --trace abc123 --input-dir ./sample_input --output-dir ./output
        """
    )

    parser.add_argument(
        "--input-dir", "-i",
        default="./sample_input",
        help="输入数据目录 (默认: ./sample_input)"
    )

    parser.add_argument(
        "--output-dir", "-o",
        default="./output",
        help="输出报告目录 (默认: ./output)"
    )

    parser.add_argument(
        "--as-of",
        help="指定分析时间点 (ISO格式, 如: 2026-05-31T12:00:00)"
    )

    parser.add_argument(
        "--trace",
        help="追溯特定追踪ID或组合ID的计算过程"
    )

    args = parser.parse_args()

    if args.trace:
        run_trace(args)
    else:
        report, report_gen = run_analysis(args)


if __name__ == "__main__":
    main()
