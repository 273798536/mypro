from dataclasses import dataclass, field, asdict
from typing import Optional, Any
from enum import Enum
import datetime
import uuid


class UnitStatus(Enum):
    OK = "ok"
    MISSING = "missing"
    MISMATCH = "mismatch"


class ProcessStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    UNIT_BLOCKED = "unit_blocked"


@dataclass
class UnitTrace:
    status: UnitStatus
    original_field: str
    original_value: Any
    expected_unit: Optional[str] = None
    actual_unit: Optional[str] = None
    detail: str = ""


@dataclass
class QuestionItem:
    question_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    formula: str = ""
    expected_value: Optional[float] = None
    unit: Optional[str] = None
    source_fields: dict = field(default_factory=dict)
    source_description: str = ""
    process_status: ProcessStatus = ProcessStatus.PENDING
    unit_trace: Optional[UnitTrace] = None
    imported_at: str = field(default_factory=lambda: datetime.datetime.now().isoformat())


@dataclass
class MCResult:
    question_id: str = ""
    mc_mean: float = 0.0
    mc_std: float = 0.0
    mc_error: float = 0.0
    relative_error: float = 0.0
    sample_count: int = 0
    seed: int = 0
    anomalies: list = field(default_factory=list)
    unit_trace: Optional[UnitTrace] = None


@dataclass
class HistoryEntry:
    entry_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    timestamp: str = field(default_factory=lambda: datetime.datetime.now().isoformat())
    question_id: str = ""
    change_type: str = ""
    before: dict = field(default_factory=dict)
    after: dict = field(default_factory=dict)
    confirmed_by: Optional[str] = None
    explanation: str = ""


@dataclass
class BatchReport:
    report_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    timestamp: str = field(default_factory=lambda: datetime.datetime.now().isoformat())
    param_version: str = "1.0.0"
    mc_sample_count: int = 10000
    mc_seed: int = 42
    total_questions: int = 0
    passed: int = 0
    failed: int = 0
    unit_blocked: int = 0
    results: list = field(default_factory=list)
    anomalies: list = field(default_factory=list)
    unit_missing_details: list = field(default_factory=list)
