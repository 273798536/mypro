import json
import uuid
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from .models import (
    SourceInfo,
    TradeAccount,
    ReferralLink,
    TradeVolume,
    FeeTier,
    ImportConflictStrategy,
)
from .storage import DataStore


class ImportResult:
    def __init__(self):
        self.added: List[str] = []
        self.skipped: List[Tuple[str, str]] = []
        self.overwritten: List[Tuple[str, str]] = []
        self.appended: List[Tuple[str, str]] = []
        self.errors: List[str] = []

    @property
    def summary(self) -> Dict[str, Any]:
        return {
            "added": len(self.added),
            "skipped": len(self.skipped),
            "overwritten": len(self.overwritten),
            "appended": len(self.appended),
            "errors": len(self.errors),
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "summary": self.summary,
            "added": self.added,
            "skipped": [{"item": s[0], "reason": s[1]} for s in self.skipped],
            "overwritten": [{"item": o[0], "previous_version": o[1]} for o in self.overwritten],
            "appended": [{"item": a[0], "note": a[1]} for a in self.appended],
            "errors": self.errors,
        }


class DataImporter:
    def __init__(self, store: DataStore):
        self.store = store

    def import_from_file(self, filepath: str, strategy: ImportConflictStrategy = ImportConflictStrategy.SKIP) -> ImportResult:
        with open(filepath) as f:
            data = json.load(f)
        return self.import_data(data, filepath, strategy)

    def import_data(self, data: Dict[str, Any], source_filename: str, strategy: ImportConflictStrategy = ImportConflictStrategy.SKIP) -> ImportResult:
        batch_id = str(uuid.uuid4())[:8]
        result = ImportResult()

        self.store.import_batches[batch_id] = {
            "batch_id": batch_id,
            "source_file": source_filename,
            "imported_at": datetime.now().isoformat(),
            "strategy": strategy.value,
        }

        section_handlers = {
            "accounts": self._import_accounts,
            "referrals": self._import_referrals,
            "volumes": self._import_volumes,
            "tiers": self._import_tiers,
        }

        for section, handler in section_handlers.items():
            if section in data:
                items = data[section] if isinstance(data[section], list) else [data[section]]
                for idx, item in enumerate(items):
                    try:
                        handler(item, batch_id, idx, source_filename, strategy, result)
                    except Exception as e:
                        result.errors.append(f"{section}[{idx}]: {str(e)}")

        return result

    def _make_source(self, batch_id: str, idx: int, source_file: str) -> SourceInfo:
        return SourceInfo(
            source_file=source_file,
            import_batch_id=batch_id,
            import_index=idx,
        )

    def _import_accounts(self, item: Dict[str, Any], batch_id: str, idx: int, source_file: str, strategy: ImportConflictStrategy, result: ImportResult):
        source = self._make_source(batch_id, idx, source_file)
        account = TradeAccount.from_dict({**item, "source": source.to_dict()})
        existing = self.store.accounts.get(account.account_id)

        if existing:
            if strategy == ImportConflictStrategy.SKIP:
                result.skipped.append((f"account:{account.account_id}", "already exists"))
                return
            elif strategy == ImportConflictStrategy.OVERWRITE:
                old_version = existing.version
                account.version = old_version + 1
                self.store.accounts[account.account_id] = account
                result.overwritten.append((f"account:{account.account_id}", f"v{old_version}"))
                return
            elif strategy == ImportConflictStrategy.APPEND:
                if existing.agent_name != account.agent_name:
                    result.appended.append((f"account:{account.account_id}", "name mismatch retained existing"))
                return
        else:
            self.store.accounts[account.account_id] = account
            result.added.append(f"account:{account.account_id}")

    def _import_referrals(self, item: Dict[str, Any], batch_id: str, idx: int, source_file: str, strategy: ImportConflictStrategy, result: ImportResult):
        source = self._make_source(batch_id, idx, source_file)
        referral = ReferralLink.from_dict({**item, "source": source.to_dict()})

        existing_links = self.store.referrals.setdefault(referral.account_id, [])
        matched = None
        for link in existing_links:
            if link.link_id == referral.link_id:
                matched = link
                break
            if link.account_id == referral.account_id and link.week == referral.week and link.inviter_id == referral.inviter_id:
                matched = link
                break

        if matched:
            if strategy == ImportConflictStrategy.SKIP:
                result.skipped.append((f"referral:{referral.link_id}", "already exists"))
                return
            elif strategy == ImportConflictStrategy.OVERWRITE:
                old_version = matched.version
                referral.version = old_version + 1
                matched_idx = existing_links.index(matched)
                existing_links[matched_idx] = referral
                result.overwritten.append((f"referral:{referral.link_id}", f"v{old_version}"))
                return
            elif strategy == ImportConflictStrategy.APPEND:
                if matched.inviter_id != referral.inviter_id:
                    referral.version = matched.version + 1
                    referral.is_active = True
                    matched.is_active = False
                    existing_links.append(referral)
                    result.appended.append((f"referral:{referral.link_id}", "new inviter version added"))
                else:
                    result.skipped.append((f"referral:{referral.link_id}", "duplicate"))
                return
        else:
            existing_links.append(referral)
            result.added.append(f"referral:{referral.link_id}")

    def _import_volumes(self, item: Dict[str, Any], batch_id: str, idx: int, source_file: str, strategy: ImportConflictStrategy, result: ImportResult):
        source = self._make_source(batch_id, idx, source_file)
        volume = TradeVolume.from_dict({**item, "source": source.to_dict()})

        existing_volumes = self.store.volumes.setdefault(volume.account_id, [])
        matched = None
        for v in existing_volumes:
            if v.volume_id == volume.volume_id:
                matched = v
                break

        if matched:
            if strategy == ImportConflictStrategy.SKIP:
                result.skipped.append((f"volume:{volume.volume_id}", "already exists"))
                return
            elif strategy == ImportConflictStrategy.OVERWRITE:
                matched_idx = existing_volumes.index(matched)
                existing_volumes[matched_idx] = volume
                result.overwritten.append((f"volume:{volume.volume_id}", f"from {matched.source.source_file}"))
                return
            elif strategy == ImportConflictStrategy.APPEND:
                if matched.trade_amount != volume.trade_amount or matched.fee_amount != volume.fee_amount:
                    existing_volumes.append(volume)
                    result.appended.append((f"volume:{volume.volume_id}", "additional version added"))
                else:
                    result.skipped.append((f"volume:{volume.volume_id}", "duplicate"))
                return
        else:
            existing_volumes.append(volume)
            result.added.append(f"volume:{volume.volume_id}")

    def _import_tiers(self, item: Dict[str, Any], batch_id: str, idx: int, source_file: str, strategy: ImportConflictStrategy, result: ImportResult):
        source = self._make_source(batch_id, idx, source_file)
        tier = FeeTier.from_dict({**item, "source": source.to_dict()})

        existing_tiers = self.store.tiers.setdefault(tier.week, [])
        matched = None
        for t in existing_tiers:
            if t.tier_id == tier.tier_id:
                matched = t
                break

        if matched:
            if strategy == ImportConflictStrategy.SKIP:
                result.skipped.append((f"tier:{tier.tier_id}", "already exists"))
                return
            elif strategy == ImportConflictStrategy.OVERWRITE:
                matched_idx = existing_tiers.index(matched)
                existing_tiers[matched_idx] = tier
                result.overwritten.append((f"tier:{tier.tier_id}", f"from {matched.source.source_file}"))
                return
            elif strategy == ImportConflictStrategy.APPEND:
                if matched.rebate_rate != tier.rebate_rate or matched.fee_rate != tier.fee_rate:
                    tier.is_snapshot = True
                    tier.snapshot_of = matched.tier_id
                    existing_tiers.append(tier)
                    result.appended.append((f"tier:{tier.tier_id}", "snapshot added"))
                else:
                    result.skipped.append((f"tier:{tier.tier_id}", "duplicate"))
                return
        else:
            existing_tiers.append(tier)
            result.added.append(f"tier:{tier.tier_id}")
