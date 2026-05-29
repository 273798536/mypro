from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

from .models import Bill, PledgeContract, BillPool, BillStatus, PledgeStatus


@dataclass
class MaturityWarning:
    bill_id: str
    pool_id: str
    amount: float
    effective_maturity_date: date
    days_to_maturity: int
    bill_status: BillStatus
    pledge_contract_id: Optional[str]
    warning_level: str
    is_extended: bool
    pledge_release_status: Optional[str]
    quota_impact: float

    def to_dict(self) -> dict:
        return {
            "bill_id": self.bill_id,
            "pool_id": self.pool_id,
            "amount": self.amount,
            "effective_maturity_date": self.effective_maturity_date.isoformat(),
            "days_to_maturity": self.days_to_maturity,
            "bill_status": self.bill_status.value,
            "pledge_contract_id": self.pledge_contract_id,
            "warning_level": self.warning_level,
            "is_extended": self.is_extended,
            "pledge_release_status": self.pledge_release_status,
            "quota_impact": self.quota_impact,
        }

    def fingerprint(self) -> str:
        return f"{self.bill_id}@{self.effective_maturity_date.isoformat()}#{self.warning_level}"


@dataclass
class MaturityCalendar:
    reference_date: date
    entries: dict[str, list[MaturityWarning]] = field(default_factory=dict)

    def add_warning(self, w: MaturityWarning) -> None:
        key = w.effective_maturity_date.isoformat()
        if key not in self.entries:
            self.entries[key] = []
        self.entries[key].append(w)

    def to_dict(self) -> dict:
        return {
            "reference_date": self.reference_date.isoformat(),
            "entries": {
                k: [w.to_dict() for w in v]
                for k, v in sorted(self.entries.items())
            },
        }


class WarningEngine:
    def __init__(self, pool: BillPool, warning_days: int = 7):
        self.pool = pool
        self.warning_days = warning_days
        self.warnings: list[MaturityWarning] = []
        self.calendar = MaturityCalendar(reference_date=date.today())
        self._bill_pledge_map = self._build_pledge_map()

    def _build_pledge_map(self) -> dict[str, PledgeContract]:
        mapping: dict[str, PledgeContract] = {}
        for pc in self.pool.pledge_contracts:
            for bid in pc.bill_ids:
                mapping[bid] = pc
        return mapping

    def _classify_warning_level(self, days: int) -> str:
        if days < 0:
            return "已逾期"
        elif days == 0:
            return "今日到期"
        elif days <= 3:
            return "紧急"
        elif days <= self.warning_days:
            return "预警"
        else:
            return "正常"

    def _get_pledge_release_status(self, bill: Bill) -> Optional[str]:
        if bill.status != BillStatus.PLEDGED or not bill.pledge_contract_id:
            return None
        pc = self._bill_pledge_map.get(bill.bill_id)
        if not pc:
            return "质押合同缺失"
        if pc.status == PledgeStatus.RELEASED:
            return "已释放"
        if pc.is_overdue_release:
            return f"释放延迟{pc.release_delay_days}天"
        if pc.expected_release_date and pc.expected_release_date < bill.effective_maturity_date:
            return "释放日在到期前"
        return "质押中-待释放"

    def _compute_quota_impact(self, bill: Bill) -> float:
        if bill.status in (BillStatus.PLEDGED, BillStatus.DISCOUNTED):
            return bill.amount
        if bill.status == BillStatus.MATURITY_PENDING:
            return bill.amount
        return 0.0

    def run(self, reference_date: Optional[date] = None) -> list[MaturityWarning]:
        ref = reference_date or date.today()
        self.calendar = MaturityCalendar(reference_date=ref)
        self.warnings = []

        active_statuses = {
            BillStatus.ACCEPTED,
            BillStatus.DISCOUNTED,
            BillStatus.PLEDGED,
            BillStatus.MATURITY_PENDING,
        }

        for bill in self.pool.bills:
            if bill.status not in active_statuses:
                continue

            days = bill.days_to_maturity(ref)
            level = self._classify_warning_level(days)

            if level == "正常" and days > self.warning_days + 7:
                continue

            warning = MaturityWarning(
                bill_id=bill.bill_id,
                pool_id=bill.pool_id,
                amount=bill.amount,
                effective_maturity_date=bill.effective_maturity_date,
                days_to_maturity=days,
                bill_status=bill.status,
                pledge_contract_id=bill.pledge_contract_id,
                warning_level=level,
                is_extended=bill.extended_maturity_date is not None,
                pledge_release_status=self._get_pledge_release_status(bill),
                quota_impact=self._compute_quota_impact(bill),
            )

            self.warnings.append(warning)
            self.calendar.add_warning(warning)

        self.warnings.sort(key=lambda w: (w.days_to_maturity, -w.quota_impact))
        return self.warnings

    def get_quota_snapshot(self) -> dict:
        quota = self.pool.compute_quota()
        return {
            "pool_id": quota.pool_id,
            "total_quota": quota.total_quota,
            "used_quota": quota.used_quota,
            "pledged_quota": quota.pledged_quota,
            "discounted_quota": quota.discounted_quota,
            "available_quota": quota.available_quota,
            "usage_ratio": round(quota.usage_ratio, 4),
        }

    def compute_risk_score(self) -> dict:
        quota = self.pool.compute_quota()
        usage_ratio = quota.usage_ratio

        maturing_soon = [w for w in self.warnings if w.warning_level in ("紧急", "已逾期", "今日到期")]
        maturing_amount = sum(w.quota_impact for w in maturing_soon)

        overdue_release = [
            w for w in self.warnings
            if w.pledge_release_status and "释放延迟" in w.pledge_release_status
        ]
        overdue_release_amount = sum(w.quota_impact for w in overdue_release)

        extended_bills = [w for w in self.warnings if w.is_extended]

        concentration = 0.0
        if quota.used_quota > 0 and maturing_amount > 0:
            concentration = maturing_amount / quota.used_quota

        score = 0.0
        score += min(usage_ratio * 40, 40)
        score += min(concentration * 30, 30)
        score += min((overdue_release_amount / max(quota.total_quota, 1)) * 20, 20)
        score += min(len(extended_bills) * 2, 10)

        return {
            "risk_score": round(min(score, 100), 1),
            "risk_level": "低" if score < 30 else ("中" if score < 60 else "高"),
            "components": {
                "额度占用率得分": {
                    "value": round(min(usage_ratio * 40, 40), 1),
                    "explanation": f"额度占用率={round(usage_ratio * 100, 1)}%，反映票据池中质押+贴现金额占总额度的比重。来源于票据信息中状态为'质押'或'贴现'的票据金额之和，除以票据池总额度。",
                },
                "到期集中度得分": {
                    "value": round(min(concentration * 30, 30), 1),
                    "explanation": f"即将到期金额={round(maturing_amount, 0)}，占已用额度={round(concentration * 100, 1)}%。来源于3天内到期的票据金额，这些票据到期后额度释放，但如果质押合同释放延迟则额度仍被占用。",
                },
                "质押释放延迟得分": {
                    "value": round(min((overdue_release_amount / max(quota.total_quota, 1)) * 20, 20), 1),
                    "explanation": f"释放延迟金额={round(overdue_release_amount, 0)}。来源于质押合同中actual_release_date > expected_release_date的合同所关联票据金额，延迟释放导致额度被额外占用。",
                },
                "到期顺延得分": {
                    "value": round(min(len(extended_bills) * 2, 10), 1),
                    "explanation": f"顺延票据数={len(extended_bills)}。来源于票据信息中extended_maturity_date不为空的票据，每张顺延票据意味着原到期日已被推迟，需关注顺延原因和新的到期日。",
                },
            },
        }
