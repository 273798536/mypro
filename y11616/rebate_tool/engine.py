import uuid
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from collections import defaultdict

from .models import (
    TradeAccount,
    ReferralLink,
    TradeVolume,
    FeeTier,
    RebateRecord,
    RebateAnomaly,
    RebateAnomalyType,
    RecordStatus,
    SourceInfo,
)
from .storage import DataStore
from .snapshot import SnapshotManager


class CalculationResult:
    def __init__(self, week: str):
        self.week = week
        self.records: List[RebateRecord] = []
        self.anomalies: List[Dict[str, Any]] = []
        self.warnings: List[str] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "week": self.week,
            "records": [r.to_dict() for r in self.records],
            "anomalies": self.anomalies,
            "warnings": self.warnings,
            "record_count": len(self.records),
            "anomaly_count": len(self.anomalies),
            "total_rebate": sum(r.adjusted_rebate for r in self.records if r.status == RecordStatus.VALID),
            "cancelled_rebate": sum(r.adjusted_rebate for r in self.records if r.status == RecordStatus.CANCELLED),
        }


class RebateEngine:
    def __init__(self, store: DataStore):
        self.store = store
        self.snapshot_mgr = SnapshotManager(store)

    def calculate_week(self, week: str) -> CalculationResult:
        result = CalculationResult(week)

        accounts = self.store.get_accounts_for_week(week)
        if not accounts:
            result.warnings.append(f"第 {week} 周没有找到交易数据")
            return result

        tier_changes = self.snapshot_mgr.detect_tier_changes(week)
        for change in tier_changes:
            result.anomalies.append({
                **change,
                "anomaly_type": RebateAnomalyType.TIER_CHANGED.value,
                "severity": "high",
            })

        for account_id in accounts:
            record = self._calculate_account(account_id, week)
            if record:
                result.records.append(record)
                if record.anomalies:
                    result.anomalies.extend(record.anomalies)

        self._check_cross_week_tiers(result, week, accounts)

        return result

    def _calculate_account(self, account_id: str, week: str) -> Optional[RebateRecord]:
        volume = self.store.get_volume_for_week(account_id, week)
        if not volume:
            return None

        if volume.status == RecordStatus.CANCELLED:
            return self._create_cancelled_record(account_id, week, volume)

        referral = self.store.get_referral_for_week(account_id, week)
        tier = self.store.get_tier_for_volume(week, volume.trade_amount)

        anomalies: List[Dict[str, Any]] = []

        if not tier:
            anomalies.append({
                "anomaly_type": RebateAnomalyType.MISSING_DATA.value,
                "account_id": account_id,
                "week": week,
                "description": f"第 {week} 周没有匹配的费率档位，成交量 {volume.trade_amount}",
                "severity": "high",
            })
            return None

        if not referral:
            anomalies.append({
                "anomaly_type": RebateAnomalyType.MISSING_DATA.value,
                "account_id": account_id,
                "week": week,
                "description": f"第 {week} 周没有找到邀请关系",
                "severity": "medium",
            })

        referral_changes = self.snapshot_mgr.detect_referral_changes(account_id)
        for change in referral_changes:
            if change["week"] == week:
                anomalies.append({
                    **change,
                    "anomaly_type": RebateAnomalyType.INVITER_CHANGED.value,
                    "account_id": account_id,
                    "severity": "high",
                    "description": change["message"],
                })

        inviter_chain = self.snapshot_mgr.build_inviter_chain(account_id, week) if referral else []

        base_rebate = volume.fee_amount * tier.rebate_rate
        adjusted_rebate = base_rebate

        inviter_rebate = self._calculate_inviter_rebate(inviter_chain, week, volume)
        if inviter_rebate > 0:
            anomalies.append({
                "anomaly_type": "inviter_rebate_split",
                "account_id": account_id,
                "week": week,
                "description": f"邀请链路返佣分配: 邀请人获得 {inviter_rebate:.4f}",
                "severity": "info",
                "inviter_rebate": inviter_rebate,
            })

        adjusted_rebate -= inviter_rebate

        record_id = f"{account_id}_{week}_{uuid.uuid4().hex[:6]}"

        return RebateRecord(
            record_id=record_id,
            account_id=account_id,
            week=week,
            base_rebate=round(base_rebate, 4),
            adjusted_rebate=round(adjusted_rebate, 4),
            fee_rate=tier.fee_rate,
            rebate_rate=tier.rebate_rate,
            trade_amount=volume.trade_amount,
            fee_amount=volume.fee_amount,
            inviter_chain=inviter_chain,
            anomalies=anomalies,
            status=RecordStatus.VALID,
            source=SourceInfo(
                source_file="calculation",
                import_batch_id=f"calc_{week}",
                import_index=0,
            ),
        )

    def _create_cancelled_record(self, account_id: str, week: str, volume: TradeVolume) -> RebateRecord:
        prev_volume = self._get_previous_cancelled_volume(account_id, week)
        prev_rebate = self._get_previous_rebate(account_id, week)

        anomaly = {
            "anomaly_type": RebateAnomalyType.TRADE_CANCELLED.value,
            "account_id": account_id,
            "week": week,
            "description": f"第 {week} 周成交已撤销，原始成交量 {volume.trade_amount}",
            "severity": "high",
            "original_volume": volume.trade_amount,
            "original_fee": volume.fee_amount,
        }

        record_id = f"{account_id}_{week}_cancel_{uuid.uuid4().hex[:6]}"

        return RebateRecord(
            record_id=record_id,
            account_id=account_id,
            week=week,
            base_rebate=0,
            adjusted_rebate=0,
            fee_rate=0,
            rebate_rate=0,
            trade_amount=volume.trade_amount,
            fee_amount=volume.fee_amount,
            inviter_chain=[],
            anomalies=[anomaly],
            status=RecordStatus.CANCELLED,
            source=SourceInfo(
                source_file="cancellation",
                import_batch_id=f"cancel_{week}",
                import_index=0,
            ),
        )

    def _calculate_inviter_rebate(self, inviter_chain: List[str], week: str, volume: TradeVolume) -> float:
        if not inviter_chain:
            return 0

        total_rebate = volume.fee_amount
        total = 0
        for level, inviter_id in enumerate(inviter_chain):
            inviter_volume = self.store.get_volume_for_week(inviter_id, week)
            if inviter_volume:
                inviter_tier = self.store.get_tier_for_volume(week, inviter_volume.trade_amount)
                if inviter_tier:
                    rate = inviter_tier.rebate_rate * 0.5
                    total += total_rebate * rate

        return total

    def _get_previous_cancelled_volume(self, account_id: str, week: str) -> Optional[TradeVolume]:
        volumes = self.store.volumes.get(account_id, [])
        for v in sorted(volumes, key=lambda x: x.source.imported_at):
            if v.week == week and v.status == RecordStatus.VALID:
                return v
        return None

    def _get_previous_rebate(self, account_id: str, week: str) -> Optional[RebateRecord]:
        records = self.store.rebates.get(account_id, [])
        for r in sorted(records, key=lambda x: x.source.imported_at, reverse=True):
            if r.week == week and r.status == RecordStatus.VALID:
                return r
        return None

    def _check_cross_week_tiers(self, result: CalculationResult, week: str, accounts: List[str]):
        all_weeks = self.store.get_all_weeks()
        if week not in all_weeks:
            return

        week_idx = all_weeks.index(week)
        if week_idx == 0:
            return

        prev_week = all_weeks[week_idx - 1]

        for account_id in accounts:
            curr_vol = self.store.get_volume_for_week(account_id, week)
            prev_vol = self.store.get_volume_for_week(account_id, prev_week)

            if not curr_vol or not prev_vol:
                continue

            curr_tier = self.store.get_tier_for_volume(week, curr_vol.trade_amount)
            prev_tier = self.store.get_tier_for_volume(prev_week, prev_vol.trade_amount)

            if curr_tier and prev_tier and curr_tier.tier_id != prev_tier.tier_id:
                result.anomalies.append({
                    "anomaly_type": RebateAnomalyType.CROSS_WEEK_TIER.value,
                    "account_id": account_id,
                    "week": week,
                    "from_week": prev_week,
                    "from_tier": prev_tier.tier_name,
                    "to_tier": curr_tier.tier_name,
                    "from_volume": prev_vol.trade_amount,
                    "to_volume": curr_vol.trade_amount,
                    "severity": "info",
                    "description": f"档位跨周变化: {prev_tier.tier_name} → {curr_tier.tier_name}",
                })

    def recalculate_account(self, account_id: str, week: str) -> Optional[RebateRecord]:
        existing_records = [
            r for r in self.store.rebates.get(account_id, [])
            if r.week == week and r.status == RecordStatus.VALID
        ]

        new_record = self._calculate_account(account_id, week)
        if not new_record:
            return None

        for old in existing_records:
            old.is_corrected = True
            old.corrected_from = new_record.record_id

        if not self.store.rebates.get(account_id):
            self.store.rebates[account_id] = []
        self.store.rebates[account_id].append(new_record)

        return new_record

    def recalculate_week(self, week: str) -> CalculationResult:
        existing_records = []
        for account_id, records in self.store.rebates.items():
            for r in records:
                if r.week == week and r.status == RecordStatus.VALID:
                    existing_records.append(r)

        result = self.calculate_week(week)

        for old in existing_records:
            old.is_corrected = True

        for new_r in result.records:
            account_id = new_r.account_id
            if not self.store.rebates.get(account_id):
                self.store.rebates[account_id] = []
            self.store.rebates[account_id].append(new_r)

        return result

    def cancel_trade(self, account_id: str, week: str, reason: str = "") -> Optional[RebateRecord]:
        volume = self.store.get_volume_for_week(account_id, week)
        if not volume:
            return None

        volume.status = RecordStatus.CANCELLED

        cancelled_record = self._create_cancelled_record(account_id, week, volume)

        prev_rebate = self._get_previous_rebate(account_id, week)
        if prev_rebate:
            prev_rebate.status = RecordStatus.CANCELLED
            cancelled_record.corrected_from = prev_rebate.record_id

        if not self.store.rebates.get(account_id):
            self.store.rebates[account_id] = []
        self.store.rebates[account_id].append(cancelled_record)

        return cancelled_record

    def compensate_cancellation(self, account_id: str, week: str, amount: float, reason: str) -> RebateRecord:
        record_id = f"{account_id}_{week}_comp_{uuid.uuid4().hex[:6]}"

        anomaly = {
            "anomaly_type": RebateAnomalyType.TRADE_CANCELLED.value,
            "account_id": account_id,
            "week": week,
            "description": f"撤销补偿: {reason}",
            "severity": "info",
            "compensation_amount": amount,
        }

        record = RebateRecord(
            record_id=record_id,
            account_id=account_id,
            week=week,
            base_rebate=amount,
            adjusted_rebate=amount,
            fee_rate=0,
            rebate_rate=0,
            trade_amount=0,
            fee_amount=0,
            inviter_chain=[],
            anomalies=[anomaly],
            status=RecordStatus.CORRECTED,
            source=SourceInfo(
                source_file="compensation",
                import_batch_id=f"comp_{week}",
                import_index=0,
            ),
        )

        if not self.store.rebates.get(account_id):
            self.store.rebates[account_id] = []
        self.store.rebates[account_id].append(record)

        return record
