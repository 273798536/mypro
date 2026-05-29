from datetime import date
from decimal import Decimal
from typing import List, Dict, Tuple, Optional
from .models import TaxRate, RewardTransaction, TransactionType
from .calculator import round_decimal


class TaxCalculator:
    def __init__(self, tax_rates: List[TaxRate]):
        self.tax_rates = tax_rates
        self._rate_cache: Dict[Tuple[str, date], List[TaxRate]] = {}
        self._validate_rates()

    def _validate_rates(self):
        tax_type_dates = {}
        for rate in self.tax_rates:
            key = rate.tax_type
            if key not in tax_type_dates:
                tax_type_dates[key] = []
            tax_type_dates[key].append((rate.effective_start, rate.effective_end, rate))
        
        for tax_type, ranges in tax_type_dates.items():
            ranges.sort(key=lambda x: x[0])
            for i in range(len(ranges) - 1):
                curr_end = ranges[i][1]
                next_start = ranges[i + 1][0]
                if curr_end and curr_end >= next_start:
                    raise ValueError(
                        f"税种{tax_type}税率日期区间重叠: "
                        f"{ranges[i][0]}~{curr_end} 与 {next_start}~{ranges[i+1][1]}"
                    )

    def _get_applicable_rates(self, tax_type: str, txn_date: date) -> List[TaxRate]:
        cache_key = (tax_type, txn_date)
        if cache_key in self._rate_cache:
            return self._rate_cache[cache_key]

        applicable = []
        for rate in self.tax_rates:
            if rate.tax_type != tax_type:
                continue
            if rate.effective_start > txn_date:
                continue
            if rate.effective_end is not None and rate.effective_end < txn_date:
                continue
            applicable.append(rate)

        self._rate_cache[cache_key] = applicable
        return applicable

    def get_rate_for_date(self, tax_type: str, txn_date: date) -> Optional[TaxRate]:
        rates = self._get_applicable_rates(tax_type, txn_date)
        if not rates:
            return None
        return max(rates, key=lambda r: r.effective_start)

    def check_rate_switch(self, date1: date, date2: date) -> bool:
        if date1 == date2:
            return False

        tax_types = set(r.tax_type for r in self.tax_rates)
        for tax_type in tax_types:
            rate1 = self.get_rate_for_date(tax_type, date1)
            rate2 = self.get_rate_for_date(tax_type, date2)
            if rate1 != rate2:
                if rate1 is None or rate2 is None:
                    return True
                if rate1.rate != rate2.rate:
                    return True
        return False

    def _calculate_single_tax(
        self,
        taxable_amount: Decimal,
        rate: TaxRate,
        is_refund: bool,
    ) -> Decimal:
        if taxable_amount <= 0:
            return Decimal("0")

        tax_base = abs(taxable_amount)
        sign = Decimal("-1") if is_refund else Decimal("1")

        if rate.deduction_threshold and tax_base < rate.deduction_threshold:
            return Decimal("0")

        tax = tax_base * rate.rate
        if rate.quick_calculation_deduction:
            tax = tax - rate.quick_calculation_deduction

        tax = max(tax, Decimal("0"))
        return round_decimal(tax * sign)

    def calculate_taxes(
        self,
        anchor_gross: Decimal,
        txn_date: date,
        transaction: RewardTransaction,
    ) -> Tuple[Dict[str, Decimal], Decimal, bool]:
        is_refund = transaction.transaction_type == TransactionType.REFUND

        tax_details: Dict[str, Decimal] = {}
        total_tax = Decimal("0")
        rate_switched = False

        tax_types = sorted(set(r.tax_type for r in self.tax_rates))

        for tax_type in tax_types:
            rate = self.get_rate_for_date(tax_type, txn_date)
            if rate is None:
                tax_details[tax_type] = Decimal("0")
                continue

            effective_rates = self._get_applicable_rates(tax_type, txn_date)
            if len(effective_rates) > 1:
                rate_switched = True

            tax_amount = self._calculate_single_tax(anchor_gross, rate, is_refund)
            tax_details[tax_type] = tax_amount
            total_tax += tax_amount

        return tax_details, total_tax, rate_switched
