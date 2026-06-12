#!/usr/bin/env python3
"""
组合计数批量验算 - 日常运行脚本
===================================
算法值班人把它放到 cron 里即可。
参数名和退出码稳定，请勿随意修改。

用法：
    python run_daily.py                    # 用默认参数
    python run_daily.py --generate-demo    # 首次运行：生成演示数据 + 验算
    python run_daily.py --raise-on-outlier # 外推越界时非零退出
    python run_daily.py --show-history     # 打印历史摘要（评审会前复盘）
"""
import argparse
import os
import sys

from combo_count_check.params import VerifyParams
from combo_count_check.demo_data import generate_all_demo_data
from combo_count_check.verifier import run_verification
from combo_count_check.report import write_report, write_outliers_csv
from combo_count_check.history_log import (
    append_run_log,
    append_manual_review,
    read_history,
    summarize_history,
)
from combo_count_check.errors import exit_with_summary, EXIT_OK


def main():
    parser = argparse.ArgumentParser(
        prog="combo_count_batch_verify",
        description="组合计数批量验算 - 参数名与退出码长期稳定",
    )
    parser.add_argument(
        "--generate-demo", action="store_true",
        help="生成演示数据（首次运行使用）",
    )
    parser.add_argument(
        "--raise-on-outlier", action="store_true",
        help="检测到外推越界时以非零退出码退出（默认仅告警不阻断）",
    )
    parser.add_argument(
        "--show-history", action="store_true",
        help="打印历史变更摘要（评审会前复盘用）",
    )
    parser.add_argument(
        "--params-json", type=str, default=None,
        help="从 JSON 文件加载参数（替代默认参数）",
    )
    args = parser.parse_args()

    if args.params_json:
        params = VerifyParams.from_json(args.params_json)
    else:
        params = VerifyParams()

    output_dir = os.path.abspath(params.output_dir)

    if args.show_history:
        rows = read_history(output_dir, params.history_log_filename)
        print(summarize_history(rows))
        return EXIT_OK

    if args.generate_demo:
        generate_all_demo_data()
        print("[INFO] 演示数据已生成：历史答案 / 当前记录（含外推越界） / 后补说明")

    params.raise_on_outlier = args.raise_on_outlier

    result = run_verification(params)

    report_path = write_report(result, output_dir, params.report_filename)
    outliers_path = write_outliers_csv(result, output_dir, params.outliers_filename)
    log_path = append_run_log(result, output_dir, params.history_log_filename)

    if params.verbose:
        print(f"[INFO] 复核报告已生成  : {report_path}")
        print(f"[INFO] 外推越界单独导出: {outliers_path}")
        print(f"[INFO] 运行日志追加    : {log_path}")

    return exit_with_summary(result, raise_on_outlier=args.raise_on_outlier)


if __name__ == "__main__":
    sys.exit(main())
