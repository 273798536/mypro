from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal


@dataclass
class AnnualPassAccount:
    account_id: str
    customer_name: str
    customer_id: str
    package_version_id: str
    purchase_date: date
    start_date: date
    expiry_date: date
    original_amount: Decimal
    paid_amount: Decimal
    status: str = "active"
    source_order_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    remarks: str = ""

    def __post_init__(self):
        if isinstance(self.original_amount, (int, float)):
            self.original_amount = Decimal(str(self.original_amount))
        if isinstance(self.paid_amount, (int, float)):
            self.paid_amount = Decimal(str(self.paid_amount))

    def validity_days(self) -> int:
        return (self.expiry_date - self.start_date).days + 1

    def is_active_on(self, check_date: date) -> bool:
        return self.status == "active" and self.start_date <= check_date <= self.expiry_date

    def remaining_days(self, as_of_date: date) -> int:
        if as_of_date > self.expiry_date:
            return 0
        if as_of_date < self.start_date:
            return self.validity_days()
        return (self.expiry_date - as_of_date).days + 1
