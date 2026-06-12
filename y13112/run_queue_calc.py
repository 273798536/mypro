import argparse
import json
import sys
import os
from typing import Dict, List, Any

from queue_window_calc import (
    QuestionItem, Unit, ManualConfirmation, ConfirmationStatus,
    run_batch, HistoryTracker,
    export_report_to_json, export_report_to_csv, export_history_to_json,
    load_questions_from_json,
)


ERROR_MESSAGES = {
    "INPUT_FILE_NOT_FOUND": "[ERROR] 题目清单文件不存在：{path}",
    "INPUT_FILE_INVALID": "[ERROR] 题目清单文件解析失败：{detail}",
    "CONFIRM_FILE_INVALID": "[ERROR] 人工确认文件解析失败：{detail}",
    "OUTPUT_DIR_ERROR": "[ERROR] 输出目录无法创建：{detail}",
    "NO_QUESTIONS": "[ERROR] 题目清单为空，无可计算题目。",
    "INVALID_UNIT": "[ERROR] 题目 {qid} 单位非法：{unit}",
}


def parse_unit(value: str, qid: str) -> Unit:
    try:
        return Unit(value)
    except ValueError:
        print(ERROR_MESSAGES["INVALID_UNIT"].format(qid=qid, unit=value), file=sys.stderr)
        raise


def build_questions(data: List[Dict[str, Any]]) -> List[QuestionItem]:
    questions = []
    for item in data:
        q = QuestionItem(
            question_id=item["question_id"],
            name=item.get("name", ""),
            description=item.get("description", ""),
            formula_expression=item.get("formula_expression", ""),
            input_params=item.get("input_params", {}),
            input_unit=parse_unit(item["input_unit"], item["question_id"]) if item.get("input_unit") else None,
            expected_output_unit=parse_unit(item["expected_output_unit"], item["question_id"]) if item.get("expected_output_unit") else None,
            supplementary_note=item.get("supplementary_note"),
            historical_reference=item.get("historical_reference", {}),
            source_trace=item.get("source_trace", {}),
        )
        questions.append(q)
    return questions


def build_confirmations(data: List[Dict[str, Any]]) -> Dict[str, ManualConfirmation]:
    result = {}
    for item in data:
        c = ManualConfirmation(
            confirmation_id=item.get("confirmation_id", ""),
            question_id=item["question_id"],
            reason=item.get("reason", ""),
            original_value=item.get("original_value"),
            original_unit=parse_unit(item["original_unit"], item["question_id"]) if item.get("original_unit") else None,
            adjusted_value=item.get("adjusted_value"),
            adjusted_unit=parse_unit(item["adjusted_unit"], item["question_id"]) if item.get("adjusted_unit") else None,
            operator=item.get("operator", ""),
            status=ConfirmationStatus(item.get("status", "pending_confirmation")),
            next_step=item.get("next_step", ""),
            timestamp=item.get("timestamp", ""),
        )
        result[c.question_id] = c
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="queue_window_calc",
        description="排队窗口参数试算 - 日常脚本稳定接口",
    )
    parser.add_argument(
        "--questions_file",
        required=True,
        help="题目清单 JSON 文件路径（必填）",
    )
    parser.add_argument(
        "--confirmations_file",
        default=None,
        help="人工确认 JSON 文件路径（可选）",
    )
    parser.add_argument(
        "--output_dir",
        default="./output",
        help="结果输出目录（默认 ./output）",
    )
    parser.add_argument(
        "--format",
        choices=["json", "csv", "both"],
        default="both",
        help="导出格式：json / csv / both（默认 both）",
    )
    parser.add_argument(
        "--history_file",
        default=None,
        help="历史记录 JSON 文件路径（可选，用于追踪变化）",
    )
    parser.add_argument(
        "--extrapolation_rules_file",
        default=None,
        help="外推越界规则 JSON 文件路径（可选）",
    )
    parser.add_argument(
        "--summary_only",
        action="store_true",
        help="仅输出汇总统计，不打印每条明细",
    )
    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if not os.path.isfile(args.questions_file):
        print(ERROR_MESSAGES["INPUT_FILE_NOT_FOUND"].format(path=args.questions_file), file=sys.stderr)
        return 2
    try:
        raw_questions = load_questions_from_json(args.questions_file)
    except Exception as e:
        print(ERROR_MESSAGES["INPUT_FILE_INVALID"].format(detail=str(e)), file=sys.stderr)
        return 2
    if not raw_questions:
        print(ERROR_MESSAGES["NO_QUESTIONS"], file=sys.stderr)
        return 2
    try:
        questions = build_questions(raw_questions)
    except Exception:
        return 2

    confirmations = None
    if args.confirmations_file:
        try:
            with open(args.confirmations_file, "r", encoding="utf-8") as f:
                raw_conf = json.load(f)
            confirmations = build_confirmations(raw_conf)
        except Exception as e:
            print(ERROR_MESSAGES["CONFIRM_FILE_INVALID"].format(detail=str(e)), file=sys.stderr)
            return 2

    extrapolation_rules = None
    if args.extrapolation_rules_file:
        try:
            with open(args.extrapolation_rules_file, "r", encoding="utf-8") as f:
                extrapolation_rules = json.load(f)
        except Exception as e:
            print(f"[WARN] 外推规则文件读取失败，使用默认规则：{e}", file=sys.stderr)

    try:
        os.makedirs(args.output_dir, exist_ok=True)
    except Exception as e:
        print(ERROR_MESSAGES["OUTPUT_DIR_ERROR"].format(detail=str(e)), file=sys.stderr)
        return 3

    tracker = HistoryTracker(storage_path=args.history_file) if args.history_file else None

    report = run_batch(
        questions=questions,
        manual_confirmations=confirmations,
        extrapolation_rules=extrapolation_rules,
        history_tracker=tracker,
    )

    base_name = f"queue_window_report_{report.batch_id}"
    json_path = None
    csv_path = None
    if args.format in ("json", "both"):
        json_path = os.path.join(args.output_dir, f"{base_name}.json")
        export_report_to_json(report, json_path)
    if args.format in ("csv", "both"):
        csv_path = os.path.join(args.output_dir, f"{base_name}.csv")
        export_report_to_csv(report, csv_path)
    if tracker and args.history_file:
        export_history_to_json(tracker, args.history_file)

    print("=" * 60)
    print(f"排队窗口参数试算 批次号: {report.batch_id}")
    print("=" * 60)
    print(f"题目总数:     {report.total_questions}")
    print(f"成功:         {report.success_count}")
    print(f"告警:         {report.warning_count}")
    print(f"失败:         {report.failed_count}")
    print(f"待人工确认:   {report.needs_confirmation_count}")
    if report.exceptions_summary:
        print("-" * 40)
        print("异常汇总:")
        for item in report.exceptions_summary:
            print(f"  - {item['exception_type']}: {item['count']} 条")
    if json_path:
        print(f"JSON 报告:    {json_path}")
    if csv_path:
        print(f"CSV  报告:    {csv_path}")
    if args.history_file:
        print(f"历史记录:     {args.history_file}")
    print("=" * 60)

    if not args.summary_only:
        for r in report.results:
            status_icon = {"success": "✓", "warning": "!", "failed": "✗", "needs_confirmation": "?"}.get(r.status.value, " ")
            unit_str = r.final_unit.value if r.final_unit else ""
            print(f"[{status_icon}] {r.question_id} {r.question_name}")
            print(f"    结论: {r.conclusion}")
            if r.final_value is not None:
                print(f"    最终值: {r.final_value} {unit_str}")
            for exc in r.exceptions:
                print(f"    异常[{exc.exception_type.value}]: {exc.message}")
                if exc.suggestion:
                    print(f"      建议: {exc.suggestion}")
            for conf in r.confirmations:
                if conf.status.value == "pending_confirmation":
                    print(f"    待确认: {conf.reason}")
                    print(f"      下一步: {conf.next_step}")

    if report.failed_count > 0 or report.needs_confirmation_count > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
