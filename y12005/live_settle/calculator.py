from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Optional, Tuple
from .models import (
    Anchor,
    UnionAgreement,
    RewardTransaction,
    TransactionType,
    SplitResult,
)


def round_decimal(value: Decimal, places: int = 2) -> Decimal:
    return value.quantize(Decimal(f"0.{'0' * places}"), rounding=ROUND_HALF_UP)


class ShareCalculator:
    def __init__(
        self,
        anchors: Dict[str, Anchor],
        agreements: List[UnionAgreement],
        tax_calculator: "TaxCalculator",
    ):
        self.anchors = anchors
        self.agreements = agreements
        self.tax_calculator = tax_calculator
        self._agreement_cache: Dict[Tuple[str, date], Optional[UnionAgreement]] = {}

    def _find_agreement(self, anchor_id: str, transaction_date: date) -> Optional[UnionAgreement]:
        cache_key = (anchor_id, transaction_date)
        if cache_key in self._agreement_cache:
            return self._agreement_cache[cache_key]

        matching = []
        for agr in self.agreements:
            if agr.anchor_id != anchor_id:
                continue
            if agr.effective_start > transaction_date:
                continue
            if agr.effective_end is not None and agr.effective_end < transaction_date:
                continue
            matching.append(agr)

        if len(matching) == 0:
            result = None
        elif len(matching) == 1:
            result = matching[0]
        else:
            result = max(matching, key=lambda a: a.effective_start)

        self._agreement_cache[cache_key] = result
        return result

    def _calculate_shares(
        self,
        amount: Decimal,
        agreement: UnionAgreement,
        is_refund: bool,
    ) -> Tuple[Decimal, Decimal, Decimal]:
        sign = Decimal("-1") if is_refund else Decimal("1")
        platform = round_decimal(amount * agreement.platform_share_rate * sign)
        union = round_decimal(amount * agreement.union_share_rate * sign)
        anchor_gross = round_decimal(amount * agreement.anchor_share_rate * sign)

        diff = (amount * sign) - (platform + union + anchor_gross)
        if abs(diff) > Decimal("0.0001"):
            anchor_gross = round_decimal(anchor_gross + diff)

        return platform, union, anchor_gross

    def process_transaction(
        self,
        transaction: RewardTransaction,
        snapshot_id: str,
        related_transactions: Dict[str, RewardTransaction],
    ) -> SplitResult:
        anchor = self.anchors[transaction.anchor_id]
        txn_date = transaction.transaction_date.date()
        is_refund = transaction.transaction_type == TransactionType.REFUND

        warnings: List[str] = []
        is_cross_month_refund = False
        tax_rate_switched = False

        agreement = self._find_agreement(transaction.anchor_id, txn_date)
        if agreement is None:
            warnings.append(
                f"未找到{txn_date}当天有效的工会协议，请检查agreements.csv"
            )
            platform_amount = Decimal("0")
            union_amount = Decimal("0")
            anchor_gross = Decimal("0") if not is_refund else -transaction.amount
            agreement_dict = {}
        else:
            platform_amount, union_amount, anchor_gross = self._calculate_shares(
                transaction.amount, agreement, is_refund
            )
            agreement_dict = {
                "agreement_id": agreement.agreement_id,
                "union_id": agreement.union_id,
                "union_name": agreement.union_name,
                "platform_share_rate": str(agreement.platform_share_rate),
                "union_share_rate": str(agreement.union_share_rate),
                "anchor_share_rate": str(agreement.anchor_share_rate),
            }

        if is_refund and transaction.related_transaction_id:
            orig_txn = related_transactions.get(transaction.related_transaction_id)
            if orig_txn:
                if orig_txn.settle_month != transaction.settle_month:
                    is_cross_month_refund = True
                    warnings.append(
                        f"⚠️ 跨月退款: 原交易结算月{orig_txn.settle_month}, 本次结算月{transaction.settle_month}"
                    )
                orig_date = orig_txn.transaction_date.date()
                if self.tax_calculator.check_rate_switch(orig_date, txn_date):
                    tax_rate_switched = True
                    warnings.append(
                        f"⚠️ 税率切换: 原交易日期{orig_date}适用税率与退款日期{txn_date}不同"
                    )

        tax_details, total_tax, rate_switched = self.tax_calculator.calculate_taxes(
            anchor_gross, txn_date, transaction
        )
        if rate_switched:
            tax_rate_switched = True

        anchor_net = anchor_gross - total_tax

        result = SplitResult(
            transaction_id=transaction.transaction_id,
            anchor_id=transaction.anchor_id,
            anchor_name=anchor.anchor_name,
            transaction_date=transaction.transaction_date,
            transaction_type=transaction.transaction_type,
            original_amount=transaction.amount * (Decimal("-1") if is_refund else Decimal("1")),
            settle_month=transaction.settle_month,
            platform_amount=platform_amount,
            union_amount=union_amount,
            anchor_gross_amount=anchor_gross,
            tax_details=tax_details,
            total_tax=total_tax,
            anchor_net_amount=anchor_net,
            is_cross_month_refund=is_cross_month_refund,
            tax_rate_switched=tax_rate_switched,
            warnings=warnings,
            agreement_snapshot_id=snapshot_id,
            agreement=agreement_dict,
        )

        return result

    def process_all(
        self,
        transactions: List[RewardTransaction],
        snapshot_id: str,
    ) -> List[SplitResult]:
        related_map = {txn.transaction_id: txn for txn in transactions}
        results = []

        for txn in sorted(transactions, key=lambda t: t.transaction_date):
            result = self.process_transaction(txn, snapshot_id, related_map)
            results.append(result)

        return results
