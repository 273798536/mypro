"""Sudoku board representation and candidate tracking."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Set, Optional, Tuple


GRID_SIZE = 9
BOX_SIZE = 3
ALL_VALUES = set(range(1, 10))
TOTAL_CELLS = GRID_SIZE * GRID_SIZE


def box_index(row: int, col: int) -> int:
    return (row // BOX_SIZE) * BOX_SIZE + (col // BOX_SIZE)


def peers_of(row: int, col: int) -> List[Tuple[int, int]]:
    peers = []
    for i in range(GRID_SIZE):
        if i != col:
            peers.append((row, i))
        if i != row:
            peers.append((i, col))
    br, bc = (row // BOX_SIZE) * BOX_SIZE, (col // BOX_SIZE) * BOX_SIZE
    for r in range(br, br + BOX_SIZE):
        for c in range(bc, bc + BOX_SIZE):
            if r != row or c != col:
                if (r, c) not in peers:
                    peers.append((r, c))
    return peers


PEERS: List[List[List[Tuple[int, int]]]] = [
    [peers_of(r, c) for c in range(GRID_SIZE)] for r in range(GRID_SIZE)
]


@dataclass
class Board:
    grid: List[List[int]] = field(default_factory=lambda: [[0] * GRID_SIZE for _ in range(GRID_SIZE)])
    given_mask: List[List[bool]] = field(default_factory=lambda: [[False] * GRID_SIZE for _ in range(GRID_SIZE)])
    candidates: List[List[Set[int]]] = field(default_factory=lambda: [[set(ALL_VALUES) for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)])

    @classmethod
    def from_grid(cls, grid: List[List[int]]) -> "Board":
        b = cls()
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                v = grid[r][c]
                if v != 0:
                    b.grid[r][c] = v
                    b.given_mask[r][c] = True
                    b.candidates[r][c] = set()
        b._propagate_all()
        return b

    def clone(self) -> "Board":
        b = Board()
        b.grid = [row[:] for row in self.grid]
        b.given_mask = [row[:] for row in self.given_mask]
        b.candidates = [[set(s) for s in row] for row in self.candidates]
        return b

    def _propagate_all(self) -> None:
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                if self.grid[r][c] != 0:
                    self._eliminate_from_peers(r, c, self.grid[r][c])

    def _eliminate_from_peers(self, row: int, col: int, value: int) -> None:
        for pr, pc in PEERS[row][col]:
            if value in self.candidates[pr][pc]:
                self.candidates[pr][pc].discard(value)

    def is_valid_placement(self, row: int, col: int, value: int) -> bool:
        if self.grid[row][col] != 0:
            return False
        for pr, pc in PEERS[row][col]:
            if self.grid[pr][pc] == value:
                return False
        return True

    def place(self, row: int, col: int, value: int) -> bool:
        if not self.is_valid_placement(row, col, value):
            return False
        self.grid[row][col] = value
        self.candidates[row][col] = set()
        self._eliminate_from_peers(row, col, value)
        return True

    def unplace(self, row: int, col: int) -> None:
        old = self.grid[row][col]
        if old == 0:
            return
        self.grid[row][col] = 0
        self.candidates[row][col] = set(ALL_VALUES)
        self._recompute_candidates()

    def _recompute_candidates(self) -> None:
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                if self.grid[r][c] == 0:
                    self.candidates[r][c] = set(ALL_VALUES)
        self._propagate_all()

    def empty_cells(self) -> List[Tuple[int, int]]:
        result = []
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                if self.grid[r][c] == 0:
                    result.append((r, c))
        return result

    def is_solved(self) -> bool:
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                if self.grid[r][c] == 0:
                    return False
        return self.is_valid()

    def is_valid(self) -> bool:
        rows: List[Set[int]] = [set() for _ in range(GRID_SIZE)]
        cols: List[Set[int]] = [set() for _ in range(GRID_SIZE)]
        boxes: List[Set[int]] = [set() for _ in range(GRID_SIZE)]
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                v = self.grid[r][c]
                if v == 0:
                    continue
                if v in rows[r] or v in cols[c] or v in boxes[box_index(r, c)]:
                    return False
                rows[r].add(v)
                cols[c].add(v)
                boxes[box_index(r, c)].add(v)
        return True

    def serialize(self) -> str:
        return "".join(str(self.grid[r][c]) for r in range(GRID_SIZE) for c in range(GRID_SIZE))

    def to_list(self) -> List[List[int]]:
        return [row[:] for row in self.grid]

    def givens_count(self) -> int:
        return sum(1 for r in range(GRID_SIZE) for c in range(GRID_SIZE) if self.grid[r][c] != 0)

    def canonical_hash(self) -> str:
        grid = self.grid
        rotations = []
        for _ in range(4):
            rotations.append(tuple(tuple(row) for row in grid))
            grid = [list(row) for row in zip(*grid[::-1])]
        flipped = [[grid[r][GRID_SIZE - 1 - c] for c in range(GRID_SIZE)] for r in range(GRID_SIZE)]
        for _ in range(4):
            rotations.append(tuple(tuple(row) for row in flipped))
            flipped = [list(row) for row in zip(*flipped[::-1])]
        return str(hash(min(rotations)))


def deserialize(serialized: str) -> Board:
    if len(serialized) != TOTAL_CELLS:
        raise ValueError(f"Expected {TOTAL_CELLS} characters, got {len(serialized)}")
    grid = [[int(serialized[r * GRID_SIZE + c]) for c in range(GRID_SIZE)] for r in range(GRID_SIZE)]
    return Board.from_grid(grid)
