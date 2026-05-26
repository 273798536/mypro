import json
import os
from typing import Dict, List, Optional, Any
from collections import defaultdict
from datetime import datetime

from .models import (
    SourceInfo,
    TradeAccount,
    ReferralLink,
    TradeVolume,
    FeeTier,
    RebateRecord,
    SettlementReport,
    CorrectionLog,
    ImportConflictStrategy,
)


class DataStore:
    def __init__(self, data_dir: str = "./rebate_data"):
        self.data_dir = data_dir
        self._ensure_dirs()
        self._load()

    def _ensure_dirs(self):
        for subdir in ["accounts", "referrals", "volumes", "tiers", "rebates", "reports", "corrections"]:
            os.makedirs(os.path.join(self.data_dir, subdir), exist_ok=True)

    def _load(self):
        self.accounts: Dict[str, TradeAccount] = {}
        self.referrals: Dict[str, List[ReferralLink]] = defaultdict(list)
        self.volumes: Dict[str, List[TradeVolume]] = defaultdict(list)
        self.tiers: Dict[str, List[FeeTier]] = defaultdict(list)
        self.rebates: Dict[str, List[RebateRecord]] = defaultdict(list)
        self.reports: Dict[str, SettlementReport] = {}
        self.corrections: List[CorrectionLog] = []
        self.import_batches: Dict[str, Dict[str, Any]] = {}

        self._load_file("accounts", self._load_accounts)
        self._load_file("referrals", self._load_referrals)
        self._load_file("volumes", self._load_volumes)
        self._load_file("tiers", self._load_tiers)
        self._load_file("rebates", self._load_rebates)
        self._load_file("reports", self._load_reports)
        self._load_corrections()
        self._load_import_batches()

    def _load_file(self, subdir: str, loader):
        path = os.path.join(self.data_dir, subdir)
        if not os.path.exists(path):
            return
        for f in os.listdir(path):
            if f.endswith(".json"):
                filepath = os.path.join(path, f)
                try:
                    loader(filepath)
                except Exception:
                    pass

    def _load_accounts(self, filepath: str):
        with open(filepath) as f:
            data = json.load(f)
        if isinstance(data, list):
            for d in data:
                acc = TradeAccount.from_dict(d)
                self.accounts[acc.account_id] = acc
        elif isinstance(data, dict):
            acc = TradeAccount.from_dict(data)
            self.accounts[acc.account_id] = acc

    def _load_referrals(self, filepath: str):
        with open(filepath) as f:
            data = json.load(f)
        if isinstance(data, list):
            for d in data:
                r = ReferralLink.from_dict(d)
                self.referrals[r.account_id].append(r)

    def _load_volumes(self, filepath: str):
        with open(filepath) as f:
            data = json.load(f)
        if isinstance(data, list):
            for d in data:
                v = TradeVolume.from_dict(d)
                self.volumes[v.account_id].append(v)

    def _load_tiers(self, filepath: str):
        with open(filepath) as f:
            data = json.load(f)
        if isinstance(data, list):
            for d in data:
                t = FeeTier.from_dict(d)
                self.tiers[t.week].append(t)

    def _load_rebates(self, filepath: str):
        with open(filepath) as f:
            data = json.load(f)
        if isinstance(data, list):
            for d in data:
                r = RebateRecord.from_dict(d)
                self.rebates[r.account_id].append(r)

    def _load_reports(self, filepath: str):
        with open(filepath) as f:
            data = json.load(f)
        if isinstance(data, dict):
            r = SettlementReport.from_dict(data)
            self.reports[r.report_id] = r

    def _load_corrections(self):
        path = os.path.join(self.data_dir, "corrections", "corrections.json")
        if os.path.exists(path):
            with open(path) as f:
                data = json.load(f)
            for d in data:
                self.corrections.append(CorrectionLog.from_dict(d))

    def _load_import_batches(self):
        path = os.path.join(self.data_dir, "import_batches.json")
        if os.path.exists(path):
            with open(path) as f:
                self.import_batches = json.load(f)

    def save(self):
        self._save_accounts()
        self._save_referrals()
        self._save_volumes()
        self._save_tiers()
        self._save_rebates()
        self._save_reports()
        self._save_corrections()
        self._save_import_batches()

    def _save_accounts(self):
        if not self.accounts:
            return
        data = [v.to_dict() for v in self.accounts.values()]
        path = os.path.join(self.data_dir, "accounts", "all_accounts.json")
        with open(path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _save_referrals(self):
        for account_id, links in self.referrals.items():
            if links:
                data = [r.to_dict() for r in links]
                path = os.path.join(self.data_dir, "referrals", f"{account_id}.json")
                with open(path, "w") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

    def _save_volumes(self):
        for account_id, volumes in self.volumes.items():
            if volumes:
                data = [v.to_dict() for v in volumes]
                path = os.path.join(self.data_dir, "volumes", f"{account_id}.json")
                with open(path, "w") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

    def _save_tiers(self):
        for week, tiers in self.tiers.items():
            if tiers:
                data = [t.to_dict() for t in tiers]
                path = os.path.join(self.data_dir, "tiers", f"{week}.json")
                with open(path, "w") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

    def _save_rebates(self):
        for account_id, records in self.rebates.items():
            if records:
                data = [r.to_dict() for r in records]
                path = os.path.join(self.data_dir, "rebates", f"{account_id}.json")
                with open(path, "w") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

    def _save_reports(self):
        for report_id, report in self.reports.items():
            path = os.path.join(self.data_dir, "reports", f"{report_id}.json")
            with open(path, "w") as f:
                json.dump(report.to_dict(), f, indent=2, ensure_ascii=False)

    def _save_corrections(self):
        if not self.corrections:
            return
        data = [c.to_dict() for c in self.corrections]
        path = os.path.join(self.data_dir, "corrections", "corrections.json")
        with open(path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _save_import_batches(self):
        path = os.path.join(self.data_dir, "import_batches.json")
        with open(path, "w") as f:
            json.dump(self.import_batches, f, indent=2, ensure_ascii=False)

    def get_account(self, account_id: str) -> Optional[TradeAccount]:
        return self.accounts.get(account_id)

    def get_referral_for_week(self, account_id: str, week: str) -> Optional[ReferralLink]:
        links = self.referrals.get(account_id, [])
        for link in sorted(links, key=lambda l: l.effective_from, reverse=True):
            if link.week == week:
                return link
            if link.is_active and (link.effective_from <= week <= (link.effective_to or "9999-53")):
                return link
        for link in links:
            if link.week == week:
                return link
        return links[-1] if links else None

    def get_volume_for_week(self, account_id: str, week: str) -> Optional[TradeVolume]:
        volumes = self.volumes.get(account_id, [])
        for v in sorted(volumes, key=lambda x: x.source.imported_at, reverse=True):
            if v.week == week:
                return v
        return None

    def get_tier_for_volume(self, week: str, trade_amount: float) -> Optional[FeeTier]:
        tiers = self.tiers.get(week, [])
        for t in tiers:
            if t.volume_min <= trade_amount < t.volume_max:
                return t
        if tiers:
            sorted_tiers = sorted(tiers, key=lambda x: x.volume_min)
            return sorted_tiers[-1]
        return None

    def get_all_weeks(self) -> List[str]:
        weeks = set()
        for account_id, volumes in self.volumes.items():
            for v in volumes:
                weeks.add(v.week)
        return sorted(weeks)

    def get_accounts_for_week(self, week: str) -> List[str]:
        accounts = set()
        for account_id, volumes in self.volumes.items():
            for v in volumes:
                if v.week == week:
                    accounts.add(account_id)
        return sorted(accounts)

    def add_correction(self, correction: CorrectionLog):
        self.corrections.append(correction)
