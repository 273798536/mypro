from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional
from decimal import Decimal


@dataclass
class UpgradeRecord:
    upgrade_id: str
    account_id: str
    from_package_version_id: str
    to_package_version_id: str
    upgrade_date: date
    upgrade_fee: Decimal
    effective_date: date
    is_processed: bool = False
    processed_at: Optional[datetime] = None
    source_order_id: Optional[str] = None
    original_account_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    remarks: str = ""

    def __post_init__(self):
        if isinstance(self.upgrade_fee, (int, float)):
            self.upgrade_fee = Decimal(str(self.upgrade_fee))
