"""Human-like Sudoku solving techniques for step-by-step solution and difficulty grading."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Set, Tuple, Optional, Dict
from .board import Board, GRID_SIZE, BOX_SIZE, box_index


@dataclass
class Step:
    technique: str
    description: str
    cells_affected: List[Tuple[int, int]] = field(default_factory=list)
    values_used: List[int] = field(default_factory=list)
    eliminations: Dict[Tuple[int, int], Set[int]] = field(default_factory=dict)
    placements: Dict[Tuple[int, int], int] = field(default_factory=dict)


TECHNIQUE_SCORES: Dict[str, float] = {
    "Constraint Propagation": 5,
    "Naked Single": 10,
    "Hidden Single": 15,
    "Naked Pair": 25,
    "Hidden Pair": 35,
    "Naked Triple": 35,
    "Pointing Pair": 30,
    "Box-Line Reduction": 40,
    "X-Wing": 75,
    "Swordfish": 120,
    "XY-Wing": 80,
    "Brute Force": 200,
}


def _naked_single(board: Board) -> Optional[Step]:
    for r in range(GRID_SIZE):
        for c in range(GRID_SIZE):
            if board.grid[r][c] == 0 and len(board.candidates[r][c]) == 1:
                v = next(iter(board.candidates[r][c]))
                return Step(
                    technique="Naked Single",
                    description=f"Cell R{r+1}C{c+1} has only {v} remaining",
                    cells_affected=[(r, c)],
                    values_used=[v],
                    placements={(r, c): v},
                )
    return None


def _hidden_single(board: Board) -> Optional[Step]:
    for v in range(1, 10):
        for r in range(GRID_SIZE):
            cells = [c for c in range(GRID_SIZE) if v in board.candidates[r][c]]
            if len(cells) == 1 and board.grid[r][cells[0]] == 0:
                return Step(
                    technique="Hidden Single",
                    description=f"Row {r+1}: {v} can only go in R{r+1}C{cells[0]+1}",
                    cells_affected=[(r, cells[0])],
                    values_used=[v],
                    placements={(r, cells[0]): v},
                )
        for c in range(GRID_SIZE):
            cells = [r for r in range(GRID_SIZE) if v in board.candidates[r][c]]
            if len(cells) == 1 and board.grid[cells[0]][c] == 0:
                return Step(
                    technique="Hidden Single",
                    description=f"Col {c+1}: {v} can only go in R{cells[0]+1}C{c+1}",
                    cells_affected=[(cells[0], c)],
                    values_used=[v],
                    placements={(cells[0], c): v},
                )
        for bi in range(GRID_SIZE):
            br, bc = (bi // BOX_SIZE) * BOX_SIZE, (bi % BOX_SIZE) * BOX_SIZE
            cells = [(br + dr, bc + dc)
                     for dr in range(BOX_SIZE) for dc in range(BOX_SIZE)
                     if v in board.candidates[br + dr][bc + dc]]
            if len(cells) == 1 and board.grid[cells[0][0]][cells[0][1]] == 0:
                return Step(
                    technique="Hidden Single",
                    description=f"Box {bi+1}: {v} can only go in R{cells[0][0]+1}C{cells[0][1]+1}",
                    cells_affected=[cells[0]],
                    values_used=[v],
                    placements={cells[0]: v},
                )
    return None


def _naked_pair(board: Board) -> Optional[Step]:
    units = _get_units()
    for unit in units:
        cells_in_unit = [(r, c) for r, c in unit if board.grid[r][c] == 0 and len(board.candidates[r][c]) == 2]
        for i in range(len(cells_in_unit)):
            for j in range(i + 1, len(cells_in_unit)):
                ci, cj = cells_in_unit[i], cells_in_unit[j]
                if board.candidates[ci[0]][ci[1]] == board.candidates[cj[0]][cj[1]]:
                    vals = board.candidates[ci[0]][ci[1]]
                    eliminations = {}
                    for r, c in unit:
                        if (r, c) != ci and (r, c) != cj and board.grid[r][c] == 0:
                            removed = vals & board.candidates[r][c]
                            if removed:
                                eliminations[(r, c)] = removed
                    if eliminations:
                        return Step(
                            technique="Naked Pair",
                            description=f"R{ci[0]+1}C{ci[1]+1} and R{cj[0]+1}C{cj[1]+1} hold {sorted(vals)}, eliminating from peers",
                            cells_affected=[ci, cj],
                            values_used=sorted(vals),
                            eliminations=eliminations,
                        )
    return None


def _hidden_pair(board: Board) -> Optional[Step]:
    units = _get_units()
    for unit in units:
        for v1 in range(1, 9):
            for v2 in range(v1 + 1, 10):
                cells_v1 = [(r, c) for r, c in unit if board.grid[r][c] == 0 and v1 in board.candidates[r][c]]
                cells_v2 = [(r, c) for r, c in unit if board.grid[r][c] == 0 and v2 in board.candidates[r][c]]
                common = set(cells_v1) & set(cells_v2)
                if len(common) == 2:
                    cells_list = list(common)
                    for r, c in cells_list:
                        board.candidates[r][c] &= {v1, v2}
                    eliminations = {}
                    for r, c in cells_list:
                        other = {v1, v2} - board.candidates[r][c]
                        if other:
                            eliminations[(r, c)] = other
                    return Step(
                        technique="Hidden Pair",
                        description=f"R{cells_list[0][0]+1}C{cells_list[0][1]+1} and R{cells_list[1][0]+1}C{cells_list[1][1]+1} hide {v1},{v2}",
                        cells_affected=cells_list,
                        values_used=[v1, v2],
                        eliminations=eliminations,
                    )
    return None


def _pointing_pair(board: Board) -> Optional[Step]:
    for bi in range(GRID_SIZE):
        br, bc = (bi // BOX_SIZE) * BOX_SIZE, (bi % BOX_SIZE) * BOX_SIZE
        box_cells = [(br + dr, bc + dc) for dr in range(BOX_SIZE) for dc in range(BOX_SIZE)]
        for v in range(1, 10):
            cells = [(r, c) for r, c in box_cells if board.grid[r][c] == 0 and v in board.candidates[r][c]]
            if len(cells) >= 2:
                rows = set(r for r, _ in cells)
                cols = set(c for _, c in cells)
                if len(rows) == 1:
                    r = next(iter(rows))
                    eliminations = {}
                    for c in range(GRID_SIZE):
                        if (r, c) not in cells and board.grid[r][c] == 0 and v in board.candidates[r][c]:
                            eliminations[(r, c)] = {v}
                    if eliminations:
                        return Step(
                            technique="Pointing Pair",
                            description=f"Box {bi+1}: {v} confined to row {r+1}, eliminating from rest of row",
                            cells_affected=cells,
                            values_used=[v],
                            eliminations=eliminations,
                        )
                if len(cols) == 1:
                    c = next(iter(cols))
                    eliminations = {}
                    for r in range(GRID_SIZE):
                        if (r, c) not in cells and board.grid[r][c] == 0 and v in board.candidates[r][c]:
                            eliminations[(r, c)] = {v}
                    if eliminations:
                        return Step(
                            technique="Pointing Pair",
                            description=f"Box {bi+1}: {v} confined to col {c+1}, eliminating from rest of col",
                            cells_affected=cells,
                            values_used=[v],
                            eliminations=eliminations,
                        )
    return None


def _box_line_reduction(board: Board) -> Optional[Step]:
    for r in range(GRID_SIZE):
        for v in range(1, 10):
            cells = [c for c in range(GRID_SIZE) if board.grid[r][c] == 0 and v in board.candidates[r][c]]
            if len(cells) >= 2:
                box_indices = set(box_index(r, c) for c in cells)
                if len(box_indices) == 1:
                    bi = next(iter(box_indices))
                    br, bc = (bi // BOX_SIZE) * BOX_SIZE, (bi % BOX_SIZE) * BOX_SIZE
                    eliminations = {}
                    for dr in range(BOX_SIZE):
                        for dc in range(BOX_SIZE):
                            rr, cc = br + dr, bc + dc
                            if rr != r and board.grid[rr][cc] == 0 and v in board.candidates[rr][cc]:
                                eliminations[(rr, cc)] = {v}
                    if eliminations:
                        return Step(
                            technique="Box-Line Reduction",
                            description=f"Row {r+1}: {v} only in box {bi+1}, eliminating from rest of box",
                            cells_affected=[(r, c) for c in cells],
                            values_used=[v],
                            eliminations=eliminations,
                        )
    for c in range(GRID_SIZE):
        for v in range(1, 10):
            cells = [r for r in range(GRID_SIZE) if board.grid[r][c] == 0 and v in board.candidates[r][c]]
            if len(cells) >= 2:
                box_indices = set(box_index(r, c) for r in cells)
                if len(box_indices) == 1:
                    bi = next(iter(box_indices))
                    br, bc = (bi // BOX_SIZE) * BOX_SIZE, (bi % BOX_SIZE) * BOX_SIZE
                    eliminations = {}
                    for dr in range(BOX_SIZE):
                        for dc in range(BOX_SIZE):
                            rr, cc = br + dr, bc + dc
                            if cc != c and board.grid[rr][cc] == 0 and v in board.candidates[rr][cc]:
                                eliminations[(rr, cc)] = {v}
                    if eliminations:
                        return Step(
                            technique="Box-Line Reduction",
                            description=f"Col {c+1}: {v} only in box {bi+1}, eliminating from rest of box",
                            cells_affected=[(r, c) for r in cells],
                            values_used=[v],
                            eliminations=eliminations,
                        )
    return None


def _x_wing(board: Board) -> Optional[Step]:
    for v in range(1, 10):
        for r1 in range(GRID_SIZE):
            cols_r1 = [c for c in range(GRID_SIZE) if board.grid[r1][c] == 0 and v in board.candidates[r1][c]]
            if len(cols_r1) != 2:
                continue
            for r2 in range(r1 + 1, GRID_SIZE):
                cols_r2 = [c for c in range(GRID_SIZE) if board.grid[r2][c] == 0 and v in board.candidates[r2][c]]
                if cols_r2 == cols_r1:
                    eliminations = {}
                    for c in cols_r1:
                        for r in range(GRID_SIZE):
                            if r != r1 and r != r2 and board.grid[r][c] == 0 and v in board.candidates[r][c]:
                                eliminations[(r, c)] = {v}
                    if eliminations:
                        return Step(
                            technique="X-Wing",
                            description=f"X-Wing on {v}: rows {r1+1},{r2+1} cols {cols_r1[0]+1},{cols_r1[1]+1}",
                            cells_affected=[(r1, cols_r1[0]), (r1, cols_r1[1]), (r2, cols_r1[0]), (r2, cols_r1[1])],
                            values_used=[v],
                            eliminations=eliminations,
                        )
        for c1 in range(GRID_SIZE):
            rows_c1 = [r for r in range(GRID_SIZE) if board.grid[r][c1] == 0 and v in board.candidates[r][c1]]
            if len(rows_c1) != 2:
                continue
            for c2 in range(c1 + 1, GRID_SIZE):
                rows_c2 = [r for r in range(GRID_SIZE) if board.grid[r][c2] == 0 and v in board.candidates[r][c2]]
                if rows_c2 == rows_c1:
                    eliminations = {}
                    for r in rows_c1:
                        for c in range(GRID_SIZE):
                            if c != c1 and c != c2 and board.grid[r][c] == 0 and v in board.candidates[r][c]:
                                eliminations[(r, c)] = {v}
                    if eliminations:
                        return Step(
                            technique="X-Wing",
                            description=f"X-Wing on {v}: cols {c1+1},{c2+1} rows {rows_c1[0]+1},{rows_c1[1]+1}",
                            cells_affected=[(rows_c1[0], c1), (rows_c1[1], c1), (rows_c1[0], c2), (rows_c1[1], c2)],
                            values_used=[v],
                            eliminations=eliminations,
                        )
    return None


def _get_units() -> List[List[Tuple[int, int]]]:
    units: List[List[Tuple[int, int]]] = []
    for r in range(GRID_SIZE):
        units.append([(r, c) for c in range(GRID_SIZE)])
    for c in range(GRID_SIZE):
        units.append([(r, c) for r in range(GRID_SIZE)])
    for bi in range(GRID_SIZE):
        br, bc = (bi // BOX_SIZE) * BOX_SIZE, (bi % BOX_SIZE) * BOX_SIZE
        units.append([(br + dr, bc + dc) for dr in range(BOX_SIZE) for dc in range(BOX_SIZE)])
    return units


def apply_step(board: Board, step: Step) -> None:
    for (r, c), v in step.placements.items():
        board.place(r, c, v)
    for (r, c), vals in step.eliminations.items():
        board.candidates[r][c] -= vals


def find_next_step(board: Board) -> Optional[Step]:
    for find_fn in [
        _naked_single,
        _hidden_single,
        _naked_pair,
        _hidden_pair,
        _pointing_pair,
        _box_line_reduction,
        _x_wing,
    ]:
        step = find_fn(board)
        if step is not None:
            return step
    return None
