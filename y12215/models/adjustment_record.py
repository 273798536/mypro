from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from enum import Enum


class AdjustmentType(Enum):
    UPGRADE = "upgrade"
    REFUND = "refund"
    MANUAL = "manual"
    DUPLICATE_ENTRY = "duplicate_entry"


@dataclass
class AdjustmentRecord:
    adjustment_id: str
    account_id: str
    adjustment_type: AdjustmentType
    adjustment_date: date
    amount: Decimal
    affected_revenue_detail_ids: list
    source_record_id: Optional[str] = None
    source_record_type: Optional[str] = None
    is_processed: bool = False
    processed_at: Optional[datetime] = None
    operator: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    remarks: str = ""

    def __post_init__(self):
        if isinstance(self.amount, (int, float)):
            self.amount = Decimal(str(self.amount))
        if isinstance(self.adjustment_type, str):
            self.adjustment_type = AdjustmentType(self.adjustment_type)
        if not hasattr(self, 'affected_revenue_detail_ids') and self.affected_revenue_detail_ids is None:
            self.affected_revenue_detail_ids = []
