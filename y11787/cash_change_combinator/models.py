from __future__ import annotations

import copy
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class WarningKind(str, Enum):
    INSUFFICIENT_INVENTORY = "insufficient_inventory"
    DUPLICATE_DENOMINATION = "duplicate_denomination"
    TIED_OPTIMAL = "tied_optimal"


@dataclass
class SourceLocation:
    file: str
    line: int
    column: int | None = None

    def __str__(self) -> str:
        col = f":{self.column}" if self.column is not None else ""
        return f"{self.file}:{self.line}{col}"


@dataclass
class Denomination:
    value: int
    label: str
    source: SourceLocation | None = None


@dataclass
class InventoryEntry:
    denomination_value: int
    count: int
    source: SourceLocation | None = None


@dataclass
class ChangeRequest:
    amount: int
    cashier: str
    shift: str
    source: SourceLocation | None = None


@dataclass
class Combination:
    counts: dict[int, int]
    total_count: int

    def __str__(self) -> str:
        parts = []
        for val in sorted(self.counts.keys(), reverse=True):
            c = self.counts[val]
            if c > 0:
                parts.append(f"{val}x{c}")
        return " + ".join(parts) if parts else "0"


@dataclass
class ChangeWarning:
    kind: WarningKind
    message: str
    source: SourceLocation | None = None


@dataclass
class SolveResult:
    feasible: list[Combination]
    optimal: list[Combination]
    warnings: list[ChangeWarning] = field(default_factory=list)


@dataclass
class HistoryEntry:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    action: str = ""
    detail: str = ""
    source: SourceLocation | None = None
    corrections: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "id": self.id,
            "timestamp": self.timestamp,
            "action": self.action,
            "detail": self.detail,
        }
        if self.source:
            d["source"] = str(self.source)
        if self.corrections:
            d["corrections"] = copy.deepcopy(self.corrections)
        return d
