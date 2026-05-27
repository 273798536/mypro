"""Step-by-step solver and difficulty scoring."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from .board import Board, GRID_SIZE
from .techniques import Step, find_next_step, apply_step, TECHNIQUE_SCORES
from .solver import solve


DIFFICULTY_BANDS = [
    ("Easy", 0, 50),
    ("Medium", 50, 120),
    ("Hard", 120, 250),
    ("Expert", 250, 400),
    ("Master", 400, float("inf")),
]


@dataclass
class StepSolution:
    steps: List[Step] = field(default_factory=list)
    solved: bool = False
    technique_counts: Dict[str, int] = field(default_factory=dict)
    score: float = 0.0
    difficulty: str = "Unknown"

    def to_dict(self) -> dict:
        return {
            "steps": [
                {
                    "technique": s.technique,
                    "description": s.description,
                    "cells_affected": [[r + 1, c + 1] for r, c in s.cells_affected],
                    "values_used": s.values_used,
                    "eliminations": {f"R{r+1}C{c+1}": sorted(v) for (r, c), v in s.eliminations.items()},
                    "placements": {f"R{r+1}C{c+1}": v for (r, c), v in s.placements.items()},
                }
                for s in self.steps
            ],
            "solved": self.solved,
            "technique_counts": self.technique_counts,
            "score": self.score,
            "difficulty": self.difficulty,
        }


def solve_with_steps(board: Board, max_steps: int = 500) -> StepSolution:
    result = StepSolution()
    working = board.clone()

    init_placements = {}
    while True:
        placed = False
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                if working.grid[r][c] == 0 and len(working.candidates[r][c]) == 1:
                    v = next(iter(working.candidates[r][c]))
                    if working.place(r, c, v):
                        init_placements[(r, c)] = v
                        placed = True
        if not placed:
            break

    if init_placements:
        result.steps.append(Step(
            technique="Constraint Propagation",
            description=f"Initial constraint propagation filled {len(init_placements)} cells",
            cells_affected=list(init_placements.keys()),
            values_used=list(set(init_placements.values())),
            placements=init_placements,
        ))
        result.technique_counts["Constraint Propagation"] = 1

    if working.is_solved():
        result.solved = True
    else:
        for _ in range(max_steps):
            if working.is_solved():
                result.solved = True
                break

            step = find_next_step(working)
            if step is None:
                step = Step(
                    technique="Brute Force",
                    description="No logical deduction found; resorting to trial-and-error",
                    cells_affected=[],
                    values_used=[],
                )
                sol = solve(working, count_limit=1)
                if sol.solution:
                    for r in range(9):
                        for c in range(9):
                            if working.grid[r][c] == 0:
                                step.placements[(r, c)] = sol.solution.grid[r][c]
                    apply_step(working, step)
                else:
                    break

            result.steps.append(step)
            result.technique_counts[step.technique] = result.technique_counts.get(step.technique, 0) + 1
            apply_step(working, step)

    result.score = compute_score(result.technique_counts)
    result.difficulty = classify_difficulty(result.score)
    return result


def compute_score(technique_counts: Dict[str, int]) -> float:
    score = 0.0
    for technique, count in technique_counts.items():
        base = TECHNIQUE_SCORES.get(technique, 50)
        score += base * count
    if technique_counts.get("Brute Force", 0) > 0:
        score *= 1.5
    return round(score, 1)


def classify_difficulty(score: float) -> str:
    for label, lo, hi in DIFFICULTY_BANDS:
        if lo <= score < hi:
            return label
    return "Master"


def score_puzzle(board: Board) -> StepSolution:
    return solve_with_steps(board)
