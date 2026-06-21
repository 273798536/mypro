from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import uuid


def _now_ts() -> str:
    return datetime.now().isoformat()


def _new_id() -> str:
    return uuid.uuid4().hex[:16]


@dataclass
class EvidenceSnapshot:
    timestamp: str = field(default_factory=_now_ts)
    failure_reason: str = ""
    page_summary: str = ""
    params: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, Any] = field(default_factory=dict)
    samples: List[Any] = field(default_factory=list)
    thresholds: Dict[str, Any] = field(default_factory=dict)
    manual_corrections: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FailureQueueRecord:
    run_id: str
    status: str = "pending"
    note: str = ""
    created_at: str = field(default_factory=_now_ts)
    updated_at: str = field(default_factory=_now_ts)
    evidence: EvidenceSnapshot = field(default_factory=EvidenceSnapshot)
    rerun_count: int = 0
    history: List[Dict[str, Any]] = field(default_factory=list)
    suspended: bool = False
    suspend_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["evidence"] = self.evidence.to_dict()
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FailureQueueRecord":
        ev_data = data.pop("evidence", {})
        evidence = EvidenceSnapshot(**ev_data)
        return cls(evidence=evidence, **data)


@dataclass
class AuditLogEntry:
    id: str = field(default_factory=_new_id)
    run_id: str = ""
    action: str = ""
    actor: str = "system"
    timestamp: str = field(default_factory=_now_ts)
    before: Optional[Dict[str, Any]] = None
    after: Optional[Dict[str, Any]] = None
    comment: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class VersionDiff:
    run_id: str
    base_version: str
    current_version: str
    sample_diff: Dict[str, Any] = field(default_factory=dict)
    threshold_diff: Dict[str, Any] = field(default_factory=dict)
    manual_correction_diff: Dict[str, Any] = field(default_factory=dict)
    metric_diff: Dict[str, Any] = field(default_factory=dict)
    generated_at: str = field(default_factory=_now_ts)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
