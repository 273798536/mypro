from dataclasses import dataclass, field
from datetime import date
from typing import Optional
from decimal import Decimal


@dataclass
class PackageVersion:
    version_id: str
    package_name: str
    price: Decimal
    validity_days: int
    effective_date: date
    expiry_date: Optional[date] = None
    is_active: bool = True
    parent_version_id: Optional[str] = None
    upgrade_fee: Optional[Decimal] = None
    description: str = ""

    def __post_init__(self):
        if isinstance(self.price, (int, float)):
            self.price = Decimal(str(self.price))
        if self.upgrade_fee is not None and isinstance(self.upgrade_fee, (int, float)):
            self.upgrade_fee = Decimal(str(self.upgrade_fee))

    def daily_rate(self) -> Decimal:
        if self.validity_days <= 0:
            return Decimal('0')
        return self.price / Decimal(self.validity_days)

    def is_effective_on(self, check_date: date) -> bool:
        if check_date < self.effective_date:
            return False
        if self.expiry_date and check_date > self.expiry_date:
            return False
        return True
