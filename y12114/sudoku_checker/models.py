from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class IssueSeverity(Enum):
    ERROR = "error"
    WARNING = "warning"
    CONFLICT = "conflict"


class IssueCategory(Enum):
    RULE_VIOLATION = "rule_violation"
    CANDIDATE_CONFLICT = "candidate_conflict"
    STEP_JUMP = "step_jump"
    UNIQUENESS_DESTROYED = "uniqueness_destroyed"
    INCONSISTENT_CANDIDATES = "inconsistent_candidates"


@dataclass
class Cell:
    row: int
    col: int
    value: Optional[int] = None
    candidates: set[int] = field(default_factory=set)
    annotation: str = ""

    @property
    def coord(self) -> str:
        return f"R{self.row + 1}C{self.col + 1}"

    @property
    def box(self) -> int:
        return (self.row // 3) * 3 + self.col // 3


@dataclass
class BadRow:
    line_number: int
    content: str
    reason: str


@dataclass
class PropagationStep:
    cell: tuple[int, int]
    action: str
    value: Optional[int] = None
    eliminated: Optional[set[int]] = None
    reason: str = ""
    step_index: int = 0
    parent_indices: list[int] = field(default_factory=list)

    @property
    def coord(self) -> str:
        return f"R{self.cell[0] + 1}C{self.cell[1] + 1}"


@dataclass
class Issue:
    severity: IssueSeverity
    category: IssueCategory
    cell: Optional[tuple[int, int]]
    description: str
    propagation_trace: list[PropagationStep] = field(default_factory=list)
    explanation: str = ""
    related_cells: list[tuple[int, int]] = field(default_factory=list)

    @property
    def cell_coord(self) -> str:
        if self.cell:
            return f"R{self.cell[0] + 1}C{self.cell[1] + 1}"
        return "N/A"


@dataclass
class Board:
    cells: list[list[Cell]] = field(default_factory=lambda: [])
    bad_rows: list[BadRow] = field(default_factory=list)
    source_file: str = ""

    def get_cell(self, r: int, c: int) -> Optional[Cell]:
        if 0 <= r < 9 and 0 <= c < 9 and len(self.cells) > r and len(self.cells[r]) > c:
            return self.cells[r][c]
        return None

    def get_row_cells(self, r: int) -> list[Cell]:
        if 0 <= r < 9 and len(self.cells) > r:
            return self.cells[r]
        return []

    def get_col_cells(self, c: int) -> list[Cell]:
        return [self.cells[r][c] for r in range(9) if len(self.cells) > r and len(self.cells[r]) > c]

    def get_box_cells(self, box: int) -> list[Cell]:
        br = (box // 3) * 3
        bc = (box % 3) * 3
        result = []
        for r in range(br, br + 3):
            for c in range(bc, bc + 3):
                cell = self.get_cell(r, c)
                if cell:
                    result.append(cell)
        return result

    def filled_cells(self) -> list[Cell]:
        result = []
        for r in range(9):
            for c in range(9):
                cell = self.get_cell(r, c)
                if cell and cell.value is not None:
                    result.append(cell)
        return result

    def is_complete(self) -> bool:
        return len(self.filled_cells()) == 81


@dataclass
class CheckResult:
    board_name: str
    board: Board
    issues: list[Issue] = field(default_factory=list)
    propagation_log: list[PropagationStep] = field(default_factory=list)
    conflict_issues: list[Issue] = field(default_factory=list)
    review_issues: list[Issue] = field(default_factory=list)

    @property
    def has_errors(self) -> bool:
        return any(i.severity == IssueSeverity.ERROR for i in self.issues)

    @property
    def has_conflicts(self) -> bool:
        return len(self.conflict_issues) > 0

    @property
    def needs_review(self) -> bool:
        return len(self.review_issues) > 0

    def separate_issues(self):
        self.conflict_issues = [
            i for i in self.issues if i.category == IssueCategory.CANDIDATE_CONFLICT
        ]
        self.review_issues = [
            i
            for i in self.issues
            if i.category in (IssueCategory.STEP_JUMP, IssueCategory.UNIQUENESS_DESTROYED)
        ]
