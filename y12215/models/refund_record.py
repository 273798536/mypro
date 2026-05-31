from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal


@dataclass
class RefundRecord:
    refund_id: str
    account_id: str
    refund_date: date
    refund_amount: Decimal
    is_posted_date: Optional[date] = None
    affected_period: Optional[str] = None
    affected_revenue_detail_ids: List[str] = field(default_factory=list)
    source_order_id: Optional[str] = None
    is_processed: bool = False
    processed_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    remarks: str = ""

    def __post_init__(self):
        if isinstance(self.refund_amount, (int, float)):
            self.refund_amount = Decimal(str(self.refund_amount))
