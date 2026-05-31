from typing import Dict, List, Optional
from datetime import date
from models import (
    PackageVersion, AnnualPassAccount, EntryRecord,
    UpgradeRecord, RevenueDetail, AdjustmentRecord, RefundRecord
)


class DataStore:
    def __init__(self):
        self.package_versions: Dict[str, PackageVersion] = {}
        self.accounts: Dict[str, AnnualPassAccount] = {}
        self.entry_records: Dict[str, EntryRecord] = {}
        self.upgrade_records: Dict[str, UpgradeRecord] = {}
        self.revenue_details: Dict[str, RevenueDetail] = {}
        self.adjustment_records: Dict[str, AdjustmentRecord] = {}
        self.refund_records: Dict[str, RefundRecord] = {}

    def add_package_version(self, version: PackageVersion) -> None:
        self.package_versions[version.version_id] = version

    def get_package_version(self, version_id: str) -> Optional[PackageVersion]:
        return self.package_versions.get(version_id)

    def get_all_package_versions(self) -> List[PackageVersion]:
        return list(self.package_versions.values())

    def add_account(self, account: AnnualPassAccount) -> None:
        self.accounts[account.account_id] = account

    def get_account(self, account_id: str) -> Optional[AnnualPassAccount]:
        return self.accounts.get(account_id)

    def get_all_accounts(self) -> List[AnnualPassAccount]:
        return list(self.accounts.values())

    def add_entry_record(self, entry: EntryRecord) -> None:
        self.entry_records[entry.entry_id] = entry

    def get_entry_records_by_account(self, account_id: str) -> List[EntryRecord]:
        return [e for e in self.entry_records.values() if e.account_id == account_id]

    def get_entry_records_by_date(self, entry_date: date) -> List[EntryRecord]:
        return [e for e in self.entry_records.values() if e.entry_date == entry_date]

    def add_upgrade_record(self, upgrade: UpgradeRecord) -> None:
        self.upgrade_records[upgrade.upgrade_id] = upgrade

    def get_upgrade_records_by_account(self, account_id: str) -> List[UpgradeRecord]:
        return [u for u in self.upgrade_records.values() if u.account_id == account_id]

    def add_revenue_detail(self, detail: RevenueDetail) -> None:
        self.revenue_details[detail.detail_id] = detail

    def get_revenue_details_by_account(self, account_id: str) -> List[RevenueDetail]:
        return [r for r in self.revenue_details.values() if r.account_id == account_id]

    def get_revenue_details_by_date(self, revenue_date: date) -> List[RevenueDetail]:
        return [r for r in self.revenue_details.values() if r.revenue_date == revenue_date]

    def add_adjustment_record(self, adjustment: AdjustmentRecord) -> None:
        self.adjustment_records[adjustment.adjustment_id] = adjustment

    def get_adjustment_records_by_account(self, account_id: str) -> List[AdjustmentRecord]:
        return [a for a in self.adjustment_records.values() if a.account_id == account_id]

    def add_refund_record(self, refund: RefundRecord) -> None:
        self.refund_records[refund.refund_id] = refund

    def get_refund_records_by_account(self, account_id: str) -> List[RefundRecord]:
        return [r for r in self.refund_records.values() if r.account_id == account_id]
