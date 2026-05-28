from __future__ import annotations

from .models import SurrenderResult, ConflictSeverity


class StatementGenerator:
    def generate(self, result: SurrenderResult) -> str:
        lines: list[str] = []

        lines.append("=" * 60)
        lines.append("         保险退保现金价值试算说明")
        lines.append("=" * 60)
        lines.append("")

        lines.append(f"  保单号码: {result.policy_number}")
        lines.append(f"  计算日期: {result.calculation_date}")
        lines.append(f"  保单年度: 第{result.policy_year}年")
        lines.append("")

        lines.append("-" * 60)
        lines.append("  【宽限期状态】")
        lines.append(f"  {result.grace_period_status}")
        lines.append(f"  {result.grace_period_detail}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("  【现金价值计算】")
        lines.append(f"  基础现金价值:          {result.base_cash_value:>12,.2f} 元")

        if result.deductions:
            lines.append("")
            lines.append("  抵扣明细(按顺序):")
            for d in result.deductions:
                mark = "  " if not d.is_quarantined else "⚠ "
                lines.append(
                    f"  {mark}{d.order}. {d.name:<12}  -{d.amount:>10,.2f} 元  [{d.source}]"
                )

        if result.quarantined_items:
            lines.append("")
            lines.append("  ⚠ 隔离数据(不参与计算):")
            for q in result.quarantined_items:
                lines.append(
                    f"     · {q.name}: {q.amount:>10,.2f} 元  "
                    f"来源[{q.source}]  原因: {q.quarantine_reason}"
                )

        if result.dividend_details:
            lines.append("")
            lines.append("  红利明细:")
            for dd in result.dividend_details:
                cross = "跨年" if dd.get("is_cross_year") else "当期"
                quar = " [已隔离]" if dd.get("quarantined") else ""
                note = f"  备注: {dd['note']}" if dd.get("note") else ""
                lines.append(
                    f"     · {dd['year']}年 {dd['type']}({cross}): "
                    f"+{dd['amount']:>10,.2f} 元{quar}{note}"
                )
            lines.append(f"  红利合计:             +{result.dividend_adjustment:>11,.2f} 元")

        lines.append("")
        total_deduction = sum(d.amount for d in result.deductions)
        lines.append(f"  抵扣合计:             -{total_deduction:>11,.2f} 元")
        lines.append("")

        lines.append("=" * 60)
        lines.append(f"  ★ 退保现金价值(净额): {result.net_surrender_value:>12,.2f} 元")
        lines.append("=" * 60)

        if result.conflicts:
            lines.append("")
            lines.append("-" * 60)
            lines.append("  【数据冲突标记】")
            for i, c in enumerate(result.conflicts, 1):
                severity_mark = "✖ ERROR" if c.severity == ConflictSeverity.ERROR else "△ WARN "
                lines.append(f"  {severity_mark} 冲突{i}:")
                lines.append(f"     字段: {c.field_name}")
                lines.append(f"     来源A[{c.source_a.value}]: {c.value_a}")
                lines.append(f"     来源B[{c.source_b.value}]: {c.value_b}")
                lines.append(f"     处理: {c.resolution}")
                lines.append("")

        return "\n".join(lines)
