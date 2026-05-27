"""Puzzle bank storage, duplicate detection, and export."""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from .board import Board, deserialize


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
BANK_FILE = os.path.join(DATA_DIR, "bank.json")


@dataclass
class PuzzleRecord:
    id: str
    puzzle: str
    solution: str
    difficulty: str
    score: float
    givens_count: int
    symmetry: str
    source: str
    created_at: float
    corrections: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "puzzle": self.puzzle,
            "solution": self.solution,
            "difficulty": self.difficulty,
            "score": self.score,
            "givens_count": self.givens_count,
            "symmetry": self.symmetry,
            "source": self.source,
            "created_at": self.created_at,
            "corrections": self.corrections,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "PuzzleRecord":
        return cls(
            id=d["id"],
            puzzle=d["puzzle"],
            solution=d["solution"],
            difficulty=d["difficulty"],
            score=d["score"],
            givens_count=d["givens_count"],
            symmetry=d.get("symmetry", "none"),
            source=d.get("source", "unknown"),
            created_at=d.get("created_at", time.time()),
            corrections=d.get("corrections", []),
        )


def _ensure_data_dir() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)


def load_bank() -> List[PuzzleRecord]:
    _ensure_data_dir()
    if not os.path.exists(BANK_FILE):
        return []
    try:
        with open(BANK_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [PuzzleRecord.from_dict(d) for d in data.get("puzzles", [])]
    except (json.JSONDecodeError, KeyError):
        return []


def save_bank(records: List[PuzzleRecord]) -> None:
    _ensure_data_dir()
    with open(BANK_FILE, "w", encoding="utf-8") as f:
        json.dump({"puzzles": [r.to_dict() for r in records]}, f, indent=2, ensure_ascii=False)


def add_puzzle(
    puzzle_board: Board,
    solution_board: Board,
    difficulty: str,
    score: float,
    symmetry: str,
    source: str,
    bank: Optional[List[PuzzleRecord]] = None,
) -> PuzzleRecord:
    bank = bank if bank is not None else load_bank()

    puzzle_hash = puzzle_board.canonical_hash()
    existing = find_by_hash(bank, puzzle_hash)
    if existing:
        existing.corrections.append({
            "type": "duplicate_detected",
            "timestamp": time.time(),
            "note": "Puzzle matches existing record via canonical hash",
        })
        save_bank(bank)
        return existing

    record = PuzzleRecord(
        id=_generate_id(),
        puzzle=puzzle_board.serialize(),
        solution=solution_board.serialize(),
        difficulty=difficulty,
        score=score,
        givens_count=puzzle_board.givens_count(),
        symmetry=symmetry,
        source=source,
        created_at=time.time(),
    )
    bank.append(record)
    save_bank(bank)
    return record


def _generate_id() -> str:
    return f"PZ-{int(time.time() * 1000)}-{os.getpid()}"


def find_by_hash(bank: List[PuzzleRecord], canonical_hash: str) -> Optional[PuzzleRecord]:
    for record in bank:
        board = deserialize(record.puzzle)
        if board.canonical_hash() == canonical_hash:
            return record
    return None


def find_duplicates(bank: List[PuzzleRecord]) -> Dict[str, List[PuzzleRecord]]:
    groups: Dict[str, List[PuzzleRecord]] = {}
    for record in bank:
        board = deserialize(record.puzzle)
        h = board.canonical_hash()
        if h not in groups:
            groups[h] = []
        groups[h].append(record)
    return {h: recs for h, recs in groups.items() if len(recs) > 1}


def export_bank(bank: Optional[List[PuzzleRecord]] = None, format: str = "json") -> str:
    bank = bank if bank is not None else load_bank()
    if format == "json":
        return json.dumps([r.to_dict() for r in bank], indent=2, ensure_ascii=False)
    elif format == "csv":
        lines = ["id,puzzle,solution,difficulty,score,givens_count,symmetry,source,created_at"]
        for r in bank:
            lines.append(f"{r.id},{r.puzzle},{r.solution},{r.difficulty},{r.score},{r.givens_count},{r.symmetry},{r.source},{r.created_at}")
        return "\n".join(lines)
    elif format == "grid":
        return "\n\n".join(
            _format_grid(r.puzzle) for r in bank
        )
    else:
        raise ValueError(f"Unsupported format: {format}")


def _format_grid(serialized: str) -> str:
    lines = []
    for r in range(9):
        row = ""
        for c in range(9):
            v = serialized[r * 9 + c]
            row += v if v != "0" else "."
            if c in (2, 5):
                row += "|"
        lines.append(" ".join(row))
        if r in (2, 5):
            lines.append("-" * 19)
    return "\n".join(lines)


def add_correction(record_id: str, correction_type: str, note: str, bank: Optional[List[PuzzleRecord]] = None) -> Optional[PuzzleRecord]:
    bank = bank if bank is not None else load_bank()
    for record in bank:
        if record.id == record_id:
            record.corrections.append({
                "type": correction_type,
                "timestamp": time.time(),
                "note": note,
            })
            save_bank(bank)
            return record
    return None


def get_statistics(bank: Optional[List[PuzzleRecord]] = None) -> dict:
    bank = bank if bank is not None else load_bank()
    stats = {
        "total": len(bank),
        "by_difficulty": {},
        "by_symmetry": {},
        "avg_score": 0.0,
        "avg_givens": 0.0,
        "with_corrections": 0,
    }
    if not bank:
        return stats
    total_score = 0.0
    total_givens = 0
    for r in bank:
        stats["by_difficulty"][r.difficulty] = stats["by_difficulty"].get(r.difficulty, 0) + 1
        stats["by_symmetry"][r.symmetry] = stats["by_symmetry"].get(r.symmetry, 0) + 1
        total_score += r.score
        total_givens += r.givens_count
        if r.corrections:
            stats["with_corrections"] += 1
    stats["avg_score"] = round(total_score / len(bank), 1)
    stats["avg_givens"] = round(total_givens / len(bank), 1)
    return stats
