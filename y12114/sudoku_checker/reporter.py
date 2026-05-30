from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

from sudoku_checker.models import (
    Board,
    CheckResult,
    Issue,
    IssueCategory,
    IssueSeverity,
    PropagationStep,
)

_SEVERITY_LABEL = {
    IssueSeverity.ERROR: "错误",
    IssueSeverity.WARNING: "警告",
    IssueSeverity.CONFLICT: "冲突",
}

_CATEGORY_LABEL = {
    IssueCategory.RULE_VIOLATION: "规则违反",
    IssueCategory.CANDIDATE_CONFLICT: "候选冲突",
    IssueCategory.STEP_JUMP: "步骤跳跃",
    IssueCategory.UNIQUENESS_DESTROYED: "唯一解破坏",
    IssueCategory.INCONSISTENT_CANDIDATES: "候选不一致",
}


def _format_propagation_trace(steps: list[PropagationStep], indent: str = "    ") -> str:
    if not steps:
        return indent + "（无传播记录）"
    lines = []
    for step in steps:
        if step.action == "eliminate":
            elim_str = ",".join(str(v) for v in sorted(step.eliminated or set()))
            lines.append(f"{indent}步骤{step.step_index}: {step.coord} 排除{{{elim_str}}} — {step.reason}")
        else:
            lines.append(f"{indent}步骤{step.step_index}: {step.coord} → {step.value}({step.action}) — {step.reason}")
    return "\n".join(lines)


def _format_board(board: Board) -> str:
    lines = []
    for r in range(9):
        row_cells = board.get_row_cells(r)
        parts = []
        for ci, cell in enumerate(row_cells):
            if cell.value is not None:
                parts.append(str(cell.value))
            elif cell.candidates:
                parts.append("{" + ",".join(str(v) for v in sorted(cell.candidates)) + "}")
            else:
                parts.append(".")
            if ci % 3 == 2 and ci < 8:
                parts.append("|")
        lines.append(" ".join(parts))
        if r % 3 == 2 and r < 8:
            lines.append("-" * 21)
    return "\n".join(lines)


def print_terminal_summary(results: list[CheckResult]) -> None:
    print("=" * 60)
    print("  数独教学纠错器 — 检查摘要")
    print("=" * 60)

    total_boards = len(results)
    total_errors = 0
    total_conflicts = 0
    total_reviews = 0
    total_bad_rows = 0

    for result in results:
        error_count = sum(1 for i in result.issues if i.severity == IssueSeverity.ERROR)
        conflict_count = len(result.conflict_issues)
        review_count = len(result.review_issues)
        bad_row_count = len(result.board.bad_rows)

        total_errors += error_count
        total_conflicts += conflict_count
        total_reviews += review_count
        total_bad_rows += bad_row_count

        print(f"\n{'─' * 50}")
        print(f"  📋 盘面: {result.board_name}")

        if result.board.bad_rows:
            print(f"  ⚠  坏行: {bad_row_count} 条")
            for br in result.board.bad_rows:
                print(f"      第{br.line_number}行: {br.reason}")
                print(f"        内容: {br.content[:60]}")

        if not result.issues and not result.conflict_issues:
            print("  ✅ 未发现问题")
            continue

        normal_issues = [
            i for i in result.issues
            if i.category not in (IssueCategory.CANDIDATE_CONFLICT,)
            and i not in result.conflict_issues
        ]

        if normal_issues:
            print(f"  🔍 问题: {len(normal_issues)} 项")
            for issue in normal_issues:
                sev = _SEVERITY_LABEL.get(issue.severity, str(issue.severity))
                cat = _CATEGORY_LABEL.get(issue.category, str(issue.category))
                print(f"    [{sev}][{cat}] {issue.cell_coord}: {issue.description}")

        if result.conflict_issues:
            print(f"  ⛔ 候选冲突: {conflict_count} 项（未混入正常结果，请单独复核）")
            for issue in result.conflict_issues:
                cat = _CATEGORY_LABEL.get(issue.category, str(issue.category))
                print(f"    [冲突][{cat}] {issue.cell_coord}: {issue.description}")

        if result.review_issues:
            print(f"  📌 需复核: {review_count} 项")
            for issue in result.review_issues:
                cat = _CATEGORY_LABEL.get(issue.category, str(issue.category))
                print(f"    [复核][{cat}] {issue.cell_coord}: {issue.description}")

    print(f"\n{'=' * 60}")
    print(f"  总计: {total_boards} 个盘面 | {total_errors} 个错误 | {total_conflicts} 个候选冲突 | {total_reviews} 项需复核 | {total_bad_rows} 条坏行")
    print("=" * 60)


def generate_report(results: list[CheckResult], output_dir: str) -> str:
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = out_path / f"sudoku_report_{timestamp}.txt"

    lines = []
    lines.append("=" * 70)
    lines.append("  数独教学纠错器 — 详细报告")
    lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 70)

    for result in results:
        lines.append("")
        lines.append("─" * 60)
        lines.append(f"  盘面: {result.board_name}")
        lines.append("─" * 60)

        lines.append("")
        lines.append("【盘面状态】")
        lines.append(_format_board(result.board))

        if result.board.bad_rows:
            lines.append("")
            lines.append("【坏行列表】")
            for br in result.board.bad_rows:
                lines.append(f"  第{br.line_number}行 | 原因: {br.reason}")
                lines.append(f"    原文: {br.content}")

        normal_issues = [
            i for i in result.issues
            if i.category not in (IssueCategory.CANDIDATE_CONFLICT,)
            and i not in result.conflict_issues
        ]

        if normal_issues:
            lines.append("")
            lines.append("【常规问题】")
            for idx, issue in enumerate(normal_issues, 1):
                sev = _SEVERITY_LABEL.get(issue.severity, str(issue.severity))
                cat = _CATEGORY_LABEL.get(issue.category, str(issue.category))
                lines.append(f"")
                lines.append(f"  问题 #{idx}")
                lines.append(f"    级别: {sev} | 类别: {cat} | 位置: {issue.cell_coord}")
                lines.append(f"    描述: {issue.description}")
                if issue.explanation:
                    lines.append(f"    错因解释: {issue.explanation}")
                if issue.related_cells:
                    cells_str = ", ".join(f"R{r+1}C{c+1}" for r, c in issue.related_cells)
                    lines.append(f"    关联格: {cells_str}")
                if issue.propagation_trace:
                    lines.append(f"    约束传播路径:")
                    lines.append(_format_propagation_trace(issue.propagation_trace, indent="      "))

        if result.conflict_issues:
            lines.append("")
            lines.append("【候选冲突 — 独立列出，未混入正常结果】")
            for idx, issue in enumerate(result.conflict_issues, 1):
                cat = _CATEGORY_LABEL.get(issue.category, str(issue.category))
                lines.append(f"")
                lines.append(f"  候选冲突 #{idx}")
                lines.append(f"    类别: {cat} | 位置: {issue.cell_coord}")
                lines.append(f"    描述: {issue.description}")
                if issue.explanation:
                    lines.append(f"    错因解释: {issue.explanation}")
                if issue.propagation_trace:
                    lines.append(f"    失败路径（约束传播回溯）:")
                    lines.append(_format_propagation_trace(issue.propagation_trace, indent="      "))

        if result.review_issues:
            lines.append("")
            lines.append("【需复核问题 — 步骤跳跃 / 唯一解破坏】")
            for idx, issue in enumerate(result.review_issues, 1):
                cat = _CATEGORY_LABEL.get(issue.category, str(issue.category))
                lines.append(f"")
                lines.append(f"  复核项 #{idx}")
                lines.append(f"    类别: {cat} | 位置: {issue.cell_coord}")
                lines.append(f"    描述: {issue.description}")
                if issue.explanation:
                    lines.append(f"    错因解释: {issue.explanation}")
                if issue.propagation_trace:
                    lines.append(f"    步骤回放:")
                    lines.append(_format_propagation_trace(issue.propagation_trace, indent="      "))
                if issue.related_cells:
                    cells_str = ", ".join(f"R{r+1}C{c+1}" for r, c in issue.related_cells)
                    lines.append(f"    责任格: {cells_str}")

        if result.propagation_log:
            lines.append("")
            lines.append("【完整约束传播日志】")
            for step in result.propagation_log:
                if step.action == "eliminate":
                    elim_str = ",".join(str(v) for v in sorted(step.eliminated or set()))
                    lines.append(f"  步骤{step.step_index}: {step.coord} 排除{{{elim_str}}} — {step.reason}")
                else:
                    lines.append(f"  步骤{step.step_index}: {step.coord} → {step.value}({step.action}) — {step.reason}")

    lines.append("")
    lines.append("=" * 70)
    lines.append("  报告结束")
    lines.append("=" * 70)

    report_text = "\n".join(lines)
    report_file.write_text(report_text, encoding="utf-8")
    return str(report_file)
