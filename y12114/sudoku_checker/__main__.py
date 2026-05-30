from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sudoku_checker.models import CheckResult, Issue, IssueCategory, IssueSeverity
from sudoku_checker.parser import parse_directory, parse_file
from sudoku_checker.propagation import propagate, trace_failure_path
from sudoku_checker.reporter import generate_report, print_terminal_summary
from sudoku_checker.validator import validate


def process_board(board_name: str, board) -> CheckResult:
    prop_log = propagate(board)

    issues = validate(board, prop_log)

    for issue in issues:
        if issue.category == IssueCategory.CANDIDATE_CONFLICT and issue.cell:
            failure_path = trace_failure_path(prop_log, issue.cell)
            issue.propagation_trace = failure_path

    result = CheckResult(
        board_name=board_name,
        board=board,
        issues=issues,
        propagation_log=prop_log,
    )
    result.separate_issues()

    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="sudoku-checker",
        description="数独教学纠错器 — 检查候选冲突、步骤跳跃、唯一解破坏等问题",
    )
    parser.add_argument(
        "-i", "--input",
        required=True,
        help="输入目录路径（包含 .txt/.csv 数独文件）或单个文件路径",
    )
    parser.add_argument(
        "-o", "--output",
        default="./output",
        help="输出目录路径，用于存放详细报告（默认: ./output）",
    )
    parser.add_argument(
        "--no-report",
        action="store_true",
        help="不生成文件报告，仅输出终端摘要",
    )

    args = parser.parse_args(argv)
    input_path = Path(args.input)

    results: list[CheckResult] = []

    if input_path.is_file():
        board = parse_file(str(input_path))
        result = process_board(input_path.name, board)
        results.append(result)
    elif input_path.is_dir():
        board_list = parse_directory(str(input_path))
        if not board_list:
            print(f"错误: 输入目录 {args.input} 中未找到 .txt 或 .csv 文件", file=sys.stderr)
            return 1
        for name, board in board_list:
            result = process_board(name, board)
            results.append(result)
    else:
        print(f"错误: 输入路径 {args.input} 不存在", file=sys.stderr)
        return 1

    print_terminal_summary(results)

    if not args.no_report:
        report_path = generate_report(results, args.output)
        print(f"\n📄 详细报告已生成: {report_path}")

    has_critical = any(
        r.has_errors or r.has_conflicts or r.needs_review
        for r in results
    )
    return 1 if has_critical else 0


if __name__ == "__main__":
    sys.exit(main())
