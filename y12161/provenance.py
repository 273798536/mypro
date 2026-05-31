from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class SourceType(Enum):
    SPECTRAL_DATA = "spectral_data"
    COMPOSITION_LIBRARY = "composition_library"
    RECOGNITION_REPORT = "recognition_report"


@dataclass
class ProvenanceEntry:
    source_type: SourceType
    source_id: str
    step: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    detail: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_type": self.source_type.value,
            "source_id": self.source_id,
            "step": self.step,
            "timestamp": self.timestamp,
            "detail": self.detail,
        }


@dataclass
class ProvenanceChain:
    record_id: str
    entries: list[ProvenanceEntry] = field(default_factory=list)

    def add(
        self,
        source_type: SourceType,
        source_id: str,
        step: str,
        detail: dict[str, Any] | None = None,
    ) -> ProvenanceEntry:
        entry = ProvenanceEntry(
            source_type=source_type,
            source_id=source_id,
            step=step,
            detail=detail or {},
        )
        self.entries.append(entry)
        return entry

    def to_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "entries": [e.to_dict() for e in self.entries],
        }

    def find_by_source_type(self, source_type: SourceType) -> list[ProvenanceEntry]:
        return [e for e in self.entries if e.source_type == source_type]

    def summary(self) -> str:
        lines = [f"溯源链 — 记录 {self.record_id}"]
        for i, e in enumerate(self.entries, 1):
            lines.append(
                f"  [{i}] {e.source_type.value}/{e.source_id} | {e.step} @ {e.timestamp}"
            )
            if e.detail:
                for k, v in e.detail.items():
                    lines.append(f"       {k}: {v}")
        return "\n".join(lines)
