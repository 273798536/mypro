from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
import uuid
from models import (
    AnnualPassAccount, UpgradeRecord, RevenueDetail,
    RevenueType, AdjustmentRecord, AdjustmentType
)


class UpgradeService:
    def __init__(self, data_store, revenue_service, version_manager):
        self.data_store = data_store
        self.revenue_service = revenue_service
        self.version_manager = version_manager

    def process_upgrade(self, account_id: str, to_package_version_id: str,
                        upgrade_date: date, upgrade_fee: Optional[Decimal] = None,
                        source_order_id: Optional[str] = None) -> UpgradeRecord:
        account = self.data_store.get_account(account_id)
        if not account:
            raise ValueError(f"Account {account_id} not found")
        from_package_version_id = account.package_version_id
        remaining_days = account.remaining_days(upgrade_date)
        if upgrade_fee is None:
            upgrade_fee = self.version_manager.calculate_upgrade_fee(
                from_package_version_id, to_package_version_id, remaining_days
            )
        upgrade = UpgradeRecord(
            upgrade_id=f"upg_{uuid.uuid4().hex[:8]}",
            account_id=account_id,
            from_package_version_id=from_package_version_id,
            to_package_version_id=to_package_version_id,
            upgrade_date=upgrade_date,
            upgrade_fee=upgrade_fee,
            effective_date=upgrade_date,
            source_order_id=source_order_id,
            original_account_id=account_id
        )
        self.data_store.add_upgrade_record(upgrade)
        adjustment = self._create_upgrade_adjustment(account, upgrade, upgrade_date)
        self._update_account_package(account, to_package_version_id, upgrade_date)
        self._recognize_upgrade_revenue(account, upgrade, upgrade_date)
        upgrade.is_processed = True
        upgrade.processed_at = datetime.now()
        return upgrade

    def _create_upgrade_adjustment(self, account: AnnualPassAccount,
                                   upgrade: UpgradeRecord,
                                   effective_date: date) -> AdjustmentRecord:
        affected_details = []
        for detail in self.data_store.get_revenue_details_by_account(account.account_id):
            if detail.revenue_date >= effective_date and not detail.is_adjusted:
                affected_details.append(detail.detail_id)
        adjustment = AdjustmentRecord(
            adjustment_id=f"adj_{uuid.uuid4().hex[:8]}",
            account_id=account.account_id,
            adjustment_type=AdjustmentType.UPGRADE,
            adjustment_date=effective_date,
            amount=upgrade.upgrade_fee,
            affected_revenue_detail_ids=affected_details,
            source_record_id=upgrade.upgrade_id,
            source_record_type="upgrade",
            is_processed=True,
            processed_at=datetime.now()
        )
        self.data_store.add_adjustment_record(adjustment)
        for detail_id in affected_details:
            detail = self.data_store.revenue_details.get(detail_id)
            if detail:
                detail.is_adjusted = True
        return adjustment

    def _update_account_package(self, account: AnnualPassAccount,
                                to_package_version_id: str,
                                effective_date: date) -> None:
        account.package_version_id = to_package_version_id
        account.updated_at = datetime.now()

    def _recognize_upgrade_revenue(self, account: AnnualPassAccount,
                                   upgrade: UpgradeRecord,
                                   effective_date: date) -> List[RevenueDetail]:
        details = []
        to_version = self.data_store.get_package_version(upgrade.to_package_version_id)
        from_version = self.data_store.get_package_version(upgrade.from_package_version_id)
        if not to_version or not from_version:
            return details
        daily_diff = to_version.daily_rate() - from_version.daily_rate()
        remaining_days = account.remaining_days(effective_date)
        current_date = effective_date
        for _ in range(remaining_days):
            if account.is_active_on(current_date):
                detail = RevenueDetail(
                    detail_id=f"rev_{uuid.uuid4().hex[:8]}",
                    account_id=account.account_id,
                    package_version_id=upgrade.to_package_version_id,
                    revenue_date=current_date,
                    amount=daily_diff,
                    revenue_type=RevenueType.ADJUSTMENT,
                    source_record_id=upgrade.upgrade_id,
                    source_record_type="upgrade"
                )
                self.data_store.add_revenue_detail(detail)
                details.append(detail)
            current_date = date.fromordinal(current_date.toordinal() + 1)
        return details

    def trace_upgrade_history(self, account_id: str) -> List[dict]:
        history = []
        upgrades = sorted(
            self.data_store.get_upgrade_records_by_account(account_id),
            key=lambda u: u.upgrade_date
        )
        for upgrade in upgrades:
            from_version = self.data_store.get_package_version(upgrade.from_package_version_id)
            to_version = self.data_store.get_package_version(upgrade.to_package_version_id)
            history.append({
                "upgrade_id": upgrade.upgrade_id,
                "upgrade_date": upgrade.upgrade_date,
                "from_package": from_version.package_name if from_version else "Unknown",
                "from_version_id": upgrade.from_package_version_id,
                "to_package": to_version.package_name if to_version else "Unknown",
                "to_version_id": upgrade.to_package_version_id,
                "upgrade_fee": upgrade.upgrade_fee,
                "source_order_id": upgrade.source_order_id
            })
        return history
