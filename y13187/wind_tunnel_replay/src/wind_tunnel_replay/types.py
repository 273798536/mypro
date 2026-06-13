from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class LogKind(str, Enum):
    NEW = "new"
    OLD = "old"
    WITHDRAW = "withdraw"
    REMARK = "remark"
    DATA = "data"
    UNKNOWN = "unknown"


@dataclass
class LogEntry:
    line_no: int
    raw: str
    kind: LogKind
    timestamp: datetime | None = None
    version: str | None = None
    params: dict[str, float] = field(default_factory=dict)
    message: str = ""
    objects: list[str] = field(default_factory=list)
    withdraw_target_line: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "line_no": self.line_no,
            "kind": self.kind.value,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "version": self.version,
            "params": dict(self.params),
            "message": self.message,
            "objects": list(self.objects),
            "withdraw_target_line": self.withdraw_target_line,
            "raw": self.raw,
        }


@dataclass
class ReplayParam:
    name: str
    values: list[float] = field(default_factory=list)
    timestamps: list[datetime] = field(default_factory=list)
    source_lines: list[int] = field(default_factory=list)
    versions: list[str] = field(default_factory=list)
    final_value: float | None = None
    baseline_value: float | None = None


@dataclass
class AnomalyRecord:
    level: str
    category: str
    param_name: str | None
    message: str
    evidence: dict[str, Any] = field(default_factory=dict)
    source_line: int | None = None
    impact: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "level": self.level,
            "category": self.category,
            "param_name": self.param_name,
            "message": self.message,
            "evidence": self.evidence,
            "source_line": self.source_line,
            "impact": self.impact,
        }


@dataclass
class ReplayResult:
    run_id: str
    generated_at: datetime
    param_versions: dict[str, ReplayParam] = field(default_factory=dict)
    anomalies: list[AnomalyRecord] = field(default_factory=list)
    effective_logs: list[LogEntry] = field(default_factory=list)
    excluded_logs: list[LogEntry] = field(default_factory=list)
    withdrawn_lines: set[int] = field(default_factory=set)
    conclusion: str = ""
    meta: dict[str, Any] = field(default_factory=dict)
