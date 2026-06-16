from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class SampleStatus(str, Enum):
    PASS = "通过"
    PENDING = "待确认"
    FAIL = "不通过"


class CheckType(str, Enum):
    MISSING_IMAGE = "缺图检查"
    DATASET_BIAS = "评测集偏科检查"
    BAD_DATA = "坏数据检查"


@dataclass
class MultimodalSample:
    sample_id: str
    text_content: str
    image_paths: List[str]
    category: str
    source: str
    created_at: str
    manual_note: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def has_image(self) -> bool:
        return len(self.image_paths) > 0 and all(
            p and p.strip() for p in self.image_paths
        )

    def is_valid(self) -> bool:
        if not self.sample_id or not self.text_content:
            return False
        if not self.category or not self.source:
            return False
        return True


@dataclass
class CheckIssue:
    check_type: CheckType
    severity: str
    message: str
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CheckResult:
    sample_id: str
    status: SampleStatus
    issues: List[CheckIssue] = field(default_factory=list)
    checked_at: str = field(default_factory=lambda: datetime.now().isoformat())
    manual_note: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sample_id": self.sample_id,
            "status": self.status.value,
            "issues": [
                {
                    "check_type": issue.check_type.value,
                    "severity": issue.severity,
                    "message": issue.message,
                    "details": issue.details,
                }
                for issue in self.issues
            ],
            "checked_at": self.checked_at,
            "manual_note": self.manual_note,
        }


@dataclass
class VersionRecord:
    version_id: str
    parent_version_id: Optional[str]
    timestamp: str
    sample_ids: List[str]
    check_results: Dict[str, CheckResult]
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version_id": self.version_id,
            "parent_version_id": self.parent_version_id,
            "timestamp": self.timestamp,
            "sample_ids": self.sample_ids,
            "check_results": {
                sid: res.to_dict() for sid, res in self.check_results.items()
            },
            "description": self.description,
        }


@dataclass
class CheckReport:
    report_id: str
    generated_at: str
    version_id: str
    summary: Dict[str, Any]
    details: List[Dict[str, Any]]
    plain_language_explanation: str
    data_signature: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "report_id": self.report_id,
            "generated_at": self.generated_at,
            "version_id": self.version_id,
            "summary": self.summary,
            "details": self.details,
            "plain_language_explanation": self.plain_language_explanation,
            "data_signature": self.data_signature,
        }
