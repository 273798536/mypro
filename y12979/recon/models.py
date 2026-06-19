from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional


class ReconStatus(Enum):
    MATCHED = "matched"
    PENDING = "pending"
    ANOMALY = "anomaly"
    BLOCKED_DUPLICATE_MIGRATION = "blocked_duplicate_migration"


class RollbackStatus(Enum):
    OPEN = "open"
    SUPPLEMENTED = "supplemented"
    RESOLVED = "resolved"


class PermAuditAction(Enum):
    GRANT = "grant"
    REVOKE = "revoke"
    REVIEW = "review"


@dataclass
class Transaction:
    transaction_id: str
    work_order_id: str
    amount: float
    transaction_date: str
    account_from: str
    account_to: str
    status: str
    migration_batch: str
    raw_line: Optional[dict] = None


@dataclass
class WorkOrder:
    work_order_id: str
    order_type: str
    expected_amount: float
    created_date: str
    status: str
    raw_line: Optional[dict] = None


@dataclass
class ReconResult:
    transaction: Transaction
    work_order: Optional[WorkOrder]
    status: ReconStatus
    reason: str = ""
    detail: str = ""

    @property
    def display_label(self) -> str:
        labels = {
            ReconStatus.MATCHED: "顺利对账",
            ReconStatus.PENDING: "待确认",
            ReconStatus.ANOMALY: "异常数据",
            ReconStatus.BLOCKED_DUPLICATE_MIGRATION: "拦截-迁移重复执行",
        }
        return labels.get(self.status, self.status.value)

    @property
    def display_detail(self) -> str:
        if self.detail:
            return self.detail
        reasons = {
            ReconStatus.MATCHED: "流水金额与工单预期金额一致，状态正常，对账通过。",
            ReconStatus.PENDING: "流水记录与工单存在差异，需人工确认具体原因。可能为：金额轻微偏差、日期不匹配、或工单状态未终结。",
            ReconStatus.ANOMALY: "数据存在明显错误：金额严重偏离、字段缺失、或格式异常，需立即排查数据源。",
            ReconStatus.BLOCKED_DUPLICATE_MIGRATION: (
                "该流水对应的迁移批次已被执行过，系统拦截重复执行，"
                "防止账务数据被重复写入。回滚记录已生成，可追加补充说明。"
            ),
        }
        return reasons.get(self.status, "")


@dataclass
class RollbackRecord:
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    session_id: str = ""
    transaction_id: str = ""
    work_order_id: str = ""
    reason: str = ""
    action: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    status: RollbackStatus = RollbackStatus.OPEN
    supplement_notes: List[str] = field(default_factory=list)

    def add_note(self, note: str) -> None:
        entry = f"[{datetime.now().isoformat()}] {note}"
        self.supplement_notes.append(entry)
        if self.status == RollbackStatus.OPEN:
            self.status = RollbackStatus.SUPPLEMENTED

    def resolve(self) -> None:
        self.status = RollbackStatus.RESOLVED


@dataclass
class DataDictEntry:
    field_name: str
    field_type: str = "string"
    description: str = ""
    source: str = ""
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat())
    is_new: bool = False


@dataclass
class PermAuditEntry:
    audit_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    data_dict_field: str = ""
    change_type: str = ""
    permission_impact: str = ""
    action: PermAuditAction = PermAuditAction.REVIEW
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    status: str = "pending"


@dataclass
class ReconSession:
    session_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    input_dir: str = ""
    output_dir: str = ""
    started_at: str = field(default_factory=lambda: datetime.now().isoformat())
    finished_at: Optional[str] = None
    results: List[ReconResult] = field(default_factory=list)
    rollbacks: List[RollbackRecord] = field(default_factory=list)
    data_dict_changes: List[DataDictEntry] = field(default_factory=list)
    perm_audits: List[PermAuditEntry] = field(default_factory=list)
    input_fingerprint: str = ""
