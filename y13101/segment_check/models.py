from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class RecordStatus(str, Enum):
    VALID = "valid"
    BAD = "bad"
    SKIPPED = "skipped"
    PENDING = "pending"
    SUSPENDED = "suspended"


class ValidationStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    SUSPENDED = "suspended"
    PENDING = "pending"


class ChangeType(str, Enum):
    IMPORT = "import"
    REVALIDATE = "revalidate"
    MANUAL_OVERRIDE = "manual_override"
    SUSPEND = "suspend"
    RESUME = "resume"


@dataclass
class MaterialRecord:
    record_id: str
    material_name: str
    raw_data: Dict[str, Any]
    source_file: str
    source_line: int
    parsed_data: Optional[Dict[str, Any]] = None
    status: RecordStatus = RecordStatus.PENDING
    error_message: Optional[str] = None
    import_time: datetime = field(default_factory=datetime.now)


@dataclass
class ValidationResult:
    record_id: str
    material_name: str
    status: ValidationStatus
    segment_metrics: Dict[str, Any] = field(default_factory=dict)
    boundary_checks: Dict[str, bool] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    suspension_reason: Optional[str] = None
    validation_time: datetime = field(default_factory=datetime.now)


@dataclass
class ValidationStats:
    total: int = 0
    processed: int = 0
    bad_rows: int = 0
    skipped_rows: int = 0
    passed: int = 0
    failed: int = 0
    warnings: int = 0
    suspended: int = 0
    pending: int = 0

    def to_dict(self) -> Dict[str, int]:
        return {
            "总数": self.total,
            "已处理": self.processed,
            "坏行": self.bad_rows,
            "跳过行": self.skipped_rows,
            "通过": self.passed,
            "失败": self.failed,
            "警告": self.warnings,
            "挂起": self.suspended,
            "待处理": self.pending,
        }


@dataclass
class HistoryEntry:
    entry_id: str
    record_id: str
    material_name: str
    change_type: ChangeType
    previous_status: Optional[ValidationStatus] = None
    new_status: Optional[ValidationStatus] = None
    operator: str = "system"
    comment: Optional[str] = None
    previous_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    timestamp: datetime = field(default_factory=datetime.now)
