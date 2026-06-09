#!/usr/bin/env python3
"""
统计显著性复核 - CLI 入口
=========================

用法:
    python -m src.main run --input ./data/input --output ./data/output
    python -m src.main list-anomalies --output ./data/output
    python -m src.main export --output ./data/output --format all
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, List

from .models import (
    Question,
    AnswerRecord,
    ReviewRecord,
    ReviewStatus,
    ErrorType,
)
from .storage import Storage
from .significance import review_single_record, DEFAULT_APPROX_THRESHOLD
from .report import (
    export_csv_report,
    export_counterexamples_md,
    export_summary_txt,
    STATUS_LABELS,
    ERROR_LABELS,
)


def cmd_run(args: argparse.Namespace) -> int:
    storage = Storage(args.input, args.output)
    run_id, state = storage.start_run()

    questions: Dict[str, Question] = storage.load_questions()
    answers: Dict[str, AnswerRecord] = storage.load_answers()

    print(f"[运行 {run_id}] 加载题目 {len(questions)} 条，答案 {len(answers)} 条")

    stats = {
        "total": len(answers),
        "passed": 0,
        "pending": 0,
        "rejected": 0,
        "affected": 0,
        "new": 0,
        "updated": 0,
    }

    for record_id, answer in answers.items():
        question = questions.get(answer.question_id)
        if question is None:
            print(
                f"  [!] 记录 {record_id} 引用了不存在的题目 {answer.question_id}，"
                f"跳过（需要在 questions.json 中补录后重跑）"
            )
            continue

        existing = storage.load_existing_review(record_id)
        review = review_single_record(
            question,
            answer,
            run_id=run_id,
            approx_threshold=args.approx_threshold,
            existing_review=existing,
        )
        storage.save_review(review)

        if existing is None:
            stats["new"] += 1
        else:
            stats["updated"] += 1

        if review.status == ReviewStatus.PASS:
            stats["passed"] += 1
        elif review.status == ReviewStatus.PENDING:
            stats["pending"] += 1
        elif review.status == ReviewStatus.REJECTED:
            stats["rejected"] += 1
        elif review.status == ReviewStatus.AFFECTED:
            stats["affected"] += 1

        if review.status != ReviewStatus.PASS:
            tag = STATUS_LABELS.get(review.status, review.status.value)
            detail = ""
            if review.error_analysis:
                detail = f" [{ERROR_LABELS.get(review.error_analysis.error_type, review.error_analysis.error_type.value)}]"
            print(f"  - {record_id}: {tag}{detail}")

    storage.finish_run(run_id, stats)

    print("")
    print(f"完成：新增 {stats['new']} 条，更新 {stats['updated']} 条")
    print(
        f"  通过 {stats['passed']} / 待确认 {stats['pending']} / "
        f"未通过 {stats['rejected']} / 受晚到影响 {stats['affected']}"
    )

    if not args.no_export:
        _do_export(storage, args.output, args.format, questions, answers)

    return 0


def cmd_list_anomalies(args: argparse.Namespace) -> int:
    storage = Storage("./dummy", args.output)
    anomalies = storage.find_anomalies()

    if not anomalies:
        print("当前没有需要关注的异常记录。")
        return 0

    print(f"发现 {len(anomalies)} 条需关注的记录：\n")
    for r in anomalies:
        status_label = STATUS_LABELS.get(r.status, r.status.value)
        msg = f"[{status_label}] 记录 {r.record_id}（题目 {r.question_id}，批次 {r.batch_id}）"
        if r.error_analysis:
            msg += f" - {r.error_analysis.details}"
        if r.affected_by_late_answer:
            msg += "  ⚠ 受历史答案晚到影响"
        print(f"  {msg}")

    print("")
    affected = [r for r in anomalies if r.affected_by_late_answer]
    if affected:
        print("⚠ 以下记录的结论因历史答案晚到可能发生变化，需人工重新确认：")
        for r in affected:
            prev = STATUS_LABELS.get(r.previous_status, "—") if r.previous_status else "—"
            print(f"  - {r.record_id}: 前次状态={prev}")

    return 0


def cmd_export(args: argparse.Namespace) -> int:
    storage = Storage("./dummy", args.output)
    questions: Dict[str, Question] = storage.load_questions() if Path(args.output).parent.joinpath("input").exists() else {}
    answers: Dict[str, AnswerRecord] = {}
    _do_export(storage, args.output, args.format, questions, answers)
    return 0


def _do_export(
    storage: Storage,
    output_dir: str,
    fmt: str,
    questions: Dict[str, Question],
    answers: Dict[str, AnswerRecord],
) -> None:
    out = Path(output_dir).resolve() / "reports"
    reviews: List[ReviewRecord] = list(storage.load_all_reviews().values())

    if not reviews:
        print("  没有可导出的复核记录。")
        return

    if fmt in ("csv", "all"):
        path = export_csv_report(out / "review_report.csv", reviews, questions, answers)
        print(f"  导出 CSV 报告: {path}")

    if fmt in ("md", "markdown", "all"):
        path = export_counterexamples_md(out / "counterexamples.md", reviews, questions)
        print(f"  导出反例详情 (Markdown): {path}")

    if fmt in ("txt", "summary", "all"):
        path = export_summary_txt(out / "summary.txt", reviews)
        print(f"  导出摘要 (TXT): {path}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="stat-review",
        description="统计显著性复核 CLI 工具",
    )
    sub = p.add_subparsers(dest="command", required=True)

    prun = sub.add_parser("run", help="执行复核（支持重复运行，自动增量更新）")
    prun.add_argument("--input", "-i", required=True, help="输入目录（含 questions.json, answers.json）")
    prun.add_argument("--output", "-o", required=True, help="输出目录（复核结果与报告）")
    prun.add_argument(
        "--approx-threshold",
        type=float,
        default=DEFAULT_APPROX_THRESHOLD,
        help=f"近似误差相对阈值，默认 {DEFAULT_APPROX_THRESHOLD}",
    )
    prun.add_argument("--no-export", action="store_true", help="运行后不自动导出报告")
    prun.add_argument("--format", default="all", choices=["csv", "md", "txt", "all"], help="导出格式")
    prun.set_defaults(func=cmd_run)

    plist = sub.add_parser("list-anomalies", help="查看异常/待确认/受晚到影响的记录")
    plist.add_argument("--output", "-o", required=True, help="输出目录")
    plist.set_defaults(func=cmd_list_anomalies)

    pexp = sub.add_parser("export", help="单独导出报告")
    pexp.add_argument("--output", "-o", required=True, help="输出目录")
    pexp.add_argument("--format", default="all", choices=["csv", "md", "txt", "all"], help="导出格式")
    pexp.set_defaults(func=cmd_export)

    return p


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
