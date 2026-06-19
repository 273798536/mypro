from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class WorkOrderStatus(str, Enum):
    NEW = "new"
    DUPLICATE = "duplicate"
    CHANGED = "changed"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class ConfirmationAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    DEFER = "defer"


class DedupVerdict(str, Enum):
    UNIQUE = "unique"
    DUPLICATE = "duplicate"
    UNCERTAIN = "uncertain"


@dataclass
class DataDictEntry:
    field_name: str
    field_type: str
    is_unique_key: bool = False
    description: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> DataDictEntry:
        return cls(**d)


@dataclass
class IndexSuggestion:
    suggested_key_fields: list[str]
    confidence: float
    reason: str
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> IndexSuggestion:
        return cls(**d)


@dataclass
class AuditEntry:
    work_order_fingerprint: str
    operator: str
    action: str
    reason: str
    old_verdict: str
    new_verdict: str
    old_values: dict[str, Any] = field(default_factory=dict)
    new_values: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> AuditEntry:
        return cls(**d)


@dataclass
class WorkOrder:
    raw_data: dict[str, str]
    fingerprint: str = ""
    status: WorkOrderStatus = WorkOrderStatus.NEW
    verdict: DedupVerdict = DedupVerdict.UNIQUE
    import_batch: str = ""
    first_seen_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_seen_at: str = field(default_factory=lambda: datetime.now().isoformat())
    seen_count: int = 1
    previous_verdict: str = ""
    index_key_used: str = ""
    new_values: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["status"] = self.status.value
        d["verdict"] = self.verdict.value
        return d

    @classmethod
    def from_dict(cls, d: dict) -> WorkOrder:
        d = dict(d)
        d["status"] = WorkOrderStatus(d["status"])
        d["verdict"] = DedupVerdict(d["verdict"])
        return cls(**d)


@dataclass
class ConfirmationRecord:
    work_order_fingerprint: str
    action: ConfirmationAction
    operator: str
    reason: str
    old_verdict: str
    new_verdict: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        d = asdict(self)
        d["action"] = self.action.value
        return d

    @classmethod
    def from_dict(cls, d: dict) -> ConfirmationRecord:
        d = dict(d)
        d["action"] = ConfirmationAction(d["action"])
        return cls(**d)


@dataclass
class ImportSession:
    batch_id: str
    input_files: list[str]
    data_dict_file: str = ""
    index_suggestion: IndexSuggestion | None = None
    previous_index_suggestion: IndexSuggestion | None = None
    total_rows: int = 0
    new_count: int = 0
    duplicate_count: int = 0
    changed_count: int = 0
    uncertain_count: int = 0
    confirmed_count: int = 0
    started_at: str = field(default_factory=lambda: datetime.now().isoformat())
    finished_at: str = ""
    is_supplement: bool = False

    def to_dict(self) -> dict:
        d = asdict(self)
        if self.index_suggestion is not None:
            d["index_suggestion"] = self.index_suggestion.to_dict()
        if self.previous_index_suggestion is not None:
            d["previous_index_suggestion"] = self.previous_index_suggestion.to_dict()
        return d

    @classmethod
    def from_dict(cls, d: dict) -> ImportSession:
        d = dict(d)
        if d.get("index_suggestion") and isinstance(d["index_suggestion"], dict):
            d["index_suggestion"] = IndexSuggestion.from_dict(d["index_suggestion"])
        if d.get("previous_index_suggestion") and isinstance(d["previous_index_suggestion"], dict):
            d["previous_index_suggestion"] = IndexSuggestion.from_dict(d["previous_index_suggestion"])
        return cls(**d)


def save_json(obj: Any, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
