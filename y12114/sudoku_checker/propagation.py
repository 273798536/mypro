from __future__ import annotations

from copy import deepcopy

from sudoku_checker.models import Board, Cell, PropagationStep


def _peers(row: int, col: int) -> set[tuple[int, int]]:
    result = set()
    for c in range(9):
        if c != col:
            result.add((row, c))
    for r in range(9):
        if r != row:
            result.add((r, col))
    br = (row // 3) * 3
    bc = (col // 3) * 3
    for r in range(br, br + 3):
        for c in range(bc, bc + 3):
            if (r, c) != (row, col):
                result.add((r, c))
    return result


def _compute_candidates(board: Board, row: int, col: int) -> set[int]:
    all_vals = set(range(1, 10))
    row_vals = {c.value for c in board.get_row_cells(row) if c.value is not None}
    col_vals = {c.value for c in board.get_col_cells(col) if c.value is not None}
    cell = board.get_cell(row, col)
    if cell is None:
        return set()
    box_vals = {c.value for c in board.get_box_cells(cell.box) if c.value is not None}
    return all_vals - row_vals - col_vals - box_vals


def propagate(board: Board, max_iterations: int = 100) -> list[PropagationStep]:
    steps: list[PropagationStep] = []
    step_index = 0

    working = deepcopy(board)

    candidates_map: dict[tuple[int, int], set[int]] = {}
    for r in range(9):
        for c in range(9):
            cell = working.get_cell(r, c)
            if cell is None:
                continue
            if cell.value is not None:
                candidates_map[(r, c)] = {cell.value}
            elif cell.candidates:
                candidates_map[(r, c)] = cell.candidates & _compute_candidates(working, r, c)
            else:
                candidates_map[(r, c)] = _compute_candidates(working, r, c)

    for _ in range(max_iterations):
        changed = False

        for r in range(9):
            for c in range(9):
                cell = working.get_cell(r, c)
                if cell is None or cell.value is not None:
                    continue

                current = candidates_map.get((r, c), set())
                valid = _compute_candidates(working, r, c)
                new_cands = current & valid

                eliminated = current - new_cands
                if eliminated:
                    parent_indices = []
                    for val in eliminated:
                        for pr, pc in _peers(r, c):
                            peer = working.get_cell(pr, pc)
                            if peer and peer.value == val:
                                for si, s in enumerate(steps):
                                    if s.cell == (pr, pc) and s.value == val:
                                        parent_indices.append(si)
                                        break

                    step = PropagationStep(
                        cell=(r, c),
                        action="eliminate",
                        eliminated=eliminated,
                        reason=f"同行/列/宫已有{sorted(eliminated)}，从{cell.coord}候选中排除",
                        step_index=step_index,
                        parent_indices=parent_indices,
                    )
                    steps.append(step)
                    step_index += 1
                    candidates_map[(r, c)] = new_cands
                    changed = True

        for r in range(9):
            for c in range(9):
                cell = working.get_cell(r, c)
                if cell is None or cell.value is not None:
                    continue

                cands = candidates_map.get((r, c), set())
                if len(cands) == 1:
                    val = next(iter(cands))
                    cell.value = val
                    cell.candidates = {val}

                    parent_indices = []
                    for si, s in enumerate(steps):
                        if s.cell == (r, c):
                            parent_indices.append(si)

                    step = PropagationStep(
                        cell=(r, c),
                        action="naked_single",
                        value=val,
                        reason=f"{cell.coord}仅剩唯一候选{val}（裸唯一）",
                        step_index=step_index,
                        parent_indices=parent_indices,
                    )
                    steps.append(step)
                    step_index += 1
                    changed = True

        changed |= _hidden_singles(working, candidates_map, steps, step_index)
        if steps:
            step_index = steps[-1].step_index + 1

        if not changed:
            break

    return steps


def _hidden_singles(
    working: Board,
    candidates_map: dict[tuple[int, int], set[int]],
    steps: list[PropagationStep],
    start_index: int,
) -> bool:
    found = False
    idx = start_index

    for unit_type in ("row", "col", "box"):
        for unit_idx in range(9):
            if unit_type == "row":
                cells = [(r, c) for c in range(9) for r in [unit_idx] if working.get_cell(r, c) and working.get_cell(r, c).value is None]
            elif unit_type == "col":
                cells = [(r, c) for r in range(9) for c in [unit_idx] if working.get_cell(r, c) and working.get_cell(r, c).value is None]
            else:
                br = (unit_idx // 3) * 3
                bc = (unit_idx % 3) * 3
                cells = [(r, c) for r in range(br, br + 3) for c in range(bc, bc + 3) if working.get_cell(r, c) and working.get_cell(r, c).value is None]

            val_positions: dict[int, list[tuple[int, int]]] = {}
            for pos in cells:
                for v in candidates_map.get(pos, set()):
                    val_positions.setdefault(v, []).append(pos)

            for val, positions in val_positions.items():
                if len(positions) == 1:
                    r, c = positions[0]
                    cell = working.get_cell(r, c)
                    if cell and cell.value is None:
                        cell.value = val
                        cell.candidates = {val}
                        candidates_map[(r, c)] = {val}

                        unit_label = {
                            "row": f"第{unit_idx + 1}行",
                            "col": f"第{unit_idx + 1}列",
                            "box": f"宫格{unit_idx + 1}",
                        }[unit_type]

                        step = PropagationStep(
                            cell=(r, c),
                            action="hidden_single",
                            value=val,
                            reason=f"{unit_label}中数字{val}仅能出现在{cell.coord}（隐唯一）",
                            step_index=idx,
                        )
                        steps.append(step)
                        idx += 1
                        found = True

    return found


def replay_steps(steps: list[PropagationStep], target_cell: tuple[int, int]) -> list[PropagationStep]:
    visited = set()
    result = []

    def _collect(cell: tuple[int, int], depth: int = 0):
        if depth > 50 or cell in visited:
            return
        visited.add(cell)
        for step in steps:
            if step.cell == cell and step.action in ("naked_single", "hidden_single"):
                result.append(step)
                for pi in step.parent_indices:
                    if pi < len(steps):
                        parent = steps[pi]
                        _collect(parent.cell, depth + 1)

    _collect(target_cell)
    result.sort(key=lambda s: s.step_index)
    return result


def trace_failure_path(steps: list[PropagationStep], conflict_cell: tuple[int, int]) -> list[PropagationStep]:
    visited = set()
    path = []

    def _trace(cell: tuple[int, int], depth: int = 0):
        if depth > 50 or cell in visited:
            return
        visited.add(cell)
        related = [s for s in steps if s.cell == cell]
        for step in related:
            path.append(step)
            for pi in step.parent_indices:
                if pi < len(steps):
                    parent = steps[pi]
                    _trace(parent.cell, depth + 1)

    _trace(conflict_cell)
    path.sort(key=lambda s: s.step_index)
    return path
