from __future__ import annotations

from decimal import Decimal
from datetime import date
from collections import defaultdict

from .models import (
    Account,
    Recharge,
    Consumption,
    Rebate,
    Refund,
    BalanceEntry,
)
from .store import Store


class ReconciliationResult:
    def __init__(self):
        self.matched: list[dict] = []
        self.unmatched_consumptions: list[Consumption] = []
        self.delayed_consumptions: list[dict] = []
        self.orphan_rebates: list[Rebate] = []
        self.orphan_refunds: list[Refund] = []
        self.warnings: list[str] = []
        self.balances: list[BalanceEntry] = []


class Engine:
    DELAY_THRESHOLD_DAYS = 3
    MATCHING_METHOD = "FIFO"

    def __init__(self, store: Store):
        self.store = store

    def reconcile(self, as_of_date: date | None = None) -> ReconciliationResult:
        result = ReconciliationResult()
        if as_of_date is None:
            as_of_date = date.today()

        accounts = self.store.load_accounts()
        recharges = self.store.load_recharges()
        consumptions = self.store.load_consumptions()
        rebates = self.store.load_rebates()
        refunds = self.store.load_refunds()

        recharge_ids = {r.recharge_id for r in recharges}
        consumption_ids = {c.consumption_id for c in consumptions}

        for rb in rebates:
            if rb.rebate_from_recharge_id not in recharge_ids:
                result.orphan_rebates.append(rb)
                result.warnings.append(
                    f"返点 {rb.rebate_id} 引用的充值 {rb.rebate_from_recharge_id} 不存在"
                )

        for rf in refunds:
            if rf.refund_from_type == "recharge" and rf.refund_from_id not in recharge_ids:
                result.orphan_refunds.append(rf)
                result.warnings.append(
                    f"退款 {rf.refund_id} 引用的充值 {rf.refund_from_id} 不存在"
                )
            elif rf.refund_from_type == "consumption" and rf.refund_from_id not in consumption_ids:
                result.orphan_refunds.append(rf)
                result.warnings.append(
                    f"退款 {rf.refund_id} 引用的消耗 {rf.refund_from_id} 不存在"
                )

        recharges_by_acc = defaultdict(list)
        for r in recharges:
            recharges_by_acc[r.account_id].append(r)

        consumptions_by_acc = defaultdict(list)
        for c in consumptions:
            consumptions_by_acc[c.account_id].append(c)

        rebates_by_acc = defaultdict(list)
        for rb in rebates:
            rebates_by_acc[rb.account_id].append(rb)

        refunds_by_acc = defaultdict(list)
        for rf in refunds:
            refunds_by_acc[rf.account_id].append(rf)

        updated_consumptions = []
        account_map = {a.account_id: a for a in accounts}

        for acc_id in sorted(
            set(recharges_by_acc.keys()) | set(consumptions_by_acc.keys())
        ):
            acc_recharges = sorted(
                recharges_by_acc.get(acc_id, []), key=lambda r: (r.date, r.recharge_id)
            )
            acc_consumptions = sorted(
                consumptions_by_acc.get(acc_id, []), key=lambda c: (c.date, c.consumption_id)
            )

            recharge_remaining: dict[str, Decimal] = {
                r.recharge_id: r.amount for r in acc_recharges
            }

            for consumption in acc_consumptions:
                if consumption.settled_date and consumption.settled_date > consumption.date:
                    delay = (consumption.settled_date - consumption.date).days
                    if delay > self.DELAY_THRESHOLD_DAYS:
                        result.delayed_consumptions.append(
                            {
                                "consumption_id": consumption.consumption_id,
                                "account_id": consumption.account_id,
                                "amount": str(consumption.amount),
                                "date": consumption.date.isoformat(),
                                "settled_date": consumption.settled_date.isoformat(),
                                "delay_days": delay,
                            }
                        )
                        result.warnings.append(
                            f"消耗 {consumption.consumption_id} 结算延迟 {delay} 天"
                            f"（消耗日 {consumption.date}，结算日 {consumption.settled_date}）"
                        )

                remaining = consumption.amount
                matched_ids: list[dict] = []

                for recharge in acc_recharges:
                    if remaining <= 0:
                        break
                    available = recharge_remaining.get(recharge.recharge_id, Decimal("0"))
                    if available <= 0:
                        continue

                    take = min(available, remaining)
                    recharge_remaining[recharge.recharge_id] -= take
                    matched_ids.append(
                        {"recharge_id": recharge.recharge_id, "amount": str(take)}
                    )
                    remaining -= take

                if remaining > 0:
                    result.unmatched_consumptions.append(consumption)
                    result.warnings.append(
                        f"消耗 {consumption.consumption_id} 有 {remaining} 无法匹配到充值"
                    )
                else:
                    result.matched.append(
                        {
                            "consumption_id": consumption.consumption_id,
                            "account_id": consumption.account_id,
                            "amount": str(consumption.amount),
                            "matched_from": matched_ids,
                        }
                    )

                consumption.matched_from = matched_ids
                updated_consumptions.append(consumption)

        self.store.save_consumptions(updated_consumptions)

        all_acc_ids = (
            set(recharges_by_acc.keys())
            | set(consumptions_by_acc.keys())
            | set(rebates_by_acc.keys())
            | set(refunds_by_acc.keys())
        )

        for acc_id in sorted(all_acc_ids):
            acc_name = account_map[acc_id].name if acc_id in account_map else "(未注册)"
            total_recharged = sum(
                r.amount for r in recharges_by_acc.get(acc_id, [])
            )
            total_consumed = sum(
                c.amount for c in consumptions_by_acc.get(acc_id, [])
            )
            total_rebated = sum(
                rb.amount for rb in rebates_by_acc.get(acc_id, [])
            )
            total_refunded = sum(
                rf.amount for rf in refunds_by_acc.get(acc_id, [])
            )

            result.balances.append(
                BalanceEntry(
                    account_id=acc_id,
                    account_name=acc_name,
                    total_recharged=total_recharged,
                    total_consumed=total_consumed,
                    total_rebated=total_rebated,
                    total_refunded=total_refunded,
                    current_balance=(
                        total_recharged + total_rebated - total_consumed - total_refunded
                    ),
                    as_of_date=as_of_date,
                )
            )

        return result
