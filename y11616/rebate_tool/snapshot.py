import uuid
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from .models import (
    FeeTier,
    ReferralLink,
    TradeAccount,
    TradeVolume,
    SourceInfo,
)
from .storage import DataStore


class SnapshotManager:
    def __init__(self, store: DataStore):
        self.store = store

    def snapshot_tiers_for_week(self, week: str, source_file: str = "snapshot") -> List[FeeTier]:
        existing_tiers = self.store.tiers.get(week, [])
        snapshots = []

        for tier in existing_tiers:
            if tier.is_snapshot:
                continue
            snapshot = FeeTier(
                tier_id=f"{tier.tier_id}_snap_{week}_{uuid.uuid4().hex[:6]}",
                tier_name=tier.tier_name,
                week=week,
                volume_min=tier.volume_min,
                volume_max=tier.volume_max,
                fee_rate=tier.fee_rate,
                rebate_rate=tier.rebate_rate,
                is_snapshot=True,
                snapshot_of=tier.tier_id,
                source=SourceInfo(
                    source_file=source_file,
                    import_batch_id=f"snap_{week}",
                    import_index=len(snapshots),
                ),
            )
            snapshots.append(snapshot)

        for snap in snapshots:
            self.store.tiers[week].append(snap)

        return snapshots

    def snapshot_referral_for_account_week(self, account_id: str, week: str) -> Optional[ReferralLink]:
        referral = self.store.get_referral_for_week(account_id, week)
        if not referral:
            return None

        snapshot = ReferralLink(
            account_id=referral.account_id,
            inviter_id=referral.inviter_id,
            week=week,
            effective_from=referral.effective_from,
            effective_to=referral.effective_to,
            is_active=True,
            version=referral.version,
            link_id=f"{referral.link_id}_snap_{week}",
            source=SourceInfo(
                source_file="snapshot",
                import_batch_id=f"snap_{week}",
                import_index=0,
            ),
        )

        if not self.store.referrals.get(account_id):
            self.store.referrals[account_id] = []
        self.store.referrals[account_id].append(snapshot)
        return snapshot

    def detect_tier_changes(self, week: str) -> List[Dict[str, Any]]:
        changes = []
        all_weeks = self.store.get_all_weeks()

        if week not in all_weeks:
            return changes

        current_tiers = [t for t in self.store.tiers.get(week, []) if not t.is_snapshot]
        if not current_tiers:
            return changes

        prev_weeks = [w for w in all_weeks if w < week]
        if not prev_weeks:
            return changes

        prev_week = max(prev_weeks)
        prev_tiers = [t for t in self.store.tiers.get(prev_week, []) if not t.is_snapshot]

        for tier in current_tiers:
            match = None
            for pt in prev_tiers:
                if pt.volume_min == tier.volume_min and pt.volume_max == tier.volume_max:
                    match = pt
                    break

            if match:
                if match.rebate_rate != tier.rebate_rate or match.fee_rate != tier.fee_rate:
                    changes.append({
                        "type": "tier_rate_changed",
                        "tier_id": tier.tier_id,
                        "week": week,
                        "from_week": prev_week,
                        "fee_rate_change": tier.fee_rate - match.fee_rate,
                        "rebate_rate_change": tier.rebate_rate - match.rebate_rate,
                        "message": f"档位 {tier.tier_name} 费率从 {match.rebate_rate} 变为 {tier.rebate_rate}",
                    })
            else:
                changes.append({
                    "type": "tier_new",
                    "tier_id": tier.tier_id,
                    "week": week,
                    "message": f"新增档位 {tier.tier_name} (成交量 {tier.volume_min}-{tier.volume_max})",
                })

        return changes

    def detect_referral_changes(self, account_id: str) -> List[Dict[str, Any]]:
        changes = []
        links = self.store.referrals.get(account_id, [])

        sorted_links = sorted(links, key=lambda l: (l.week, l.effective_from))
        for i in range(1, len(sorted_links)):
            prev = sorted_links[i - 1]
            curr = sorted_links[i]

            if prev.inviter_id != curr.inviter_id:
                changes.append({
                    "type": "inviter_changed",
                    "account_id": account_id,
                    "week": curr.week,
                    "from_inviter": prev.inviter_id,
                    "to_inviter": curr.inviter_id,
                    "effective_from": curr.effective_from,
                    "message": f"账号 {account_id} 邀请人从 {prev.inviter_id} 变为 {curr.inviter_id}",
                })

        return changes

    def build_inviter_chain(self, account_id: str, week: str, max_depth: int = 5) -> List[str]:
        chain = []
        current = account_id
        visited = set()

        for _ in range(max_depth):
            if current in visited:
                break
            visited.add(current)

            referral = self.store.get_referral_for_week(current, week)
            if not referral or not referral.inviter_id:
                break

            chain.append(referral.inviter_id)
            current = referral.inviter_id

        return chain

    def get_tier_history(self, tier_name: str) -> List[Dict[str, Any]]:
        history = []
        for week, tiers in sorted(self.store.tiers.items()):
            for tier in tiers:
                if tier.tier_name == tier_name and not tier.is_snapshot:
                    history.append({
                        "week": week,
                        "volume_min": tier.volume_min,
                        "volume_max": tier.volume_max,
                        "fee_rate": tier.fee_rate,
                        "rebate_rate": tier.rebate_rate,
                        "source": tier.source.source_file,
                    })
        return history

    def get_referral_history(self, account_id: str) -> List[Dict[str, Any]]:
        links = self.store.referrals.get(account_id, [])
        return sorted([{
            "link_id": l.link_id,
            "inviter_id": l.inviter_id,
            "week": l.week,
            "effective_from": l.effective_from,
            "effective_to": l.effective_to,
            "is_active": l.is_active,
            "version": l.version,
            "source": l.source.source_file,
        } for l in links], key=lambda x: x["effective_from"])
