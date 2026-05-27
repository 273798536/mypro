"""Backtracking solver with constraint propagation and uniqueness checking."""

from __future__ import annotations

from typing import Optional, Tuple, List
from .board import Board, GRID_SIZE, PEERS


class SolveResult:
    def __init__(self):
        self.solution: Optional[Board] = None
        self.unique: bool = True
        self.solution_count: int = 0
        self.nodes_explored: int = 0


def _find_mrv_cell(board: Board) -> Optional[Tuple[int, int]]:
    best_cell = None
    best_len = 10
    for r in range(GRID_SIZE):
        for c in range(GRID_SIZE):
            if board.grid[r][c] == 0:
                n = len(board.candidates[r][c])
                if n < best_len:
                    best_len = n
                    best_cell = (r, c)
                    if n <= 1:
                        return best_cell
    return best_cell


def _naked_singles(board: Board) -> int:
    placed = 0
    changed = True
    while changed:
        changed = False
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                if board.grid[r][c] == 0 and len(board.candidates[r][c]) == 1:
                    v = next(iter(board.candidates[r][c]))
                    if board.place(r, c, v):
                        placed += 1
                        changed = True
    return placed


def _hidden_singles(board: Board) -> int:
    placed = 0
    changed = True
    while changed:
        changed = False
        for v in range(1, 10):
            for r in range(GRID_SIZE):
                cells = [c for c in range(GRID_SIZE) if v in board.candidates[r][c]]
                if len(cells) == 1 and board.grid[r][cells[0]] == 0:
                    if board.place(r, cells[0], v):
                        placed += 1
                        changed = True
            for c in range(GRID_SIZE):
                cells = [r for r in range(GRID_SIZE) if v in board.candidates[r][c]]
                if len(cells) == 1 and board.grid[cells[0]][c] == 0:
                    if board.place(cells[0], c, v):
                        placed += 1
                        changed = True
            for bi in range(GRID_SIZE):
                br, bc = (bi // 3) * 3, (bi % 3) * 3
                cells = [(br + dr, bc + dc)
                         for dr in range(3) for dc in range(3)
                         if v in board.candidates[br + dr][bc + dc]]
                if len(cells) == 1 and board.grid[cells[0][0]][cells[0][1]] == 0:
                    if board.place(cells[0][0], cells[0][1], v):
                        placed += 1
                        changed = True
    return placed


def _constraint_propagate(board: Board) -> None:
    _naked_singles(board)
    _hidden_singles(board)


def solve(board: Board, count_limit: int = 2) -> SolveResult:
    result = SolveResult()
    _backtrack(board.clone(), result, count_limit)
    return result


def _backtrack(board: Board, result: SolveResult, count_limit: int) -> None:
    result.nodes_explored += 1

    if result.solution_count >= count_limit:
        result.unique = False
        return

    _constraint_propagate(board)

    for r in range(GRID_SIZE):
        for c in range(GRID_SIZE):
            if board.grid[r][c] == 0 and len(board.candidates[r][c]) == 0:
                return

    cell = _find_mrv_cell(board)
    if cell is None:
        if result.solution_count == 0:
            result.solution = board.clone()
        result.solution_count += 1
        return

    r, c = cell
    for v in sorted(board.candidates[r][c]):
        if board.is_valid_placement(r, c, v):
            snapshot = board.clone()
            board.place(r, c, v)
            _backtrack(board, result, count_limit)
            board.grid = snapshot.grid
            board.candidates = snapshot.candidates
            if result.solution_count >= count_limit:
                return


def has_unique_solution(board: Board) -> bool:
    result = solve(board, count_limit=2)
    return result.solution_count == 1


def count_solutions(board: Board, limit: int = 2) -> int:
    return solve(board, count_limit=limit).solution_count
