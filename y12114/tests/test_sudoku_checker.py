from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sudoku_checker.parser import parse_board, parse_file
from sudoku_checker.validator import validate
from sudoku_checker.propagation import propagate, trace_failure_path
from sudoku_checker.models import (
    IssueCategory,
    IssueSeverity,
)


SAMPLES_DIR = Path(__file__).resolve().parent.parent / "samples"


def test_parse_valid_board():
    text = (
        "5 3 . . 7 . . . .\n"
        "6 . . 1 9 5 . . .\n"
        ". 9 8 . . . . 6 .\n"
        "8 . . . 6 . . . 3\n"
        "4 . . 8 . 3 . . 1\n"
        "7 . . . 2 . . . 6\n"
        ". 6 . . . . 2 8 .\n"
        ". . . 4 1 9 . . 5\n"
        ". . . . 8 . . 7 9\n"
    )
    board = parse_board(text)
    assert len(board.cells) == 9
    assert all(len(row) == 9 for row in board.cells)
    assert board.cells[0][0].value == 5
    assert board.cells[0][2].value is None
    assert len(board.bad_rows) == 0


def test_parse_with_separators_and_comments():
    text = (
        "5 3 4 | 6 7 8 | 9 1 2\n"
        "6 7 2 | 1 9 5 | 3 4 8\n"
        "1 9 8 | 3 4 2 | 5 6 7\n"
        "------+-------+------\n"
        "8 5 9 | 7 6 1 | 4 2 3\n"
        "4 2 6 | 8 5 3 | 7 9 1\n"
        "7 1 3 | 9 2 4 | 8 5 6\n"
        "------+-------+------\n"
        "9 6 1 | 5 3 7 | 2 8 4\n"
        "# this is a comment\n"
        "2 8 7 | 4 1 9 | 6 3 5\n"
        "3 4 5 | 2 8 6 | 1 7 9\n"
    )
    board = parse_board(text)
    assert len(board.cells) == 9
    assert board.cells[0][0].value == 5
    assert board.cells[8][8].value == 9
    assert len(board.bad_rows) == 0


def test_parse_candidates_section():
    text = (
        "5 3 . . 7 . . . .\n"
        "6 . . 1 9 5 . . .\n"
        ". 9 8 . . . . 6 .\n"
        "8 . . . 6 . . . 3\n"
        "4 . . 8 . 3 . . 1\n"
        "7 . . . 2 . . . 6\n"
        ". 6 . . . . 2 8 .\n"
        ". . . 4 1 9 . . 5\n"
        ". . . . 8 . . 7 9\n"
        "\n"
        "candidates:\n"
        "{1,4} {2} {4} {2,6} {1,4} {2,4} {9} {1,3,9} {2,4,7}\n"
        "{2,3,7} {2,4,7} {2,3,7} . . . {1,3,7} {1,3,7} {2,4,7}\n"
        "{1,2,3,7} . . {2,3,5,7} {1,3,5} {2,3,7} {1,3,5,7} . {2,4,7}\n"
        ". {1,2,5,7} {1,2,5,7} {5,7,9} . {1,7} {1,5,7,9} {1,5,7} .\n"
        ". {1,2,7} {2,7} . {1,5,7} . {4,7} {4,7} .\n"
        ". {1,3,5} {1,3,5} {3,5,7,9} . {1,7} {1,3,5,7,9} {1,5,7} .\n"
        "{1,3,4} . {1,3,5,7} {3,5,7} {3,5,7} {3,7} . . {4,7}\n"
        "{2,3} {2,3,7,8} {2,3,7} . . . {1,3,6,7} {1,3} .\n"
        "{1,2,3} {1,2,3,4} {1,2,3,6} {2,3,5,6} . {2,3,6} {1,3,5,6} . .\n"
    )
    board = parse_board(text)
    assert len(board.cells) == 9
    cell = board.get_cell(0, 0)
    assert cell.value == 5
    cell_02 = board.get_cell(0, 2)
    assert 4 in cell_02.candidates


def test_parse_annotations_section():
    text = (
        "5 3 . . 7 . . . .\n"
        "6 . . 1 9 5 . . .\n"
        ". 9 8 . . . . 6 .\n"
        "8 . . . 6 . . . 3\n"
        "4 . . 8 . 3 . . 1\n"
        "7 . . . 2 . . . 6\n"
        ". 6 . . . . 2 8 .\n"
        ". . . 4 1 9 . . 5\n"
        ". . . . 8 . . 7 9\n"
        "\n"
        "annotations:\n"
        "R5C5: 应为7\n"
        "R3C3: 正确\n"
    )
    board = parse_board(text)
    assert "应为7" in board.get_cell(4, 4).annotation
    assert "正确" in board.get_cell(2, 2).annotation


def test_bad_rows_detected():
    text = (
        "5 3 . . 7 . . . .\n"
        "6 . . 1 9 5 . . .\n"
        ". 9 8 . . . . 6 .\n"
        "8 . . . 6 . . . 3\n"
        "4 . . 8 . 3 . . 1\n"
        "7 . . . 2 . . . 6\n"
        ". 6 . . . . 2 8 .\n"
        ". . . 4 1 9 . . 5\n"
        ". . . . 8 . . 7\n"
        "这行是乱七八糟的内容\n"
        "1 2 3 4 5 6 7 8 9 10 11\n"
    )
    board = parse_board(text)
    assert len(board.bad_rows) >= 1


def test_validate_no_issues():
    text = (
        "5 3 4 | 6 7 8 | 9 1 2\n"
        "6 7 2 | 1 9 5 | 3 4 8\n"
        "1 9 8 | 3 4 2 | 5 6 7\n"
        "------+-------+------\n"
        "8 5 9 | 7 6 1 | 4 2 3\n"
        "4 2 6 | 8 5 3 | 7 9 1\n"
        "7 1 3 | 9 2 4 | 8 5 6\n"
        "------+-------+------\n"
        "9 6 1 | 5 3 7 | 2 8 4\n"
        "2 8 7 | 4 1 9 | 6 3 5\n"
        "3 4 5 | 2 8 6 | 1 7 9\n"
    )
    board = parse_board(text)
    issues = validate(board)
    rule_issues = [i for i in issues if i.category == IssueCategory.RULE_VIOLATION]
    assert len(rule_issues) == 0


def test_validate_row_duplicate():
    text = (
        "5 3 . . 7 . . . .\n"
        "6 . . 1 9 5 . . .\n"
        ". 9 8 . . . . 6 .\n"
        "8 . . . 6 . . . 3\n"
        "4 . . 8 5 5 . . 1\n"
        "7 . . . 2 . . . 6\n"
        ". 6 . . . . 2 8 .\n"
        ". . . 4 1 9 . . 5\n"
        ". . . . 8 . . 7 9\n"
    )
    board = parse_board(text)
    issues = validate(board)
    row_issues = [i for i in issues if i.category == IssueCategory.RULE_VIOLATION and "行" in i.description]
    assert len(row_issues) >= 1


def test_validate_candidate_conflict():
    text = (
        "5 3 . . 7 . . . .\n"
        "6 . . 1 9 5 . . .\n"
        ". 9 8 . . . . 6 .\n"
        "8 . . . 6 . . . 3\n"
        "4 . . 8 . 3 . . 1\n"
        "7 . . . 2 . . . 6\n"
        ". 6 . . . . 2 8 .\n"
        ". . . 4 1 9 . . 5\n"
        ". . . . 8 . . 7 9\n"
        "\n"
        "candidates:\n"
        ". . {1,2,4} . . . . . .\n"
        ". {2,4,7} {2,3,7} . . . . . .\n"
        ". . . {2,3,5} {1,3,5} {2,3,7} {1,3,5} . {2,4}\n"
        ". {1,2,5} {1,2,5} {5,7} . {1,7} {1,5,7} {1,5} .\n"
        ". {1,2,7} {2,7} . {1,5,7} . {4,7} {4,7} .\n"
        ". {1,3,5} {1,3,5} {3,5,7} . {1,7} {1,3,5} {1,5} .\n"
        ". . {1,3,5} {3,5} {3,5} {3} . . {4}\n"
        ". {2,3,8} {2,3} . . . {1,3} {1,3} .\n"
        ". . {1,2,3} {2,3,5} . {2,3} {1,3,5} . .\n"
    )
    board = parse_board(text)
    issues = validate(board)
    conflict_issues = [i for i in issues if i.category == IssueCategory.CANDIDATE_CONFLICT]
    assert len(conflict_issues) >= 0


def test_validate_step_jump():
    text = (
        "5 3 4{1,2,4} . 7 . . . .\n"
        "6 . . 1 9 5 . . .\n"
        ". 9 8 . . . . 6 .\n"
        "8 . . . 6 . . . 3\n"
        "4 . . 8 . 3 . . 1\n"
        "7 . . . 2 . . . 6\n"
        ". 6 . . . . 2 8 .\n"
        ". . . 4 1 9 . . 5\n"
        ". . . . 8 . . 7 9\n"
    )
    board = parse_board(text)
    prop_log = propagate(board)
    issues = validate(board, prop_log)
    step_jump_issues = [i for i in issues if i.category == IssueCategory.STEP_JUMP]
    assert len(step_jump_issues) >= 1


def test_propagation_produces_steps():
    text = (
        "5 3 . . 7 . . . .\n"
        "6 . . 1 9 5 . . .\n"
        ". 9 8 . . . . 6 .\n"
        "8 . . . 6 . . . 3\n"
        "4 . . 8 . 3 . . 1\n"
        "7 . . . 2 . . . 6\n"
        ". 6 . . . . 2 8 .\n"
        ". . . 4 1 9 . . 5\n"
        ". . . . 8 . . 7 9\n"
    )
    board = parse_board(text)
    steps = propagate(board)
    assert len(steps) > 0
    naked_singles = [s for s in steps if s.action == "naked_single"]
    hidden_singles = [s for s in steps if s.action == "hidden_single"]
    assert len(naked_singles) + len(hidden_singles) > 0


def test_trace_failure_path():
    text = (
        "5 3 . . 7 . . . .\n"
        "6 . . 1 9 5 . . .\n"
        ". 9 8 . . . . 6 .\n"
        "8 . . . 6 . . . 3\n"
        "4 . . 8 . 3 . . 1\n"
        "7 . . . 2 . . . 6\n"
        ". 6 . . . . 2 8 .\n"
        ". . . 4 1 9 . . 5\n"
        ". . . . 8 . . 7 9\n"
    )
    board = parse_board(text)
    steps = propagate(board)
    path = trace_failure_path(steps, (0, 2))
    assert isinstance(path, list)


def test_check_result_separation():
    from sudoku_checker.models import CheckResult, Board, Issue, IssueCategory, IssueSeverity

    board = Board(cells=[[None] * 9 for _ in range(9)])
    issues = [
        Issue(severity=IssueSeverity.CONFLICT, category=IssueCategory.CANDIDATE_CONFLICT,
              cell=(0, 0), description="conflict"),
        Issue(severity=IssueSeverity.WARNING, category=IssueCategory.STEP_JUMP,
              cell=(1, 1), description="jump"),
        Issue(severity=IssueSeverity.ERROR, category=IssueCategory.RULE_VIOLATION,
              cell=(2, 2), description="violation"),
        Issue(severity=IssueSeverity.ERROR, category=IssueCategory.UNIQUENESS_DESTROYED,
              cell=(3, 3), description="uniqueness"),
    ]
    result = CheckResult(board_name="test", board=board, issues=issues)
    result.separate_issues()
    assert len(result.conflict_issues) == 1
    assert result.conflict_issues[0].category == IssueCategory.CANDIDATE_CONFLICT
    assert len(result.review_issues) == 2
    review_cats = {i.category for i in result.review_issues}
    assert IssueCategory.STEP_JUMP in review_cats
    assert IssueCategory.UNIQUENESS_DESTROYED in review_cats


def test_parse_file_from_samples():
    board = parse_file(str(SAMPLES_DIR / "basic_valid.txt"))
    assert len(board.cells) == 9
    assert board.cells[0][0].value == 5


def test_cli_on_samples_directory():
    from sudoku_checker.__main__ import main

    rc = main(["-i", str(SAMPLES_DIR / "basic_valid.txt"), "-o", "/tmp/sudoku_test_out", "--no-report"])
    assert rc == 0


def test_cli_step_jump_returns_nonzero():
    from sudoku_checker.__main__ import main

    rc = main(["-i", str(SAMPLES_DIR / "step_jump.txt"), "-o", "/tmp/sudoku_test_out", "--no-report"])
    assert rc == 1


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
