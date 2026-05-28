from __future__ import annotations

import json
from dataclasses import asdict
from typing import Optional

from .models import SurrenderResult


class DiffItem:
    def __init__(
        self,
        field_name: str,
        old_value,
        new_value,
        category: str = "",
    ):
        self.field_name = field_name
        self.old_value = old_value
        self.new_value = new_value
        self.category = category

    @property
    def changed(self) -> bool:
        return self.old_value != self.new_value

    def to_dict(self):
        return {
            "field": self.field_name,
            "old": self.old_value,
            "new": self.new_value,
            "category": self.category,
            "changed": self.changed,
        }


class ResultDiffer:
    def diff(
        self,
        old_result: SurrenderResult,
        new_result: SurrenderResult,
    ) -> list[DiffItem]:
        items: list[DiffItem] = []

        items.append(
            DiffItem("保单年度", old_result.policy_year, new_result.policy_year, "基础信息")
        )
        items.append(
            DiffItem("基础现金价值", old_result.base_cash_value, new_result.base_cash_value, "现金价值")
        )
        items.append(
            DiffItem("退保净额", old_result.net_surrender_value, new_result.net_surrender_value, "现金价值")
        )
        items.append(
            DiffItem("红利调整", old_result.dividend_adjustment, new_result.dividend_adjustment, "红利")
        )
        items.append(
            DiffItem(
                "宽限期状态",
                old_result.grace_period_status,
                new_result.grace_period_status,
                "宽限期",
            )
        )

        old_ded_names = {d.name for d in old_result.deductions}
        new_ded_names = {d.name for d in new_result.deductions}

        for name in sorted(old_ded_names | new_ded_names):
            old_amt = next(
                (d.amount for d in old_result.deductions if d.name == name), 0.0
            )
            new_amt = next(
                (d.amount for d in new_result.deductions if d.name == name), 0.0
            )
            items.append(DiffItem(f"抵扣-{name}", old_amt, new_amt, "抵扣"))

        old_quarantined_names = {q.name for q in old_result.quarantined_items}
        new_quarantined_names = {q.name for q in new_result.quarantined_items}

        for name in sorted(old_quarantined_names | new_quarantined_names):
            old_amt = next(
                (q.amount for q in old_result.quarantined_items if q.name == name), 0.0
            )
            new_amt = next(
                (q.amount for q in new_result.quarantined_items if q.name == name), 0.0
            )
            items.append(DiffItem(f"隔离-{name}", old_amt, new_amt, "隔离"))

        old_conflict_count = len(old_result.conflicts)
        new_conflict_count = len(new_result.conflicts)
        items.append(
            DiffItem("冲突数量", old_conflict_count, new_conflict_count, "冲突")
        )

        return [item for item in items if item.changed]

    def format_diff(self, diff_items: list[DiffItem]) -> str:
        if not diff_items:
            return "无变更：两次计算结果完全一致"

        lines: list[str] = []
        lines.append("=" * 60)
        lines.append("         退保试算变更对比")
        lines.append("=" * 60)
        lines.append("")

        current_category = ""
        for item in diff_items:
            if item.category != current_category:
                current_category = item.category
                lines.append(f"  【{current_category}】")

            old_str = self._format_value(item.old_value)
            new_str = self._format_value(item.new_value)

            if isinstance(item.old_value, float) and isinstance(item.new_value, float):
                delta = item.new_value - item.old_value
                arrow = "↑" if delta > 0 else "↓"
                lines.append(
                    f"    {item.field_name}: {old_str} → {new_str}  ({arrow}{abs(delta):,.2f})"
                )
            else:
                lines.append(f"    {item.field_name}: {old_str} → {new_str}")

        lines.append("")
        lines.append(f"  共 {len(diff_items)} 项变更")
        lines.append("=" * 60)

        return "\n".join(lines)

    @staticmethod
    def _format_value(val) -> str:
        if isinstance(val, float):
            return f"{val:,.2f}"
        return str(val)
