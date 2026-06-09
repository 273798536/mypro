#!/usr/bin/env python3
import argparse
import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from src.data_loader import (
    load_weight_sheet,
    load_peak_area,
    load_interpretation,
    build_batch_records,
)
from src.report import export_to_excel, print_summary


SAMPLE_DIR = os.path.join(BASE_DIR, "sample_data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")


def cmd_run(args):
    weight_file = args.weight or os.path.join(SAMPLE_DIR, "称量单.csv")
    peak_file = args.peak or os.path.join(SAMPLE_DIR, "色谱峰面积.csv")
    interp_file = args.interpretation or os.path.join(SAMPLE_DIR, "谱图判读记录.csv")
    output_dir = args.output or OUTPUT_DIR

    print(f"[读取] 称量单: {weight_file}")
    print(f"[读取] 色谱峰面积: {peak_file}")
    print(f"[读取] 谱图判读记录: {interp_file}")

    weight_df = load_weight_sheet(weight_file)
    peak_df = load_peak_area(peak_file)
    interp_df = load_interpretation(interp_file)

    manager = build_batch_records(weight_df, peak_df, interp_df)
    print_summary(manager)

    out_path = export_to_excel(manager, output_dir)
    print()
    print(f"[完成] 报告已导出：{out_path}")
    print("       包含工作表：最终结果汇总、重复批号说明、全部记录明细、")
    print("       安全员说明（可直接转发）、异常追溯明细")


def cmd_trace(args):
    weight_file = args.weight or os.path.join(SAMPLE_DIR, "称量单.csv")
    peak_file = args.peak or os.path.join(SAMPLE_DIR, "色谱峰面积.csv")
    interp_file = args.interpretation or os.path.join(SAMPLE_DIR, "谱图判读记录.csv")

    weight_df = load_weight_sheet(weight_file)
    peak_df = load_peak_area(peak_file)
    interp_df = load_interpretation(interp_file)
    manager = build_batch_records(weight_df, peak_df, interp_df)

    trace = manager.trace_batch(args.batch)
    if "error" in trace:
        print(f"[错误] {trace['error']}")
        sys.exit(1)

    print("=" * 60)
    print(f"  批号追溯：{trace['批号']}  ({trace['样品名称']})")
    print(f"  检测次数：{trace['检测次数']}")
    print("=" * 60)

    for i, entry in enumerate(trace["记录时间线"], 1):
        print()
        print(f"--- 第 {i} 次检测 ({entry['记录类型']}) ---")
        print(f"  记录编号：{entry['记录编号']}")
        print(f"  检测时间：{entry['记录时间']}")
        print(f"  主峰面积：{entry['主峰面积']}")
        print(f"  处理意见：{entry['处理意见'] or '（无）'}")
        print(f"  结论：{entry['结论'] or '待确认'}")
        print(f"  谱图数据文件：{', '.join(entry['谱图数据文件']) or '（无）'}")

        if entry["称量详情"]:
            print("  称量详情：")
            for k, v in entry["称量详情"].items():
                if v:
                    print(f"    - {k}: {v}")

        if entry["判读详情"]:
            print("  判读详情：")
            for k, v in entry["判读详情"].items():
                if v:
                    print(f"    - {k}: {v}")

    if args.json:
        print()
        print("--- JSON 格式 ---")
        print(json.dumps(trace, ensure_ascii=False, indent=2))


def cmd_list(args):
    weight_file = args.weight or os.path.join(SAMPLE_DIR, "称量单.csv")
    peak_file = args.peak or os.path.join(SAMPLE_DIR, "色谱峰面积.csv")
    interp_file = args.interpretation or os.path.join(SAMPLE_DIR, "谱图判读记录.csv")

    weight_df = load_weight_sheet(weight_file)
    peak_df = load_peak_area(peak_file)
    interp_df = load_interpretation(interp_file)
    manager = build_batch_records(weight_df, peak_df, interp_df)

    print()
    print("可追溯的批号列表：")
    for rec in sorted(manager.get_all_latest(), key=lambda r: r.batch_no):
        status = "异常" if rec.interpretation and rec.interpretation.get("异常类型") else "正常"
        dup_tag = " [重复/复检]" if rec.is_duplicate else ""
        print(f"  {rec.batch_no}  {rec.sample_name:<15}  {status}{dup_tag}")


def main():
    parser = argparse.ArgumentParser(
        prog="色谱峰面积清洗",
        description="色谱峰面积清洗工具：自动关联称量单、色谱峰面积与谱图判读记录，去重并导出报告",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例：
  # 1. 使用默认样例数据跑通流程（推荐先跑这个看看效果）
  python main.py run

  # 2. 使用自己的数据文件
  python main.py run --weight 称量单.csv --peak 峰面积.csv --interpretation 判读记录.csv --output ./output

  # 3. 列出所有可追溯的批号
  python main.py list

  # 4. 追溯某个批号的完整过程（顺着异常往回查）
  python main.py trace --batch B20260601-01
  python main.py trace --batch B20260601-03 --json
""",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="执行峰面积清洗并导出报告")
    p_run.add_argument("--weight", help="称量单 CSV 文件路径（默认用 sample_data/称量单.csv）")
    p_run.add_argument("--peak", help="色谱峰面积 CSV 文件路径（默认用 sample_data/色谱峰面积.csv）")
    p_run.add_argument("--interpretation", help="谱图判读记录 CSV 文件路径（默认用 sample_data/谱图判读记录.csv）")
    p_run.add_argument("--output", help="报告输出目录（默认用 output/）")
    p_run.set_defaults(func=cmd_run)

    p_trace = sub.add_parser("trace", help="追溯指定批号的完整记录")
    p_trace.add_argument("--batch", required=True, help="要追溯的批号，例如 B20260601-01")
    p_trace.add_argument("--weight", help="称量单 CSV 文件路径")
    p_trace.add_argument("--peak", help="色谱峰面积 CSV 文件路径")
    p_trace.add_argument("--interpretation", help="谱图判读记录 CSV 文件路径")
    p_trace.add_argument("--json", action="store_true", help="同时输出 JSON 格式")
    p_trace.set_defaults(func=cmd_trace)

    p_list = sub.add_parser("list", help="列出所有可追溯批号")
    p_list.add_argument("--weight", help="称量单 CSV 文件路径")
    p_list.add_argument("--peak", help="色谱峰面积 CSV 文件路径")
    p_list.add_argument("--interpretation", help="谱图判读记录 CSV 文件路径")
    p_list.set_defaults(func=cmd_list)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
