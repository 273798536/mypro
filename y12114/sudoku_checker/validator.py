from __future__ import annotations

from sudoku_checker.models import (
    Board,
    Cell,
    Issue,
    IssueCategory,
    IssueSeverity,
    PropagationStep,
)


def _check_row_duplicates(board: Board) -> list[Issue]:
    issues = []
    for r in range(9):
        seen: dict[int, list[Cell]] = {}
        for cell in board.get_row_cells(r):
            if cell.value is not None:
                seen.setdefault(cell.value, []).append(cell)
        for val, cells in seen.items():
            if len(cells) > 1:
                issues.append(
                    Issue(
                        severity=IssueSeverity.ERROR,
                        category=IssueCategory.RULE_VIOLATION,
                        cell=(cells[0].row, cells[0].col),
                        description=f"第{r + 1}行数字{val}重复出现{len(cells)}次",
                        explanation="同一行中不能出现相同的数字",
                        related_cells=[(c.row, c.col) for c in cells],
                    )
                )
    return issues


def _check_col_duplicates(board: Board) -> list[Issue]:
    issues = []
    for c in range(9):
        seen: dict[int, list[Cell]] = {}
        for cell in board.get_col_cells(c):
            if cell.value is not None:
                seen.setdefault(cell.value, []).append(cell)
        for val, cells in seen.items():
            if len(cells) > 1:
                issues.append(
                    Issue(
                        severity=IssueSeverity.ERROR,
                        category=IssueCategory.RULE_VIOLATION,
                        cell=(cells[0].row, cells[0].col),
                        description=f"第{c + 1}列数字{val}重复出现{len(cells)}次",
                        explanation="同一列中不能出现相同的数字",
                        related_cells=[(c.row, c.col) for c in cells],
                    )
                )
    return issues


def _check_box_duplicates(board: Board) -> list[Issue]:
    issues = []
    for box in range(9):
        seen: dict[int, list[Cell]] = {}
        for cell in board.get_box_cells(box):
            if cell.value is not None:
                seen.setdefault(cell.value, []).append(cell)
        for val, cells in seen.items():
            if len(cells) > 1:
                br = (box // 3) * 3 + 1
                bc = (box % 3) * 3 + 1
                issues.append(
                    Issue(
                        severity=IssueSeverity.ERROR,
                        category=IssueCategory.RULE_VIOLATION,
                        cell=(cells[0].row, cells[0].col),
                        description=f"宫格(R{br}:R{br+2},C{bc}:C{bc+2})中数字{val}重复出现{len(cells)}次",
                        explanation="同一3x3宫格中不能出现相同的数字",
                        related_cells=[(c.row, c.col) for c in cells],
                    )
                )
    return issues


def _check_candidate_conflicts(board: Board) -> list[Issue]:
    issues = []
    for r in range(9):
        for c in range(9):
            cell = board.get_cell(r, c)
            if cell is None:
                continue

            if cell.value is not None and cell.candidates:
                if cell.value not in cell.candidates:
                    issues.append(
                        Issue(
                            severity=IssueSeverity.CONFLICT,
                            category=IssueCategory.CANDIDATE_CONFLICT,
                            cell=(r, c),
                            description=f"{cell.coord}填入值{cell.value}不在候选数{{{','.join(str(x) for x in sorted(cell.candidates))}}}中",
                            explanation=f"填入的数字{cell.value}应该出现在候选数列表里，但当前候选数不包含它，说明推理过程存在矛盾",
                        )
                    )

            if cell.value is None and cell.candidates:
                valid = _compute_valid_candidates(board, r, c)
                invalid = cell.candidates - valid
                if invalid:
                    issues.append(
                        Issue(
                            severity=IssueSeverity.CONFLICT,
                            category=IssueCategory.CANDIDATE_CONFLICT,
                            cell=(r, c),
                            description=f"{cell.coord}候选数{{{','.join(str(x) for x in sorted(invalid))}}}与同行/列/宫已填数字冲突",
                            explanation=f"候选数{sorted(invalid)}已被同行/列/宫的已填数字排除，但仍在候选列表中",
                        )
                    )

            if cell.value is None and not cell.candidates:
                valid = _compute_valid_candidates(board, r, c)
                if not valid:
                    issues.append(
                        Issue(
                            severity=IssueSeverity.CONFLICT,
                            category=IssueCategory.UNIQUENESS_DESTROYED,
                            cell=(r, c),
                            description=f"{cell.coord}没有任何有效候选数，唯一解已被破坏",
                            explanation="该格被同行/列/宫的已填数字排除了所有1-9的可能性，说明前面某步填数有误",
                        )
                    )

    return issues


def _compute_valid_candidates(board: Board, row: int, col: int) -> set[int]:
    all_vals = set(range(1, 10))
    row_vals = {c.value for c in board.get_row_cells(row) if c.value is not None}
    col_vals = {c.value for c in board.get_col_cells(col) if c.value is not None}
    cell = board.get_cell(row, col)
    if cell is None:
        return set()
    box_vals = {c.value for c in board.get_box_cells(cell.box) if c.value is not None}
    return all_vals - row_vals - col_vals - box_vals


def _check_step_jumps(
    board: Board, propagation_log: list[PropagationStep]
) -> list[Issue]:
    issues = []
    deduced_cells = set()
    for step in propagation_log:
        deduced_cells.add(step.cell)

    for r in range(9):
        for c in range(9):
            cell = board.get_cell(r, c)
            if cell is None or cell.value is None:
                continue
            if (r, c) in deduced_cells:
                continue
            if not cell.candidates and not cell.annotation:
                continue
            valid = _compute_valid_candidates_before(board, r, c)
            if len(valid) > 1:
                issues.append(
                    Issue(
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.STEP_JUMP,
                        cell=(r, c),
                        description=f"{cell.coord}填入{cell.value}存在步骤跳跃（剩余候选数{len(valid)}个）",
                        explanation=f"该格在约束传播后仍有{len(valid)}个候选数{sorted(valid)}，填入{cell.value}缺少显式推理步骤，可能是跳步填写",
                        propagation_trace=_trace_for_cell(propagation_log, r, c),
                    )
                )
    return issues


def _compute_valid_candidates_before(board: Board, row: int, col: int) -> set[int]:
    all_vals = set(range(1, 10))
    row_vals = {c.value for c in board.get_row_cells(row) if c.value is not None and (c.row, c.col) != (row, col)}
    col_vals = {c.value for c in board.get_col_cells(col) if c.value is not None and (c.row, c.col) != (row, col)}
    cell = board.get_cell(row, col)
    if cell is None:
        return set()
    box_vals = {c.value for c in board.get_box_cells(cell.box) if c.value is not None and (c.row, c.col) != (row, col)}
    return all_vals - row_vals - col_vals - box_vals


def _trace_for_cell(
    propagation_log: list[PropagationStep], row: int, col: int
) -> list[PropagationStep]:
    return [s for s in propagation_log if s.cell == (row, col)]


def _check_uniqueness_destruction(
    board: Board, propagation_log: list[PropagationStep]
) -> list[Issue]:
    issues = []
    for r in range(9):
        for c in range(9):
            cell = board.get_cell(r, c)
            if cell is None or cell.value is not None:
                continue
            valid = _compute_valid_candidates(board, r, c)
            if len(valid) == 0:
                trace = _trace_for_cell(propagation_log, r, c)
                issues.append(
                    Issue(
                        severity=IssueSeverity.ERROR,
                        category=IssueCategory.UNIQUENESS_DESTROYED,
                        cell=(r, c),
                        description=f"{cell.coord}所有候选数已被排除，唯一解被破坏",
                        explanation="前面的填数导致该格没有任何可填的数字，说明存在错误填数，需要回溯检查",
                        propagation_trace=trace,
                        related_cells=_find_responsible_cells(board, r, c),
                    )
                )
            elif len(valid) == 1:
                pass
    return issues


def _find_responsible_cells(
    board: Board, row: int, col: int
) -> list[tuple[int, int]]:
    responsible = []
    all_vals = set(range(1, 10))
    cell = board.get_cell(row, col)
    if cell is None:
        return responsible

    row_vals = {}
    for c in board.get_row_cells(row):
        if c.value is not None and (c.row, c.col) != (row, col):
            row_vals[c.value] = (c.row, c.col)

    col_vals = {}
    for c in board.get_col_cells(col):
        if c.value is not None and (c.row, c.col) != (row, col):
            col_vals[c.value] = (c.row, c.col)

    box_vals = {}
    for c in board.get_box_cells(cell.box):
        if c.value is not None and (c.row, c.col) != (row, col):
            box_vals[c.value] = (c.row, c.col)

    eliminated = all_vals - _compute_valid_candidates(board, row, col)
    for val in eliminated:
        if val in row_vals:
            responsible.append(row_vals[val])
        if val in col_vals:
            responsible.append(col_vals[val])
        if val in box_vals:
            responsible.append(box_vals[val])

    seen = set()
    unique = []
    for item in responsible:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def validate(
    board: Board, propagation_log: list[PropagationStep] | None = None
) -> list[Issue]:
    if propagation_log is None:
        propagation_log = []

    issues = []
    issues.extend(_check_row_duplicates(board))
    issues.extend(_check_col_duplicates(board))
    issues.extend(_check_box_duplicates(board))
    issues.extend(_check_candidate_conflicts(board))
    issues.extend(_check_step_jumps(board, propagation_log))
    issues.extend(_check_uniqueness_destruction(board, propagation_log))

    return issues
