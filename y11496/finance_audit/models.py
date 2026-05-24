from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid


class RecordStatus(str, Enum):
    PENDING = "pending"
    IMPORTED = "imported"
    CHECKED = "checked"
    FLAGGED = "flagged"
    FIXED = "fixed"
    APPROVED = "approved"
    REJECTED = "rejected"
    FROZEN = "frozen"
    EXPORTED = "exported"
    WITHDRAWN = "withdrawn"
    PARTIAL_FAILURE = "partial_failure"


class SourceType(str, Enum):
    INVOICE_PDF = "invoice_pdf"
    TRAVEL_REQUEST = "travel_request"
    PAYMENT_FLOW = "payment_flow"
    SUPERVISOR_NOTE = "supervisor_note"


class IssueType(str, Enum):
    DUPLICATE_ACCOMMODATION = "duplicate_accommodation"
    DUPLICATE_TRANSPORTATION = "duplicate_transportation"
    DUPLICATE_SUBMISSION = "duplicate_submission"
    AMOUNT_MISMATCH = "amount_mismatch"
    MISSING_EVIDENCE = "missing_evidence"
    DATE_MISMATCH = "date_mismatch"
    WITHDRAWN_RESUBMITTED = "withdrawn_resubmitted"
    MANUAL_OVERRIDE = "manual_override"
    PARTIAL_FAILURE = "partial_failure"


@dataclass
class SourceEvidence:
    source_type: SourceType
    source_file: str
    original_line: int
    raw_value: str
    parsed_value: Dict[str, Any]
    import_timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type.value if isinstance(self.source_type, SourceType) else self.source_type,
            "source_file": self.source_file,
            "original_line": self.original_line,
            "raw_value": self.raw_value,
            "parsed_value": self.parsed_value,
            "import_timestamp": self.import_timestamp
        }


@dataclass
class AuditLogEntry:
    action: str
    previous_status: Optional[str]
    new_status: str
    operator: str
    timestamp: str
    comment: Optional[str] = None
    changes: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action": self.action,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "operator": self.operator,
            "timestamp": self.timestamp,
            "comment": self.comment,
            "changes": self.changes
        }


@dataclass
class Issue:
    issue_type: IssueType
    description: str
    severity: str
    related_records: List[str]
    evidence: Optional[Dict[str, Any]] = None
    resolved: bool = False
    resolution: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "issue_type": self.issue_type.value if isinstance(self.issue_type, IssueType) else self.issue_type,
            "description": self.description,
            "severity": self.severity,
            "related_records": self.related_records,
            "evidence": self.evidence,
            "resolved": self.resolved,
            "resolution": self.resolution
        }


@dataclass
class ReimbursementRecord:
    record_id: str
    employee_id: str
    employee_name: str
    expense_type: str
    amount: float
    currency: str
    expense_date: str
    status: RecordStatus
    evidences: Dict[SourceType, SourceEvidence] = field(default_factory=dict)
    issues: List[Issue] = field(default_factory=list)
    audit_log: List[AuditLogEntry] = field(default_factory=list)
    is_frozen: bool = False
    freeze_reason: Optional[str] = None
    shared_trip_id: Optional[str] = None
    parent_record_id: Optional[str] = None
    resubmission_count: int = 0
    manual_override: bool = False
    override_reason: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "employee_id": self.employee_id,
            "employee_name": self.employee_name,
            "expense_type": self.expense_type,
            "amount": self.amount,
            "currency": self.currency,
            "expense_date": self.expense_date,
            "status": self.status.value if isinstance(self.status, RecordStatus) else self.status,
            "evidences": {k.value if isinstance(k, SourceType) else k: v.to_dict() for k, v in self.evidences.items()},
            "issues": [i.to_dict() for i in self.issues],
            "audit_log": [a.to_dict() for a in self.audit_log],
            "is_frozen": self.is_frozen,
            "freeze_reason": self.freeze_reason,
            "shared_trip_id": self.shared_trip_id,
            "parent_record_id": self.parent_record_id,
            "resubmission_count": self.resubmission_count,
            "manual_override": self.manual_override,
            "override_reason": self.override_reason,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "metadata": self.metadata
        }

    def add_evidence(self, evidence: SourceEvidence) -> None:
        self.evidences[evidence.source_type] = evidence
        self.updated_at = datetime.now().isoformat()

    def add_issue(self, issue: Issue) -> None:
        self.issues.append(issue)
        self.updated_at = datetime.now().isoformat()

    def add_audit_log(self, entry: AuditLogEntry) -> None:
        self.audit_log.append(entry)
        self.updated_at = datetime.now().isoformat()

    def update_status(self, new_status: RecordStatus, operator: str, comment: Optional[str] = None, changes: Optional[Dict[str, Any]] = None) -> None:
        previous_status = self.status.value if isinstance(self.status, RecordStatus) else self.status
        self.status = new_status
        log_entry = AuditLogEntry(
            action="status_change",
            previous_status=previous_status,
            new_status=new_status.value,
            operator=operator,
            timestamp=datetime.now().isoformat(),
            comment=comment,
            changes=changes
        )
        self.add_audit_log(log_entry)

    def freeze(self, reason: str, operator: str) -> None:
        if not self.is_frozen:
            self.is_frozen = True
            self.freeze_reason = reason
            log_entry = AuditLogEntry(
                action="freeze",
                previous_status=self.status.value,
                new_status=RecordStatus.FROZEN.value,
                operator=operator,
                timestamp=datetime.now().isoformat(),
                comment=reason
            )
            self.add_audit_log(log_entry)

    def unfreeze(self, operator: str) -> None:
        if self.is_frozen:
            self.is_frozen = False
            previous_freeze_reason = self.freeze_reason
            self.freeze_reason = None
            log_entry = AuditLogEntry(
                action="unfreeze",
                previous_status=RecordStatus.FROZEN.value,
                new_status=self.status.value,
                operator=operator,
                timestamp=datetime.now().isoformat(),
                comment=f"Unfrozen. Previous reason: {previous_freeze_reason}"
            )
            self.add_audit_log(log_entry)

    def apply_manual_override(self, reason: str, operator: str, new_status: Optional[RecordStatus] = None) -> None:
        self.manual_override = True
        self.override_reason = reason
        if new_status:
            self.update_status(new_status, operator, f"Manual override: {reason}")


def generate_record_id() -> str:
    return f"REC-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"


def generate_shared_trip_id() -> str:
    return f"TRIP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
