from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from tax_bracket import BracketRow, TaxTable


@dataclass
class BracketTrial:
    bracket: BracketRow
    assumed_taxable: float
    computed_pretax: float
    tax: float
    post_tax: float
    matched: bool
    reject_reason: str = ""

    def explain(self) -> str:
        tag = "✔ 命中" if self.matched else "✘ 未命中"
        lines = [
            f"{tag} {self.bracket.label or f'{self.bracket.lower:,.0f}~{self.bracket.upper_repr}'}",
            f"  假设应纳税所得额 = {self.assumed_taxable:,.2f}",
            f"  反推税前收入 = {self.computed_pretax:,.2f}",
            f"  税额 = {self.tax:,.2f}  税后 = {self.post_tax:,.2f}",
        ]
        if not self.matched:
            lines.append(f"  拦截原因: {self.reject_reason}")
        return "\n".join(lines)


@dataclass
class ReverseResult:
    pretax: float
    taxable: float
    tax: float
    bracket: BracketRow
    trials: List[BracketTrial]
    boundary_explanations: List[str]

    def winning_trial(self) -> Optional[BracketTrial]:
        for t in self.trials:
            if t.matched:
                return t
        return None


def reverse_calculate(
    post_tax: float,
    total_deductions: float,
    table: TaxTable,
) -> ReverseResult:
    net_needed = post_tax + total_deductions
    trials: List[BracketTrial] = []
    boundary_explanations: List[str] = []

    for bracket in table.brackets:
        rate = bracket.rate
        qd = bracket.quick_deduction
        denominator = 1.0 - rate
        if denominator <= 0:
            trial = BracketTrial(
                bracket=bracket,
                assumed_taxable=0,
                computed_pretax=0,
                tax=0,
                post_tax=0,
                matched=False,
                reject_reason=f"税率 {rate*100:.0f}% ≥ 100%，无法反推",
            )
            trials.append(trial)
            continue

        taxable_guess = (net_needed - qd) / denominator
        pretax_guess = taxable_guess + total_deductions
        tax_guess = taxable_guess * rate - qd
        post_check = pretax_guess - tax_guess - total_deductions

        matched = bracket.contains(taxable_guess)
        reject_reason = ""
        if not matched:
            if taxable_guess < bracket.lower:
                reject_reason = (
                    f"反推应纳税所得额 {taxable_guess:,.2f} < 本档下界 "
                    f"{bracket.lower:,.2f}，收入不够进入此档"
                )
            elif bracket.upper is not None and taxable_guess >= bracket.upper:
                reject_reason = (
                    f"反推应纳税所得额 {taxable_guess:,.2f} ≥ 本档上界 "
                    f"{bracket.upper:,.2f}，收入溢出此档"
                )
            else:
                reject_reason = "档位不匹配（异常情况）"

        trial = BracketTrial(
            bracket=bracket,
            assumed_taxable=taxable_guess,
            computed_pretax=pretax_guess,
            tax=max(tax_guess, 0),
            post_tax=post_check,
            matched=matched,
            reject_reason=reject_reason,
        )
        trials.append(trial)

    winner: Optional[BracketTrial] = None
    for t in trials:
        if t.matched:
            winner = t
            break

    boundary_explanations = table.all_boundary_explanations(
        winner.assumed_taxable if winner else 0
    )

    if winner is None:
        return ReverseResult(
            pretax=0,
            taxable=0,
            tax=0,
            bracket=table.brackets[0] if table.brackets else None,
            trials=trials,
            boundary_explanations=boundary_explanations,
        )

    return ReverseResult(
        pretax=winner.computed_pretax,
        taxable=winner.assumed_taxable,
        tax=winner.tax,
        bracket=winner.bracket,
        trials=trials,
        boundary_explanations=boundary_explanations,
    )
