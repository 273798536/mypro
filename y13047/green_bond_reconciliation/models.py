from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ReconciliationStatus(str, Enum):
    CONFIRMED = "已确认"
    PENDING_DOCUMENT = "待补件"
    REJECTED = "退回"
    UNMATCHED = "未匹配"


class ChangeType(str, Enum):
    AUTO_DETECTED = "自动识别"
    MANUAL_CONFIRMED = "人工确认"
    MANUAL_RECONSIDERED = "人工改判"
    DOCUMENT_ARRIVED_LATE = "凭证晚到"
    FIELD_MAPPED = "字段映射"


@dataclass
class ChangeHistory:
    timestamp: str
    change_type: ChangeType
    old_status: Optional[ReconciliationStatus]
    new_status: ReconciliationStatus
    operator: str
    remark: str
    old_values: Dict[str, Any] = field(default_factory=dict)
    new_values: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ReconciliationRecord:
    record_id: str
    source_file: str
    source_row: int
    bond_code: str
    bond_name: str
    raise_amount: float
    used_amount: float
    tax_amount: Optional[float] = None
    exchange_rate: Optional[float] = None
    currency: str = "CNY"
    source: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)
    status: ReconciliationStatus = ReconciliationStatus.UNMATCHED
    supplement: str = ""
    impact_scope: str = ""
    late_document: bool = False
    field_mappings: Dict[str, str] = field(default_factory=dict)
    failed_reason: str = ""
    history: List[ChangeHistory] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["status"] = self.status.value
        for idx, h in enumerate(self.history):
            data["history"][idx]["change_type"] = h.change_type.value
            if h.old_status:
                data["history"][idx]["old_status"] = h.old_status.value
            data["history"][idx]["new_status"] = h.new_status.value
        return data

    def add_history(self, change: ChangeHistory):
        self.history.append(change)
        self.updated_at = datetime.now().isoformat()
