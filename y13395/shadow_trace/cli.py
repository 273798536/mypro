from __future__ import annotations

import argparse
import csv
import os
import sys
from typing import List, Optional

from .models import TaskStatus, PollutionStatus
from .loader import load_csv
from .engine import TraceEngine, ProcessResult
from .comparator import compare_versions
from .report import generate_report, generate_compare_report


def _print_banner(text: str) -> None:
    line = "=" * max(len(text) + 4, 40)
    print(line)
    print(f"  {text}")
    print(line)


def _print_stats(label: str, result: ProcessResult) -> None:
    _print_banner(label)
    for ln in result.stats.summary_lines():
        print(ln)
    print()


def cmd_run(args: argparse.Namespace) -> int:
    try:
        load_result = load_csv(
            args.input,
            version_tag=args.version,
            pollution_detector=args.pollution_field and (
                lambda row: PollutionStatus.CONFIRMED
                if row.get(args.pollution_field, "").strip() in ("1", "true", "yes", "confirmed")
                else None
            ),
            skip_filter=args.skip_field and (
                lambda row: row.get(args.skip_field, "").strip() or None
            ),
        )
    except Exception as e:
        print(f"[错误] 读取 CSV 失败: {e}", file=sys.stderr)
        return 2

    engine = TraceEngine(auto_review_threshold=args.auto_review_margin)
    result = engine.process(load_result.records)

    _print_stats(f"处理结果 {('v=' + args.version) if args.version else ''}", result)

    if load_result.bad_rows:
        _print_banner(f"坏行明细 ({len(load_result.bad_rows)} 条)")
        for rn, line, err in load_result.bad_rows[: args.show_bad_rows]:
            print(f"  行 {rn}: {err}")
            print(f"    原始: {line}")
        print()

    if load_result.skipped_rows:
        _print_banner(f"跳过行明细 ({len(load_result.skipped_rows)} 条)")
        for rn, sid, reason in load_result.skipped_rows[: args.show_skipped_rows]:
            print(f"  行 {rn} [{sid}]: {reason}")
        print()

    if result.failed_queue:
        _print_banner(f"失败队列 ({len(result.failed_queue)} 条)")
        for r in result.failed_queue[: args.show_failed_rows]:
            poll = f" [{r.pollution.value}]" if r.pollution != PollutionStatus.CLEAN else ""
            print(f"  行 {r.row_number} [{r.sample_id}]{poll}: {r.error_message or r.status.value}")
        print()

    if result.review_queue:
        _print_banner(f"待人工复核 ({len(result.review_queue)} 条)")
        for r in result.review_queue[: args.show_review_rows]:
            print(
                f"  行 {r.row_number} [{r.sample_id}]: "
                f"score={r.prediction_score}, threshold={r.threshold}"
            )
        print()

    if args.state_file:
        TraceEngine.save_state(result.records, args.state_file)
        print(f"[保存] 状态文件: {args.state_file}")

    if args.export_failed:
        with open(args.export_failed, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["row_number", "sample_id", "status", "pollution", "error_message", "score", "threshold", "ground_truth", "predicted_label"])
            for r in result.failed_queue:
                w.writerow([r.row_number, r.sample_id, r.status.value, r.pollution.value, r.error_message or "", r.prediction_score or "", r.threshold or "", r.ground_truth or "", r.predicted_label or ""])
        print(f"[导出] 失败队列 CSV: {args.export_failed}")

    if args.report:
        md = generate_report(
            result,
            source_file=args.input,
            version_tag=args.version,
            include_details=not args.no_details,
        )
        with open(args.report, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"[导出] Markdown 报告: {args.report}")

    return 0 if not result.failed_queue and not load_result.bad_rows else 1


def cmd_review(args: argparse.Namespace) -> int:
    if not os.path.exists(args.state_file):
        print(f"[错误] 状态文件不存在: {args.state_file}", file=sys.stderr)
        return 2

    records = TraceEngine.load_state(args.state_file)
    map_id = {r.sample_id: r for r in records}

    if args.list:
        _print_banner("待人工复核/失败清单")
        shown = 0
        for r in records:
            if r.status in (TaskStatus.PENDING_REVIEW, TaskStatus.FAILED, TaskStatus.HUMAN_OVERRULED):
                conclusion = r.final_conclusion or "-"
                poll = f" [{r.pollution.value}]" if r.pollution != PollutionStatus.CLEAN else ""
                print(
                    f"  [{r.status.value}]{poll} {r.sample_id} "
                    f"(行 {r.row_number}): 最终结论={conclusion}"
                )
                shown += 1
        if shown == 0:
            print("  (无)")
        return 0

    if args.sample_id not in map_id:
        print(f"[错误] 找不到样本: {args.sample_id}", file=sys.stderr)
        return 2

    rec = map_id[args.sample_id]
    new_status = TaskStatus(args.new_status)
    review = TraceEngine.apply_human_review(
        rec,
        reviewer=args.reviewer,
        new_status=new_status,
        reason=args.reason,
        final_conclusion=args.conclusion,
    )
    print(
        f"[改判] {args.sample_id}: {review.original_status.value} → {new_status.value} "
        f"by {args.reviewer}: {args.reason}"
    )
    if args.conclusion:
        print(f"       最终结论: {args.conclusion}")

    TraceEngine.save_state(records, args.state_file)
    print(f"[保存] 状态已更新: {args.state_file}")
    return 0


def cmd_filter(args: argparse.Namespace) -> int:
    if not os.path.exists(args.state_file):
        print(f"[错误] 状态文件不存在: {args.state_file}", file=sys.stderr)
        return 2

    records = TraceEngine.load_state(args.state_file)

    statuses = [TaskStatus(s) for s in args.status] if args.status else None
    pollutions = [PollutionStatus(p) for p in args.pollution] if args.pollution else None

    filtered = TraceEngine.filter_records(
        records,
        statuses=statuses,
        pollutions=pollutions,
        sample_ids=args.sample_id,
        with_reviews=args.with_reviews,
    )

    _print_banner(f"筛选结果 ({len(filtered)} 条)")
    for r in filtered[: args.limit]:
        poll = f" [{r.pollution.value}]" if r.pollution != PollutionStatus.CLEAN else ""
        rev = f" (review={len(r.review_history)})" if r.review_history else ""
        print(
            f"  {r.sample_id} [{r.status.value}]{poll}{rev}: "
            f"score={r.prediction_score}, threshold={r.threshold}, "
            f"conclusion={r.final_conclusion or '-'}"
        )

    if args.export_csv:
        with open(args.export_csv, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["row_number", "sample_id", "status", "pollution", "score", "threshold", "ground_truth", "predicted_label", "final_conclusion", "review_count"])
            for r in filtered:
                w.writerow([
                    r.row_number, r.sample_id, r.status.value, r.pollution.value,
                    r.prediction_score or "", r.threshold or "", r.ground_truth or "",
                    r.predicted_label or "", r.final_conclusion or "", len(r.review_history),
                ])
        print(f"\n[导出] 筛选结果 CSV: {args.export_csv}")

    if args.export_json:
        import json
        with open(args.export_json, "w", encoding="utf-8") as f:
            json.dump([r.to_dict() for r in filtered], f, ensure_ascii=False, indent=2)
        print(f"\n[导出] 筛选结果 JSON: {args.export_json}")

    return 0


def cmd_compare(args: argparse.Namespace) -> int:
    if not os.path.exists(args.state_a):
        print(f"[错误] 状态文件不存在: {args.state_a}", file=sys.stderr)
        return 2
    if not os.path.exists(args.state_b):
        print(f"[错误] 状态文件不存在: {args.state_b}", file=sys.stderr)
        return 2

    rec_a = TraceEngine.load_state(args.state_a)
    rec_b = TraceEngine.load_state(args.state_b)

    diff = compare_versions(rec_a, rec_b, tag_a=args.tag_a, tag_b=args.tag_b)

    _print_banner(f"版本对比: {args.tag_a} → {args.tag_b}")
    sd = diff.sample_diff
    print(f"  样本数: {sd['total_a']} → {sd['total_b']} (共有 {len(sd['common'])} 条)")
    print(f"  仅在 {args.tag_a}: {len(sd['only_in_a'])} 条, 仅在 {args.tag_b}: {len(sd['only_in_b'])} 条")

    td = diff.threshold_diff
    print(f"\n  阈值变化样本: {len(td['threshold_changes'])} 条")
    print(f"  分数变化样本: {len(td['score_changes'])} 条")

    hd = diff.human_review_diff
    print(f"\n  人工改判变化样本: {len(hd['review_changes'])} 条")

    print(f"\n  状态翻转样本: {diff.status_diff['total_flips']} 条")
    if diff.status_diff["flips"]:
        print("  前 10 条翻转:")
        for item in diff.status_diff["flips"][:10]:
            print(
                f"    {item['sample_id']}: "
                f"{item[f'{args.tag_a}_status']} → {item[f'{args.tag_b}_status']}"
            )

    if args.report:
        md = generate_compare_report(diff)
        with open(args.report, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"\n[导出] 对比报告: {args.report}")

    return 0


def cmd_detail(args: argparse.Namespace) -> int:
    if not os.path.exists(args.state_file):
        print(f"[错误] 状态文件不存在: {args.state_file}", file=sys.stderr)
        return 2

    records = TraceEngine.load_state(args.state_file)
    map_id = {r.sample_id: r for r in records}

    if args.sample_id not in map_id:
        print(f"[错误] 找不到样本: {args.sample_id}", file=sys.stderr)
        return 2

    r = map_id[args.sample_id]
    _print_banner(f"样本详情: {r.sample_id}")
    print(f"  记录ID:     {r.record_id}")
    print(f"  行号:       {r.row_number}")
    print(f"  状态:       {r.status.value}")
    print(f"  污染标记:   {r.pollution.value}")
    print(f"  版本:       {r.version_tag or '-'}")
    print(f"  分数:       {r.prediction_score}")
    print(f"  阈值:       {r.threshold}")
    print(f"  预测标签:   {r.predicted_label or '-'}")
    print(f"  真值:       {r.ground_truth or '-'}")
    print(f"  最终结论:   {r.final_conclusion or '-'}")
    print(f"  创建时间:   {r.created_at}")
    print(f"  更新时间:   {r.updated_at}")
    if r.error_message:
        print(f"  错误信息:   {r.error_message}")
    print()

    if r.review_history:
        print("  人工改判历史:")
        for rv in r.review_history:
            print(
                f"    [{rv.reviewed_at}] {rv.reviewer}: "
                f"{rv.original_status.value} → {rv.new_status.value}"
            )
            print(f"      理由: {rv.reason}")
        print()

    if r.process_log:
        print("  处理日志:")
        for log in r.process_log:
            print(f"    {log}")

    if args.raw:
        print()
        print("  原始数据:")
        import json
        print("    " + json.dumps(r.raw_data, ensure_ascii=False, indent=2).replace("\n", "\n    "))

    return 0


def cmd_report(args: argparse.Namespace) -> int:
    if not os.path.exists(args.state_file):
        print(f"[错误] 状态文件不存在: {args.state_file}", file=sys.stderr)
        return 2

    records = TraceEngine.load_state(args.state_file)
    result = ProcessResult.from_records(records)

    version_tag = None
    if records:
        version_tag = records[0].version_tag

    md = generate_report(
        result,
        source_file=args.source,
        version_tag=version_tag or args.version,
        include_details=not args.no_details,
        title=args.title,
    )

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"[导出] Markdown 报告: {args.output}")
    else:
        print(md)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="shadow-trace",
        description="影子流量任务追踪工具: 处理、人工改判、污染标记、版本对比、报告导出",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="读取 CSV 并处理")
    p_run.add_argument("input", help="输入 CSV 文件路径")
    p_run.add_argument("-v", "--version", dest="version", default=None, help="版本标签 (如 v1)")
    p_run.add_argument("--state-file", default=None, help="保存状态 JSON 文件路径")
    p_run.add_argument("--report", default=None, help="导出 Markdown 报告路径")
    p_run.add_argument("--no-details", action="store_true", help="报告不包含完整样本详情表")
    p_run.add_argument("--export-failed", default=None, help="导出失败队列为 CSV")
    p_run.add_argument("--pollution-field", default=None, help="CSV 中污染标记字段名")
    p_run.add_argument("--skip-field", default=None, help="CSV 中跳过理由字段名 (非空则跳过)")
    p_run.add_argument("--auto-review-margin", type=float, default=None, help="分数与阈值差小于此值时自动标记待复核")
    p_run.add_argument("--show-bad-rows", type=int, default=20, help="最多显示多少条坏行")
    p_run.add_argument("--show-skipped-rows", type=int, default=20, help="最多显示多少条跳过行")
    p_run.add_argument("--show-failed-rows", type=int, default=20, help="最多显示多少条失败行")
    p_run.add_argument("--show-review-rows", type=int, default=20, help="最多显示多少条待复核行")
    p_run.set_defaults(func=cmd_run)

    p_review = sub.add_parser("review", help="人工改判样本状态与结论")
    p_review.add_argument("state_file", help="状态 JSON 文件路径")
    p_review.add_argument("--list", action="store_true", help="列出所有待复核/失败/已改判样本")
    p_review.add_argument("--sample-id", help="要改判的样本 ID")
    p_review.add_argument("--new-status", choices=[s.value for s in TaskStatus], help="新状态")
    p_review.add_argument("--reviewer", default="anonymous", help="改判人标识")
    p_review.add_argument("--reason", default="", help="改判理由")
    p_review.add_argument("--conclusion", default=None, help="最终结论 (不填则使用理由)")
    p_review.set_defaults(func=cmd_review)

    p_filter = sub.add_parser("filter", help="按状态/污染/样本筛选记录")
    p_filter.add_argument("state_file", help="状态 JSON 文件路径")
    p_filter.add_argument("-s", "--status", action="append", help="按状态筛选 (可多次指定)")
    p_filter.add_argument("-p", "--pollution", action="append", help="按污染状态筛选 (可多次指定)")
    p_filter.add_argument("--sample-id", action="append", help="按样本 ID 筛选 (可多次指定)")
    p_filter.add_argument("--with-reviews", action="store_true", help="仅显示有改判记录的")
    p_filter.add_argument("--limit", type=int, default=100, help="最多显示条数")
    p_filter.add_argument("--export-csv", default=None, help="导出筛选结果为 CSV")
    p_filter.add_argument("--export-json", default=None, help="导出筛选结果为 JSON")
    p_filter.set_defaults(func=cmd_filter)

    p_cmp = sub.add_parser("compare", help="对比两个版本的状态文件")
    p_cmp.add_argument("state_a", help="前一版状态 JSON 文件")
    p_cmp.add_argument("state_b", help="当前版状态 JSON 文件")
    p_cmp.add_argument("--tag-a", default="v1", help="前一版标签")
    p_cmp.add_argument("--tag-b", default="v2", help="当前版标签")
    p_cmp.add_argument("--report", default=None, help="导出对比 Markdown 报告路径")
    p_cmp.set_defaults(func=cmd_compare)

    p_det = sub.add_parser("detail", help="查看单条样本的完整详情")
    p_det.add_argument("state_file", help="状态 JSON 文件路径")
    p_det.add_argument("sample_id", help="样本 ID")
    p_det.add_argument("--raw", action="store_true", help="同时显示原始 CSV 行数据")
    p_det.set_defaults(func=cmd_detail)

    p_rep = sub.add_parser("report", help="从状态文件重新生成 Markdown 报告 (保证页面与文件状态一致)")
    p_rep.add_argument("state_file", help="状态 JSON 文件路径")
    p_rep.add_argument("-o", "--output", default=None, help="输出 Markdown 文件路径 (不填则打印到终端)")
    p_rep.add_argument("--title", default="影子流量任务追踪报告", help="报告标题")
    p_rep.add_argument("--source", default=None, help="源文件路径 (显示在报告元信息中)")
    p_rep.add_argument("--version", default=None, help="版本标签 (覆盖状态文件中的值)")
    p_rep.add_argument("--no-details", action="store_true", help="报告不包含完整样本详情表")
    p_rep.set_defaults(func=cmd_report)

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
