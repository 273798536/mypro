"""Puzzle generation with hole-digging strategies."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Set
from .board import Board, GRID_SIZE, BOX_SIZE, ALL_VALUES
from .solver import solve, has_unique_solution, count_solutions
from .steps import solve_with_steps, classify_difficulty, compute_score, StepSolution
from .techniques import Step


SYMMETRY_ROTATIONAL = "rotational"
SYMMETRY_REFLECTION_H = "horizontal"
SYMMETRY_REFLECTION_V = "vertical"
SYMMETRY_NONE = "none"

VALID_SYMMETRIES = {SYMMETRY_ROTATIONAL, SYMMETRY_REFLECTION_H, SYMMETRY_REFLECTION_V, SYMMETRY_NONE}


@dataclass
class GenerationConfig:
    difficulty: str = "Medium"
    min_givens: int = 24
    max_givens: int = 40
    symmetry: str = SYMMETRY_ROTATIONAL
    target_score_range: Optional[Tuple[float, float]] = None
    max_attempts: int = 5000

    def __post_init__(self):
        if self.symmetry not in VALID_SYMMETRIES:
            raise ValueError(f"Invalid symmetry: {self.symmetry}. Must be one of {VALID_SYMMETRIES}")


@dataclass
class GenerationResult:
    puzzle: Optional[Board] = None
    solution: Optional[Board] = None
    steps_solution: Optional[StepSolution] = None
    difficulty: str = "Unknown"
    score: float = 0.0
    givens_count: int = 0
    symmetry_used: str = "none"
    success: bool = False
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    attempts: int = 0

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "error": self.error,
            "warnings": self.warnings,
            "puzzle": self.puzzle.to_list() if self.puzzle else None,
            "solution": self.solution.to_list() if self.solution else None,
            "difficulty": self.difficulty,
            "score": self.score,
            "givens_count": self.givens_count,
            "symmetry_used": self.symmetry_used,
            "attempts": self.attempts,
            "steps": self.steps_solution.to_dict() if self.steps_solution else None,
        }


def _generate_full_solution(rng: random.Random) -> Board:
    board = Board()
    nums = list(ALL_VALUES)
    for bi in [0, 4, 8]:
        br, bc = (bi // BOX_SIZE) * BOX_SIZE, (bi % BOX_SIZE) * BOX_SIZE
        box_vals = rng.sample(nums, 9)
        idx = 0
        for dr in range(BOX_SIZE):
            for dc in range(BOX_SIZE):
                board.place(br + dr, bc + dc, box_vals[idx])
                idx += 1
    for _ in range(20):
        sol = solve(board, count_limit=1)
        if sol.solution:
            return sol.solution
        board = Board()
        for bi in [0, 4, 8]:
            br, bc = (bi // BOX_SIZE) * BOX_SIZE, (bi % BOX_SIZE) * BOX_SIZE
            box_vals = rng.sample(nums, 9)
            idx = 0
            for dr in range(BOX_SIZE):
                for dc in range(BOX_SIZE):
                    board.place(br + dr, bc + dc, box_vals[idx])
                    idx += 1
    return board


def _get_symmetry_cells(row: int, col: int, symmetry: str) -> List[Tuple[int, int]]:
    if symmetry == SYMMETRY_ROTATIONAL:
        r2, c2 = GRID_SIZE - 1 - row, GRID_SIZE - 1 - col
        if (r2, c2) == (row, col):
            return [(row, col)]
        return [(row, col), (r2, c2)]
    elif symmetry == SYMMETRY_REFLECTION_H:
        c2 = GRID_SIZE - 1 - col
        if c2 == col:
            return [(row, col)]
        return [(row, col), (row, c2)]
    elif symmetry == SYMMETRY_REFLECTION_V:
        r2 = GRID_SIZE - 1 - row
        if r2 == row:
            return [(row, col)]
        return [(row, col), (r2, col)]
    return [(row, col)]


def _symmetry_digging(
    solution: Board,
    config: GenerationConfig,
    rng: random.Random,
    result: GenerationResult,
) -> Optional[Board]:
    puzzle = solution.clone()
    cells = [(r, c) for r in range(GRID_SIZE) for c in range(GRID_SIZE)]
    rng.shuffle(cells)

    for r, c in cells:
        if puzzle.grid[r][c] == 0:
            continue
        if puzzle.givens_count() <= config.min_givens:
            break
        sym_cells = _get_symmetry_cells(r, c, config.symmetry)
        vals_removed = []
        can_remove = True
        for sr, sc in sym_cells:
            if puzzle.grid[sr][sc] == 0:
                continue
            vals_removed.append((sr, sc, puzzle.grid[sr][sc]))
            puzzle.unplace(sr, sc)
        if not has_unique_solution(puzzle):
            for sr, sc, v in vals_removed:
                puzzle.place(sr, sc, v)
            can_remove = False
        if not can_remove:
            continue

    return puzzle


def _random_digging(
    solution: Board,
    config: GenerationConfig,
    rng: random.Random,
    result: GenerationResult,
) -> Optional[Board]:
    puzzle = solution.clone()
    cells = [(r, c) for r in range(GRID_SIZE) for c in range(GRID_SIZE)]
    rng.shuffle(cells)

    for r, c in cells:
        if puzzle.grid[r][c] == 0:
            continue
        if puzzle.givens_count() <= config.min_givens:
            break
        saved = puzzle.grid[r][c]
        puzzle.unplace(r, c)
        if not has_unique_solution(puzzle):
            puzzle.place(r, c, saved)

    return puzzle


def generate_puzzle(config: Optional[GenerationConfig] = None, seed: Optional[int] = None) -> GenerationResult:
    config = config or GenerationConfig()
    rng = random.Random(seed)
    result = GenerationResult()
    result.symmetry_used = config.symmetry

    best_puzzle = None
    best_solution = None
    best_steps = None
    best_score_diff = float("inf")
    fallback_threshold = max(50, config.max_attempts // 4)

    for attempt in range(config.max_attempts):
        result.attempts = attempt + 1
        try:
            solution = _generate_full_solution(rng)
        except Exception:
            continue

        if config.symmetry == SYMMETRY_NONE:
            puzzle = _random_digging(solution, config, rng, result)
        else:
            puzzle = _symmetry_digging(solution, config, rng, result)

        if puzzle is None:
            continue

        if puzzle.givens_count() < config.min_givens or puzzle.givens_count() > config.max_givens:
            result.warnings.append(f"Givens {puzzle.givens_count()} outside range [{config.min_givens}, {config.max_givens}]")

        sol_count = count_solutions(puzzle, limit=2)
        if sol_count != 1:
            result.warnings.append(f"Non-unique solution: {sol_count} solutions found")
            if sol_count > 1:
                result.error = "Puzzle has multiple solutions"
            else:
                result.error = "Puzzle has no valid solution"
            result.success = False
            return result

        steps_sol = solve_with_steps(puzzle)
        actual_difficulty = steps_sol.difficulty
        actual_score = steps_sol.score

        if config.target_score_range:
            lo, hi = config.target_score_range
            if lo <= actual_score <= hi:
                result.puzzle = puzzle
                result.solution = solution
                result.steps_solution = steps_sol
                result.difficulty = actual_difficulty
                result.score = actual_score
                result.givens_count = puzzle.givens_count()
                result.success = True
                return result
            elif attempt < fallback_threshold:
                diff = min(abs(actual_score - lo), abs(actual_score - hi))
                if diff < best_score_diff:
                    best_score_diff = diff
                    best_puzzle = puzzle
                    best_solution = solution
                    best_steps = steps_sol
                continue

        if config.difficulty == "Any" or actual_difficulty == config.difficulty:
            result.puzzle = puzzle
            result.solution = solution
            result.steps_solution = steps_sol
            result.difficulty = actual_difficulty
            result.score = actual_score
            result.givens_count = puzzle.givens_count()
            result.success = True
            return result

        if attempt < fallback_threshold:
            diff = _difficulty_distance(actual_difficulty, config.difficulty)
            if diff < best_score_diff:
                best_score_diff = diff
                best_puzzle = puzzle
                best_solution = solution
                best_steps = steps_sol

    if best_puzzle is not None:
        result.warnings.append(
            f"Could not match {config.difficulty} after {config.max_attempts} attempts. "
            f"Falling back to closest match: {best_steps.difficulty} (score {best_steps.score})"
        )
        result.puzzle = best_puzzle
        result.solution = best_solution
        result.steps_solution = best_steps
        result.difficulty = best_steps.difficulty
        result.score = best_steps.score
        result.givens_count = best_puzzle.givens_count()
        result.success = True
        return result

    result.error = f"Failed to generate puzzle after {config.max_attempts} attempts"
    result.success = False
    return result


def _difficulty_distance(a: str, b: str) -> float:
    order = {"Easy": 0, "Medium": 1, "Hard": 2, "Expert": 3, "Master": 4}
    return abs(order.get(a, 5) - order.get(b, 5))
