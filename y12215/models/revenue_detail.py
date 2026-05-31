from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from enum import Enum


class RevenueType(Enum):
    DEFERRED = "deferred"
    RECOGNIZED = "recognized"
    ADJUSTMENT = "adjustment"
    REFUND = "refund"


@dataclass
class RevenueDetail:
    detail_id: str
    account_id: str
    package_version_id: str
    revenue_date: date
    amount: Decimal
    revenue_type: RevenueType
    is_adjusted: bool = False
    related_detail_id: Optional[str] = None
    source_record_id: Optional[str] = None
    source_record_type: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    remarks: str = ""

    def __post_init__(self):
        if isinstance(self.amount, (int, float)):
            self.amount = Decimal(str(self.amount))
        if isinstance(self.revenue_type, str):
            self.revenue_type = RevenueType(self.revenue_type)
