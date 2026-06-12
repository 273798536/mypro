from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Dict, Optional, Any
import json
import uuid


RECORD_STATUS_RAW = "raw"
RECORD_STATUS_CLEAN = "clean"
RECORD_STATUS_SORT_UNSTABLE = "sort_unstable"
RECORD_STATUS_PROCESSED = "processed"
RECORD_STATUS_EVIDENCE_NEEDED = "evidence_needed"

BATCH_RUNNING = "running"
BATCH_COMPLETED = "completed"
BATCH_PARTIAL = "partial"


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


@dataclass
class TimelineEvent:
    ts: str
    event: str
    detail: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CalcStep:
    name: str
    value_before: Optional[Any] = None
    value_after: Optional[Any] = None
    unit_before: Optional[str] = None
    unit_after: Optional[str] = None
    note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StudentRecord:
    record_id: str
    raw_source: str
    raw_payload: Dict[str, Any]
    cleaned_payload: Optional[Dict[str, Any]] = None
    status: str = RECORD_STATUS_RAW
    sort_key: Optional[str] = None
    sort_unstable_reason: Optional[str] = None
    calc_steps: List[CalcStep] = field(default_factory=list)
    result: Optional[Dict[str, Any]] = None
    issues: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["calc_steps"] = [s.to_dict() if isinstance(s, CalcStep) else s for s in self.calc_steps]
        return d

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "StudentRecord":
        steps = [CalcStep(**s) for s in d.get("calc_steps", [])]
        return StudentRecord(
            record_id=d["record_id"],
            raw_source=d["raw_source"],
            raw_payload=d["raw_payload"],
            cleaned_payload=d.get("cleaned_payload"),
            status=d.get("status", RECORD_STATUS_RAW),
            sort_key=d.get("sort_key"),
            sort_unstable_reason=d.get("sort_unstable_reason"),
            calc_steps=steps,
            result=d.get("result"),
            issues=list(d.get("issues", [])),
            created_at=d.get("created_at", _now_iso()),
            updated_at=d.get("updated_at", _now_iso()),
        )


@dataclass
class BatchState:
    batch_id: str
    status: str = BATCH_RUNNING
    param_set_a: Dict[str, Any] = field(default_factory=dict)
    param_set_b: Dict[str, Any] = field(default_factory=dict)
    records: Dict[str, StudentRecord] = field(default_factory=dict)
    timeline: List[TimelineEvent] = field(default_factory=list)
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)

    def touch(self) -> None:
        self.updated_at = _now_iso()

    def add_event(self, event: str, detail: str = "") -> None:
        self.timeline.append(TimelineEvent(ts=_now_iso(), event=event, detail=detail))
        self.touch()

    def counts(self) -> Dict[str, int]:
        c = {"total": len(self.records), "processed": 0, "evidence_needed": 0,
             "sort_unstable": 0, "raw": 0, "clean": 0}
        for r in self.records.values():
            if r.status in c:
                c[r.status] += 1
            if r.status == RECORD_STATUS_PROCESSED:
                c["processed"] += 1
            elif r.status == RECORD_STATUS_EVIDENCE_NEEDED:
                c["evidence_needed"] += 1
        return c

    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "status": self.status,
            "param_set_a": self.param_set_a,
            "param_set_b": self.param_set_b,
            "records": {k: v.to_dict() for k, v in self.records.items()},
            "timeline": [e.to_dict() for e in self.timeline],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "BatchState":
        records = {k: StudentRecord.from_dict(v) for k, v in d.get("records", {}).items()}
        timeline = [TimelineEvent(**e) for e in d.get("timeline", [])]
        return BatchState(
            batch_id=d["batch_id"],
            status=d.get("status", BATCH_RUNNING),
            param_set_a=d.get("param_set_a", {}),
            param_set_b=d.get("param_set_b", {}),
            records=records,
            timeline=timeline,
            created_at=d.get("created_at", _now_iso()),
            updated_at=d.get("updated_at", _now_iso()),
        )


def new_batch_id() -> str:
    return "batch-" + uuid.uuid4().hex[:8]


def new_record_id() -> str:
    return "rec-" + uuid.uuid4().hex[:10]
