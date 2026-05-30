from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class BehaviorRecord:
    user_id: str
    item_id: str
    action: str
    timestamp: str
    duration: Optional[float] = None


@dataclass
class ExposureRecord:
    user_id: str
    item_id: str
    position: int
    timestamp: str
    clicked: bool = False


@dataclass
class SimilarityResult:
    item_a: str
    item_b: str
    method: str
    score: float
    is_cold_start: bool
    status: str = "confirmed"
    data_version: int = 1
    computed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    correction_id: Optional[str] = None


@dataclass
class CorrectionRecord:
    correction_id: str
    timestamp: str
    field: str
    old_value: str
    new_value: str
    reason: str
    operator: str
    affected_result_keys: list = field(default_factory=list)


@dataclass
class DiagnosisResult:
    diag_type: str
    severity: str
    details: str
    next_step: str
    next_contact: str
    item_ids: list = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ColdStartRecord:
    item_id: str
    reason: str
    status: str = "pending"
    assigned_to: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
