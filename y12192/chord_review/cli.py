#!/usr/bin/env python3
import argparse
import json
import os
import sys

from chord_review.tracker import build_review_results, save_review_results, build_trace_index, save_trace_index
from chord_review.report import format_terminal_summary, format_shareable_report, save_report
from chord_review.tracer import format_bidirectional_trace


def cmd_review(args):
    input_dir = os.path.abspath(args.input_dir)
    output_dir = os.path.abspath(args.output_dir)

    if not os.path.isdir(input_dir):
        print(f"错误: 输入目录不存在: {input_dir}", file=sys.stderr)
        sys.exit(1)

    results, global_issues = build_review_results(input_dir)

    json_path = save_review_results(results, output_dir)
    trace = build_trace_index(results)
    trace_path = save_trace_index(trace, output_dir)

    summary = format_terminal_summary(results, global_issues)
    print(summary)

    report_text = format_shareable_report(results, global_issues)
    date_str = __import__("datetime").datetime.now().strftime("%Y%m%d")
    report_path = save_report(report_text, output_dir, f"chord_review_report_{date_str}.txt")

    print(f"\n输出文件:")
    print(f"  结果JSON:  {json_path}")
    print(f"  追溯索引:  {trace_path}")
    print(f"  可转发报告: {report_path}")


def cmd_trace(args):
    output_dir = os.path.abspath(args.output_dir)
    trace_path = os.path.join(output_dir, "trace_index.json")

    if not os.path.isfile(trace_path):
        print(f"错误: 追溯索引不存在，请先运行 review 命令: {trace_path}", file=sys.stderr)
        sys.exit(1)

    with open(trace_path, "r", encoding="utf-8") as f:
        trace = json.load(f)

    case_id = args.case_id
    direction = args.direction

    if direction == "melody":
        from chord_review.tracer import format_melody_trace
        print(format_melody_trace(trace, case_id))
    elif direction == "chord":
        from chord_review.tracer import format_chord_trace
        print(format_chord_trace(trace, case_id))
    else:
        print(format_bidirectional_trace(trace, case_id))


def cmd_amend(args):
    input_dir = os.path.abspath(args.input_dir)
    output_dir = os.path.abspath(args.output_dir)
    case_id = args.case_id
    measure_num = args.measure
    original = args.original
    corrected = args.corrected
    reason = args.reason
    operator = args.operator

    correction_dir = os.path.join(input_dir, "corrections")
    os.makedirs(correction_dir, exist_ok=True)

    correction_path = os.path.join(correction_dir, f"{case_id}.json")
    if os.path.exists(correction_path):
        with open(correction_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"case_id": case_id, "amendments": []}

    import datetime
    new_amendment = {
        "amendment_id": f"amm-{len(data['amendments']) + 1:03d}",
        "timestamp": datetime.datetime.now().isoformat(),
        "operator": operator,
        "changes": [
            {
                "measure_num": measure_num,
                "original_chord": original,
                "corrected_chord": corrected,
                "reason": reason,
            }
        ],
    }
    data["amendments"].append(new_amendment)

    with open(correction_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"已补录修正: Case {case_id} 小节{measure_num} {original} → {corrected}")
    print(f"修正文件: {correction_path}")
    print("请重新运行 review 命令以查看变更影响")


def main():
    parser = argparse.ArgumentParser(
        prog="chord-review",
        description="AI伴奏错和弦复盘工具 - 和弦校验、调式误判追踪、人工修正补录",
    )
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    review_parser = subparsers.add_parser("review", help="运行和弦复盘校验")
    review_parser.add_argument("-i", "--input-dir", required=True, help="输入目录(含melody/chord/model_version/corrections子目录)")
    review_parser.add_argument("-o", "--output-dir", required=True, help="输出目录")
    review_parser.set_defaults(func=cmd_review)

    trace_parser = subparsers.add_parser("trace", help="双向追溯查询")
    trace_parser.add_argument("-o", "--output-dir", required=True, help="复盘输出目录(含trace_index.json)")
    trace_parser.add_argument("-c", "--case-id", required=True, help="Case ID")
    trace_parser.add_argument(
        "-d", "--direction",
        choices=["melody", "chord", "both"],
        default="both",
        help="追溯方向: melody=旋律→结果, chord=结果→和弦, both=双向",
    )
    trace_parser.set_defaults(func=cmd_trace)

    amend_parser = subparsers.add_parser("amend", help="补录人工修正")
    amend_parser.add_argument("-i", "--input-dir", required=True, help="输入目录")
    amend_parser.add_argument("-o", "--output-dir", required=True, help="输出目录(仅记录，不影响已有结果)")
    amend_parser.add_argument("-c", "--case-id", required=True, help="Case ID")
    amend_parser.add_argument("-m", "--measure", type=int, required=True, help="小节号")
    amend_parser.add_argument("--original", required=True, help="原始和弦")
    amend_parser.add_argument("--corrected", required=True, help="修正后和弦")
    amend_parser.add_argument("--reason", required=True, help="修正原因")
    amend_parser.add_argument("--operator", required=True, help="操作人")
    amend_parser.set_defaults(func=cmd_amend)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    args.func(args)


if __name__ == "__main__":
    main()
