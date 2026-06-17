from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import json
import uuid


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


@dataclass
class ResidentFeedback:
    feedback_id: str = field(default_factory=_new_id)
    school_name: str = ""
    point_description: str = ""
    peak_type: str = ""
    contact: str = ""
    raw_text: str = ""
    submitted_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    source: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PointAlias:
    alias_id: str = field(default_factory=_new_id)
    alias_text: str = ""
    source_feedback_id: Optional[str] = None
    note: str = ""


@dataclass
class MergedPoint:
    point_id: str = field(default_factory=_new_id)
    canonical_name: str = ""
    school_name: str = ""
    aliases: List[PointAlias] = field(default_factory=list)
    location_hint: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    peak_morning_count: int = 0
    peak_evening_count: int = 0
    feedback_refs: List[str] = field(default_factory=list)
    is_manual_confirmed: bool = False
    merge_evidence: List[dict] = field(default_factory=list)
    anomaly_flags: List[str] = field(default_factory=list)
    next_steps: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["aliases"] = [a.__dict__ for a in self.aliases]
        return d


@dataclass
class MergeRule:
    rule_id: str = field(default_factory=_new_id)
    rule_name: str = ""
    description: str = ""
    peak_scope: str = "both"
    threshold: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))


@dataclass
class HistoryRecord:
    record_id: str = field(default_factory=_new_id)
    point_id: str = ""
    action: str = ""
    before: Optional[dict] = None
    after: Optional[dict] = None
    operator: str = ""
    reason: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class MergeSession:
    session_id: str = field(default_factory=_new_id)
    rules: List[MergeRule] = field(default_factory=list)
    feedbacks: List[ResidentFeedback] = field(default_factory=list)
    merged_points: List[MergedPoint] = field(default_factory=list)
    history: List[HistoryRecord] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    version: str = "gray-preview-1"

    def save(self, path: str) -> None:
        payload = {
            "session_id": self.session_id,
            "version": self.version,
            "created_at": self.created_at,
            "rules": [asdict(r) for r in self.rules],
            "feedbacks": [f.to_dict() for f in self.feedbacks],
            "merged_points": [p.to_dict() for p in self.merged_points],
            "history": [h.to_dict() for h in self.history],
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path: str) -> "MergeSession":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        session = cls(
            session_id=data.get("session_id", _new_id()),
            version=data.get("version", "gray-preview-1"),
            created_at=data.get("created_at", datetime.now().isoformat(timespec="seconds")),
        )
        for r in data.get("rules", []):
            session.rules.append(MergeRule(**r))
        for fb in data.get("feedbacks", []):
            session.feedbacks.append(ResidentFeedback(**fb))
        for mp in data.get("merged_points", []):
            aliases_data = mp.pop("aliases", [])
            point = MergedPoint(**mp)
            point.aliases = [PointAlias(**a) for a in aliases_data]
            session.merged_points.append(point)
        for h in data.get("history", []):
            session.history.append(HistoryRecord(**h))
        return session
