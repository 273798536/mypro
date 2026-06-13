"""命令行接口。

设计原则：
- 无界面，纯CLI调用
- 参数明确，失败原因清晰
- 退出码稳定，便于值班脚本判断
- CSV明细输出，便于后续处理

退出码：
  0 - 成功
  1 - 参数错误
  2 - 输入文件不存在
  3 - 数据解析失败
  4 - 处理过程异常
  5 - 输出写入失败
"""

import argparse
import sys
import os
import json
from typing import List

from .models import ProcessStatus, RiskLevel
from .data_io import (
    load_records_from_csv,
    load_records_from_csvs,
    export_records_to_csv,
    filter_records,
    save_state,
    load_state,
    get_record_detail,
)
from .gap_detector import mark_sampling_gaps, gap_summary
from .attribution_engine import run_attribution, build_summary
from .status_manager import StatusManager
from .report_generator import generate_text_report, generate_markdown_report, save_report
from .demo_data import generate_all_demo_data, get_demo_description


def _cmd_run(args) -> int:
    """执行归因分析。"""
    try:
        input_files = args.input
        if not input_files:
            print("错误: 必须指定输入文件", file=sys.stderr)
            return 1

        for f in input_files:
            if not os.path.exists(f):
                print(f"错误: 输入文件不存在: {f}", file=sys.stderr)
                return 2

        try:
            records = load_records_from_csvs(input_files)
        except Exception as e:
            print(f"错误: 数据解析失败 - {e}", file=sys.stderr)
            return 3

        if not records:
            print("错误: 未读取到任何有效记录", file=sys.stderr)
            return 3

        try:
            records = mark_sampling_gaps(records)
            records, stats = run_attribution(
                records,
                iqr_k=args.iqr_k,
                z_threshold=args.z_threshold,
            )
        except Exception as e:
            print(f"错误: 归因分析失败 - {e}", file=sys.stderr)
            return 4

        summary = build_summary(records, stats)

        if args.output_csv:
            try:
                export_records_to_csv(records, args.output_csv)
                print(f"[输出] CSV明细: {args.output_csv}")
            except Exception as e:
                print(f"错误: CSV输出失败 - {e}", file=sys.stderr)
                return 5

        if args.output_state:
            try:
                save_state(records, args.output_state)
                print(f"[输出] 状态文件: {args.output_state}")
            except Exception as e:
                print(f"错误: 状态文件输出失败 - {e}", file=sys.stderr)
                return 5

        if args.report_text:
            try:
                report = generate_text_report(records, summary, stats)
                save_report(report, args.report_text)
                print(f"[输出] 文本报告: {args.report_text}")
            except Exception as e:
                print(f"错误: 文本报告生成失败 - {e}", file=sys.stderr)
                return 5

        if args.report_md:
            try:
                report = generate_markdown_report(records, summary, stats)
                save_report(report, args.report_md)
                print(f"[输出] Markdown报告: {args.report_md}")
            except Exception as e:
                print(f"错误: Markdown报告生成失败 - {e}", file=sys.stderr)
                return 5

        if args.summary_json:
            try:
                with open(args.summary_json, "w", encoding="utf-8") as f:
                    json.dump(summary.to_dict(), f, ensure_ascii=False, indent=2)
                print(f"[输出] 汇总JSON: {args.summary_json}")
            except Exception as e:
                print(f"错误: 汇总JSON输出失败 - {e}", file=sys.stderr)
                return 5

        print()
        print("===== 归因分析完成 =====")
        print(f"总记录数: {summary.total_records}")
        print(f"已处理: {summary.processed_count}")
        print(f"待补证据: {summary.need_evidence_count}")
        print(f"采样缺口: {summary.sampling_gap_count}")
        print(f"极端值: {summary.extreme_count}")
        print(f"高风险+极端风险: {summary.by_risk.get('高风险', 0) + summary.by_risk.get('极端风险', 0)}")
        print()

        if summary.evidence_todo:
            print("待办清单:")
            for i, todo in enumerate(summary.evidence_todo[:5], 1):
                print(f"  {i}. {todo}")
            if len(summary.evidence_todo) > 5:
                print(f"  ... 共 {len(summary.evidence_todo)} 项")
            print()

        return 0

    except Exception as e:
        print(f"错误: 未预期异常 - {e}", file=sys.stderr)
        return 4


def _cmd_filter(args) -> int:
    """筛选记录。"""
    try:
        if not args.input_state and not args.input_csv:
            print("错误: 必须指定输入(--input-state 或 --input-csv)", file=sys.stderr)
            return 1

        if args.input_state:
            if not os.path.exists(args.input_state):
                print(f"错误: 状态文件不存在: {args.input_state}", file=sys.stderr)
                return 2
            records = load_state(args.input_state)
        else:
            records = load_records_from_csv(args.input_csv)
            records = mark_sampling_gaps(records)
            records, _ = run_attribution(records)

        filtered = filter_records(
            records,
            only_gaps=args.only_gaps,
            only_extremes=args.only_extremes,
            only_need_evidence=args.only_need_evidence,
            min_risk=args.min_risk,
            attribution=args.attribution,
            beam_id=args.beam_id,
        )

        print(f"筛选结果: {len(filtered)} / {len(records)} 条")
        print()

        if args.output:
            export_records_to_csv(filtered, args.output)
            print(f"已导出到: {args.output}")
        else:
            for r in filtered[:20]:
                gap_mark = "[缺口]" if r.is_sampling_gap else "     "
                ext_mark = "[极端]" if r.is_extreme else "     "
                print(f"{gap_mark}{ext_mark} {r.beam_id:8s} {r.measure_point:6s} "
                      f"挠度比={r.deflection_ratio or 'N/A':>8} "
                      f"风险={r.risk_level.value} "
                      f"状态={r.status.value}")
            if len(filtered) > 20:
                print(f"... 共 {len(filtered)} 条，仅显示前20条")

        return 0

    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        return 4


def _cmd_detail(args) -> int:
    """查看单条记录详情。"""
    try:
        if not args.input_state:
            print("错误: 必须指定 --input-state", file=sys.stderr)
            return 1
        if not os.path.exists(args.input_state):
            print(f"错误: 状态文件不存在: {args.input_state}", file=sys.stderr)
            return 2

        records = load_state(args.input_state)
        mgr = StatusManager(records)
        record = mgr.get_record_by_id(args.record_id)

        if record is None:
            print(f"错误: 未找到记录ID: {args.record_id}", file=sys.stderr)
            return 1

        detail = get_record_detail(record)
        print(json.dumps(detail, ensure_ascii=False, indent=2))
        return 0

    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        return 4


def _cmd_status(args) -> int:
    """状态管理。"""
    try:
        if not args.input_state:
            print("错误: 必须指定 --input-state", file=sys.stderr)
            return 1
        if not os.path.exists(args.input_state):
            print(f"错误: 状态文件不存在: {args.input_state}", file=sys.stderr)
            return 2

        records = load_state(args.input_state)
        mgr = StatusManager(records)

        if args.subcommand == "list":
            summary = mgr.get_review_summary()
            print("===== 处理进度 =====")
            print(f"总记录: {summary['total']}")
            print(f"已处理: {summary['processed']} ({summary['progress_percent']}%)")
            print(f"待处理: {summary['pending']}")
            print(f"待补证据: {summary['need_evidence']}")
            print(f"处理异常: {summary['error']}")
            print()
            print(f"缺口待补测: {summary['gap_to_fix']}")
            print(f"极端值待复核: {summary['extreme_to_review']}")
            print()

            todos = mgr.get_evidence_todo_list()
            if todos:
                print("待补证据清单:")
                for i, t in enumerate(todos, 1):
                    print(f"  {i}. [{t['record_id']}] {t['beam_id']}-{t['measure_point']}")
                    print(f"     状态: {t['status']} - {t['status_note']}")
                    print(f"     来源: {t['source_file']} L{t['source_line']}")

        elif args.subcommand == "update":
            if not args.record_id:
                print("错误: 必须指定 --record-id", file=sys.stderr)
                return 1
            if not args.new_status:
                print("错误: 必须指定 --new-status", file=sys.stderr)
                return 1

            try:
                new_status = ProcessStatus(args.new_status)
            except ValueError:
                valid = ", ".join(s.value for s in ProcessStatus)
                print(f"错误: 无效状态值，有效值: {valid}", file=sys.stderr)
                return 1

            ok = mgr.update_status(args.record_id, new_status, args.note or "")
            if ok:
                save_state(records, args.input_state)
                print(f"已更新记录 {args.record_id} 的状态为: {new_status.value}")
            else:
                print(f"错误: 未找到记录ID: {args.record_id}", file=sys.stderr)
                return 1

        elif args.subcommand == "batch":
            status_counts = mgr.get_status_counts()
            print("各状态数量:")
            for status, count in sorted(status_counts.items()):
                print(f"  {status}: {count}")

        return 0

    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        return 4


def _cmd_demo(args) -> int:
    """生成演示数据。"""
    try:
        target_dir = args.output_dir or "demo_data"
        files = generate_all_demo_data(target_dir)

        print("===== 演示数据已生成 =====")
        for name, path in files.items():
            print(f"  {name}: {path}")
        print()
        print(get_demo_description())
        return 0

    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        return 4


def main():
    """主入口。"""
    parser = argparse.ArgumentParser(
        prog="deflection-attribution",
        description="梁体挠度误差归因系统 - 无界面，值班脚本友好",
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    run_parser = subparsers.add_parser("run", help="执行归因分析")
    run_parser.add_argument("-i", "--input", nargs="+", required=True, help="输入CSV文件路径，可多个")
    run_parser.add_argument("-o", "--output-csv", help="输出CSV明细路径")
    run_parser.add_argument("-s", "--output-state", help="输出状态JSON路径（可后续加载）")
    run_parser.add_argument("--report-text", help="输出文本报告路径")
    run_parser.add_argument("--report-md", help="输出Markdown报告路径")
    run_parser.add_argument("--summary-json", help="输出汇总JSON路径")
    run_parser.add_argument("--iqr-k", type=float, default=1.5, help="IQR倍数，默认1.5")
    run_parser.add_argument("--z-threshold", type=float, default=2.0, help="Z-score阈值，默认2.0")
    run_parser.set_defaults(func=_cmd_run)

    filter_parser = subparsers.add_parser("filter", help="筛选记录")
    filter_parser.add_argument("--input-state", help="输入状态文件")
    filter_parser.add_argument("--input-csv", help="输入CSV文件")
    filter_parser.add_argument("-o", "--output", help="输出筛选结果CSV")
    filter_parser.add_argument("--only-gaps", action="store_true", help="仅显示采样缺口")
    filter_parser.add_argument("--only-extremes", action="store_true", help="仅显示极端值")
    filter_parser.add_argument("--only-need-evidence", action="store_true", help="仅显示待补证据")
    filter_parser.add_argument("--min-risk", help="最低风险等级（低风险/中风险/高风险/极端风险）")
    filter_parser.add_argument("--attribution", help="归因分类")
    filter_parser.add_argument("--beam-id", help="梁号筛选（模糊匹配）")
    filter_parser.set_defaults(func=_cmd_filter)

    detail_parser = subparsers.add_parser("detail", help="查看单条记录详情")
    detail_parser.add_argument("--input-state", required=True, help="输入状态文件")
    detail_parser.add_argument("record_id", help="记录ID")
    detail_parser.set_defaults(func=_cmd_detail)

    status_parser = subparsers.add_parser("status", help="状态管理")
    status_sub = status_parser.add_subparsers(dest="subcommand")

    status_list = status_sub.add_parser("list", help="查看状态概览")
    status_list.add_argument("--input-state", required=True, help="输入状态文件")

    status_update = status_sub.add_parser("update", help="更新单条状态")
    status_update.add_argument("--input-state", required=True, help="输入状态文件")
    status_update.add_argument("--record-id", required=True, help="记录ID")
    status_update.add_argument("--new-status", required=True, help="新状态值")
    status_update.add_argument("--note", help="状态备注")

    status_batch = status_sub.add_parser("batch", help="批量状态统计")
    status_batch.add_argument("--input-state", required=True, help="输入状态文件")

    status_parser.set_defaults(func=_cmd_status)

    demo_parser = subparsers.add_parser("demo", help="生成演示数据")
    demo_parser.add_argument("-o", "--output-dir", help="输出目录")
    demo_parser.set_defaults(func=_cmd_demo)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 0

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
