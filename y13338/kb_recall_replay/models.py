from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class RecordStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    NEEDS_EVIDENCE = "needs_evidence"


class EvaluationResult(str, Enum):
    CONFIRMED = "confirmed"
    FALSE_POSITIVE = "false_positive"
    FALSE_NEGATIVE = "false_negative"
    INCONCLUSIVE = "inconclusive"


@dataclass
class VersionEntry:
    timestamp: str
    notes: str = ""
    screenshots: list[str] = field(default_factory=list)
    values: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "notes": self.notes,
            "screenshots": self.screenshots,
            "values": self.values,
        }

    @classmethod
    def from_dict(cls, d: dict) -> VersionEntry:
        return cls(
            timestamp=d["timestamp"],
            notes=d.get("notes", ""),
            screenshots=d.get("screenshots", []),
            values=d.get("values", {}),
        )


@dataclass
class Evaluation:
    id: str
    evaluator: str
    timestamp: str
    result: EvaluationResult
    is_duplicate: bool = False
    duplicate_of: str | None = None
    impact_scope: str = ""
    source_line: str = ""
    score: float | None = None
    evidence_ref: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "evaluator": self.evaluator,
            "timestamp": self.timestamp,
            "result": self.result.value,
            "is_duplicate": self.is_duplicate,
            "duplicate_of": self.duplicate_of,
            "impact_scope": self.impact_scope,
            "source_line": self.source_line,
            "score": self.score,
            "evidence_ref": self.evidence_ref,
        }

    @classmethod
    def from_dict(cls, d: dict) -> Evaluation:
        return cls(
            id=d["id"],
            evaluator=d["evaluator"],
            timestamp=d["timestamp"],
            result=EvaluationResult(d["result"]),
            is_duplicate=d.get("is_duplicate", False),
            duplicate_of=d.get("duplicate_of"),
            impact_scope=d.get("impact_scope", ""),
            source_line=d.get("source_line", ""),
            score=d.get("score"),
            evidence_ref=d.get("evidence_ref", ""),
        )


@dataclass
class GrayResult:
    timestamp: str
    sample_changes: list[dict[str, Any]] = field(default_factory=list)
    threshold_changes: list[dict[str, Any]] = field(default_factory=list)
    human_corrections: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "sample_changes": self.sample_changes,
            "threshold_changes": self.threshold_changes,
            "human_corrections": self.human_corrections,
        }

    @classmethod
    def from_dict(cls, d: dict) -> GrayResult:
        return cls(
            timestamp=d["timestamp"],
            sample_changes=d.get("sample_changes", []),
            threshold_changes=d.get("threshold_changes", []),
            human_corrections=d.get("human_corrections", []),
        )


@dataclass
class MisjudgmentRecord:
    id: str
    name: str
    evidence_path: str = ""
    status: RecordStatus = RecordStatus.PENDING
    versions: list[VersionEntry] = field(default_factory=list)
    evaluations: list[Evaluation] = field(default_factory=list)
    gray_results: list[GrayResult] = field(default_factory=list)
    aliases: list[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "evidence_path": self.evidence_path,
            "status": self.status.value,
            "versions": [v.to_dict() for v in self.versions],
            "evaluations": [e.to_dict() for e in self.evaluations],
            "gray_results": [g.to_dict() for g in self.gray_results],
            "aliases": self.aliases,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> MisjudgmentRecord:
        return cls(
            id=d["id"],
            name=d["name"],
            evidence_path=d.get("evidence_path", ""),
            status=RecordStatus(d.get("status", "pending")),
            versions=[VersionEntry.from_dict(v) for v in d.get("versions", [])],
            evaluations=[Evaluation.from_dict(e) for e in d.get("evaluations", [])],
            gray_results=[GrayResult.from_dict(g) for g in d.get("gray_results", [])],
            aliases=d.get("aliases", []),
            created_at=d.get("created_at", ""),
            updated_at=d.get("updated_at", ""),
        )

    @classmethod
    def create(cls, name: str, evidence_path: str = "", aliases: list[str] | None = None) -> MisjudgmentRecord:
        now = datetime.now().isoformat()
        return cls(
            id=uuid.uuid4().hex[:12],
            name=name,
            evidence_path=evidence_path,
            status=RecordStatus.PENDING,
            aliases=aliases or [],
            created_at=now,
            updated_at=now,
        )
