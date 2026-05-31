from typing import Dict, List, Optional
from datetime import date
from decimal import Decimal
from models import PackageVersion


class PackageVersionManager:
    def __init__(self, data_store):
        self.data_store = data_store

    def create_version(self, version_id: str, package_name: str, price: Decimal,
                       validity_days: int, effective_date: date,
                       expiry_date: Optional[date] = None,
                       parent_version_id: Optional[str] = None,
                       upgrade_fee: Optional[Decimal] = None,
                       description: str = "") -> PackageVersion:
        version = PackageVersion(
            version_id=version_id,
            package_name=package_name,
            price=price,
            validity_days=validity_days,
            effective_date=effective_date,
            expiry_date=expiry_date,
            parent_version_id=parent_version_id,
            upgrade_fee=upgrade_fee,
            description=description
        )
        self.data_store.add_package_version(version)
        return version

    def get_active_version(self, check_date: date) -> Optional[PackageVersion]:
        active_versions = [
            v for v in self.data_store.get_all_package_versions()
            if v.is_active and v.is_effective_on(check_date)
        ]
        return active_versions[0] if active_versions else None

    def get_version_chain(self, version_id: str) -> List[PackageVersion]:
        chain = []
        current = self.data_store.get_package_version(version_id)
        while current:
            chain.append(current)
            if current.parent_version_id:
                current = self.data_store.get_package_version(current.parent_version_id)
            else:
                break
        return chain

    def get_upgrade_path(self, from_version_id: str, to_version_id: str) -> List[PackageVersion]:
        from_chain = self.get_version_chain(from_version_id)
        to_chain = self.get_version_chain(to_version_id)
        from_set = {v.version_id for v in from_chain}
        path = []
        for v in to_chain:
            if v.version_id in from_set:
                break
            path.append(v)
        return list(reversed(path))

    def calculate_upgrade_fee(self, from_version_id: str, to_version_id: str,
                              remaining_days: int) -> Decimal:
        from_version = self.data_store.get_package_version(from_version_id)
        to_version = self.data_store.get_package_version(to_version_id)
        if not from_version or not to_version:
            return Decimal('0')
        if from_version.upgrade_fee is not None:
            return from_version.upgrade_fee
        daily_diff = to_version.daily_rate() - from_version.daily_rate()
        return daily_diff * Decimal(remaining_days)
