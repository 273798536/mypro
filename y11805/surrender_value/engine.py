from __future__ import annotations

from datetime import date
from typing import Optional

from .models import (
    Policy,
    PaymentRecord,
    SurrenderApplication,
    SurrenderResult,
    Conflict,
    ConflictSource,
    ConflictSeverity,
    DeductionItem,
    DividendType,
    PaymentStatus,
)


class SurrenderEngine:
    def __init__(
        self,
        policy: Policy,
        payments: list[PaymentRecord],
        surrender_app: Optional[SurrenderApplication] = None,
        reference_date: Optional[date] = None,
    ):
        self.policy = policy
        self.payments = payments
        self.surrender_app = surrender_app
        self.reference_date = reference_date or date.today()
        self.conflicts: list[Conflict] = []
        self.quarantined: list[DeductionItem] = []

    def calculate(self) -> SurrenderResult:
        policy_year = self.policy.get_policy_year(self.reference_date)
        base_cash_value = self._resolve_base_cash_value(policy_year)
        grace_status, grace_detail = self._check_grace_period()
        deductions = self._build_deductions()
        dividend_adj, dividend_details = self._calculate_dividends(policy_year)
        self._detect_conflicts()

        valid_deductions = [d for d in deductions if not d.is_quarantined]
        total_deduction = sum(d.amount for d in valid_deductions)
        net_value = base_cash_value - total_deduction + dividend_adj
        net_value = round(max(net_value, 0), 2)

        return SurrenderResult(
            policy_number=self.policy.policy_number,
            calculation_date=self.reference_date.isoformat(),
            policy_year=policy_year,
            base_cash_value=base_cash_value,
            deductions=valid_deductions,
            dividend_adjustment=dividend_adj,
            dividend_details=dividend_details,
            net_surrender_value=net_value,
            conflicts=self.conflicts,
            grace_period_status=grace_status,
            grace_period_detail=grace_detail,
            quarantined_items=self.quarantined,
        )

    def _resolve_base_cash_value(self, policy_year: int) -> float:
        cv = self.policy.get_cash_value(policy_year)
        if cv is not None:
            return cv

        nearest = None
        for entry in self.policy.cash_value_table:
            if entry.year <= policy_year:
                nearest = entry

        if nearest is not None and len(self.policy.cash_value_table) > 0:
            self.conflicts.append(
                Conflict(
                    source_a=ConflictSource.POLICY,
                    source_b=ConflictSource.POLICY,
                    field_name="现金价值表",
                    value_a=f"第{policy_year}年无对应值",
                    value_b=f"使用第{nearest.year}年值{nearest.cash_value}",
                    severity=ConflictSeverity.WARNING,
                    resolution="取最近年份现金价值",
                )
            )
            return nearest.cash_value

        return 0.0

    def _check_grace_period(self) -> tuple[str, str]:
        overdue_payments = [
            p for p in self.payments if p.status in (PaymentStatus.OVERDUE, PaymentStatus.UNPAID)
        ]

        if not overdue_payments:
            return "正常", "无逾期缴费记录"

        latest_overdue = max(overdue_payments, key=lambda p: p.due_date)
        days_overdue = (self.reference_date - latest_overdue.due_date).days
        grace_days = self.policy.grace_period_days

        policy_says_in_grace = days_overdue <= grace_days
        payment_says_in_grace = latest_overdue.is_within_grace_period(grace_days)

        if policy_says_in_grace and not payment_says_in_grace:
            self.conflicts.append(
                Conflict(
                    source_a=ConflictSource.POLICY,
                    source_b=ConflictSource.PAYMENT_RECORD,
                    field_name="宽限期判断",
                    value_a=f"保单标记: 宽限期内(逾期{days_overdue}天≤{grace_days}天)",
                    value_b=f"缴费记录: 已超宽限期(实际还款日超出)",
                    severity=ConflictSeverity.ERROR,
                    resolution="以缴费记录为准，标记为宽限期外",
                )
            )
            return "宽限期误判", f"保单标记宽限期内，但缴费记录显示已超宽限期(逾期{days_overdue}天)"

        if not policy_says_in_grace and payment_says_in_grace:
            self.conflicts.append(
                Conflict(
                    source_a=ConflictSource.POLICY,
                    source_b=ConflictSource.PAYMENT_RECORD,
                    field_name="宽限期判断",
                    value_a=f"保单标记: 超宽限期(逾期{days_overdue}天>{grace_days}天)",
                    value_b=f"缴费记录: 宽限期内",
                    severity=ConflictSeverity.WARNING,
                    resolution="以缴费记录为准，标记为宽限期内",
                )
            )
            return "宽限期争议", f"保单标记超宽限期，但缴费记录显示在宽限期内"

        if policy_says_in_grace:
            return "宽限期内", f"逾期{days_overdue}天，仍在{grace_days}天宽限期内"

        return "已过宽限期", f"逾期{days_overdue}天，超过{grace_days}天宽限期"

    def _build_deductions(self) -> list[DeductionItem]:
        deductions: list[DeductionItem] = []
        order = 1

        unpaid = [
            p for p in self.payments if p.status in (PaymentStatus.UNPAID, PaymentStatus.OVERDUE)
        ]
        if unpaid:
            total_unpaid = sum(p.amount for p in unpaid)
            deductions.append(
                DeductionItem(
                    name="欠缴保费",
                    amount=total_unpaid,
                    order=order,
                    source="缴费记录",
                )
            )
            order += 1

        loan_principal = self.policy.loan_principal
        loan_interest = self.policy.loan_interest

        if self.surrender_app:
            if self.surrender_app.declared_loan_principal is not None:
                declared_p = self.surrender_app.declared_loan_principal
                if abs(declared_p - loan_principal) > 0.01:
                    self.conflicts.append(
                        Conflict(
                            source_a=ConflictSource.POLICY,
                            source_b=ConflictSource.SURRENDER_APPLICATION,
                            field_name="贷款本金",
                            value_a=f"保单记录: {loan_principal}",
                            value_b=f"退保申请声明: {declared_p}",
                            severity=ConflictSeverity.ERROR,
                            resolution="以保单记录为准，退保申请声明隔离",
                        )
                    )
                    self.quarantined.append(
                        DeductionItem(
                            name="贷款本金(退保申请声明)",
                            amount=declared_p,
                            order=order,
                            source="退保申请",
                            is_quarantined=True,
                            quarantine_reason="与保单记录冲突，已隔离",
                        )
                    )

            if self.surrender_app.declared_loan_interest is not None:
                declared_i = self.surrender_app.declared_loan_interest
                if abs(declared_i - loan_interest) > 0.01:
                    self.conflicts.append(
                        Conflict(
                            source_a=ConflictSource.POLICY,
                            source_b=ConflictSource.SURRENDER_APPLICATION,
                            field_name="贷款利息",
                            value_a=f"保单记录: {loan_interest}",
                            value_b=f"退保申请声明: {declared_i}",
                            severity=ConflictSeverity.WARNING,
                            resolution="以保单记录为准，退保申请声明隔离",
                        )
                    )
                    self.quarantined.append(
                        DeductionItem(
                            name="贷款利息(退保申请声明)",
                            amount=declared_i,
                            order=order + 1,
                            source="退保申请",
                            is_quarantined=True,
                            quarantine_reason="与保单记录冲突，已隔离",
                        )
                    )

        if loan_principal > 0:
            deductions.append(
                DeductionItem(
                    name="保单贷款本金",
                    amount=loan_principal,
                    order=order,
                    source="保单",
                )
            )
            order += 1

        if loan_interest > 0:
            deductions.append(
                DeductionItem(
                    name="保单贷款利息",
                    amount=loan_interest,
                    order=order,
                    source="保单",
                )
            )
            order += 1

        return deductions

    def _calculate_dividends(self, policy_year: int) -> tuple[float, list[dict]]:
        if not self.policy.dividend_records:
            return 0.0, []

        total = 0.0
        details: list[dict] = []

        max_calendar_year = self.policy.issue_date.year + policy_year - 1

        current_year_records = []
        cross_year_records = []

        for rec in self.policy.dividend_records:
            if rec.is_cross_year:
                cross_year_records.append(rec)
            else:
                current_year_records.append(rec)

        for rec in current_year_records:
            if rec.year > max_calendar_year:
                continue
            total += rec.amount
            details.append(
                {
                    "year": rec.year,
                    "amount": rec.amount,
                    "type": rec.dividend_type.value,
                    "is_cross_year": False,
                    "source": "保单红利记录",
                }
            )

        for rec in cross_year_records:
            if rec.year > max_calendar_year:
                continue
            if rec.dividend_type == DividendType.ACCUMULATE:
                total += rec.amount
                details.append(
                    {
                        "year": rec.year,
                        "amount": rec.amount,
                        "type": rec.dividend_type.value,
                        "is_cross_year": True,
                        "source": "保单跨年红利",
                        "note": "跨年累积生息红利，已单独计算未合并",
                    }
                )
            else:
                self.quarantined.append(
                    DeductionItem(
                        name=f"跨年红利-{rec.year}年",
                        amount=rec.amount,
                        order=999,
                        source="保单跨年红利",
                        is_quarantined=True,
                        quarantine_reason=f"跨年{rec.dividend_type.value}红利不应合并到当期，已隔离",
                    )
                )
                details.append(
                    {
                        "year": rec.year,
                        "amount": rec.amount,
                        "type": rec.dividend_type.value,
                        "is_cross_year": True,
                        "source": "保单跨年红利",
                        "quarantined": True,
                        "note": "跨年非累积红利已隔离，不并入当期",
                    }
                )

        if self.surrender_app and self.surrender_app.declared_dividend_balance is not None:
            declared_d = self.surrender_app.declared_dividend_balance
            if abs(declared_d - total) > 0.01:
                self.conflicts.append(
                    Conflict(
                        source_a=ConflictSource.POLICY,
                        source_b=ConflictSource.SURRENDER_APPLICATION,
                        field_name="红利余额",
                        value_a=f"保单计算: {total}",
                        value_b=f"退保申请声明: {declared_d}",
                        severity=ConflictSeverity.WARNING,
                        resolution="以保单计算为准",
                    )
                )

        return round(total, 2), details

    def _detect_conflicts(self):
        policy_loan_flag = self.policy.has_loan
        actual_loan = self.policy.loan_principal > 0 or self.policy.loan_interest > 0

        if policy_loan_flag and not actual_loan:
            self.conflicts.append(
                Conflict(
                    source_a=ConflictSource.POLICY,
                    source_b=ConflictSource.POLICY,
                    field_name="贷款标记",
                    value_a=f"保单标记有贷款",
                    value_b=f"贷款本金和利息均为0",
                    severity=ConflictSeverity.WARNING,
                    resolution="以实际金额为准，标记可能过时",
                )
            )

        if not policy_loan_flag and actual_loan:
            self.conflicts.append(
                Conflict(
                    source_a=ConflictSource.POLICY,
                    source_b=ConflictSource.POLICY,
                    field_name="贷款标记",
                    value_a=f"保单标记无贷款",
                    value_b=f"存在贷款本金{self.policy.loan_principal}或利息{self.policy.loan_interest}",
                    severity=ConflictSeverity.ERROR,
                    resolution="以实际金额为准，贷款标记遗漏",
                )
            )
