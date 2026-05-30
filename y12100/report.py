from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import List, Optional

from tax_bracket import TaxTable
from deduction_merger import MergeResult
from reverse_calculator import ReverseResult
from validator import ValidationResult


def generate_report(
    post_tax: float,
    table: TaxTable,
    merge_result: MergeResult,
    reverse_result: ReverseResult,
    validation: ValidationResult,
    as_of: Optional[date] = None,
) -> str:
    ref = as_of or date.today()
    lines: List[str] = []

    lines.append("=" * 72)
    lines.append("分段税率逆向试算报告")
    lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"计算基准日: {ref}")
    lines.append("=" * 72)

    lines.append("")
    lines.append("【一、输入概览】")
    lines.append(f"  税后金额: {post_tax:,.2f}")
    lines.append(f"  扣除项合计: {merge_result.total_deduction:,.2f}")
    lines.append(f"  税率表: [{table.id}] {table.name} "
                 f"(有效期 {table.valid_from} ~ {table.valid_to or '无限制'})")

    lines.append("")
    lines.append("【二、扣除项明细】")
    for name, it in merge_result.merged.items():
        lines.append(f"  {name}: {it.amount:,.2f}  {it.location}")
    if merge_result.has_conflict:
        lines.append("")
        lines.append("  ⚠ 扣除项冲突（未自动合并，需人工确认）:")
        for c in merge_result.conflicts:
            for detail_line in c.describe().split("\n"):
                lines.append(f"  {detail_line}")
    if merge_result.has_negative:
        lines.append("")
        lines.append("  ⚠ 负值扣除:")
        for w in merge_result.negative_warnings:
            lines.append(f"  {w}")

    lines.append("")
    lines.append("【三、逆向试算过程】")
    for i, trial in enumerate(reverse_result.trials, 1):
        lines.append(f"  第{i}档试算:")
        for tl in trial.explain().split("\n"):
            lines.append(f"    {tl}")

    lines.append("")
    lines.append("【四、试算结果】")
    winner = reverse_result.winning_trial()
    if winner:
        lines.append(f"  税前收入: {reverse_result.pretax:,.2f}")
        lines.append(f"  应纳税所得额: {reverse_result.taxable:,.2f}")
        lines.append(f"  适用税率: {winner.bracket.rate * 100:.0f}%")
        lines.append(f"  速算扣除数: {winner.bracket.quick_deduction:,.2f}")
        lines.append(f"  应纳税额: {reverse_result.tax:,.2f}")
        lines.append(f"  税后金额: {post_tax:,.2f}")
        lines.append(f"  命中档位: {winner.bracket.label}")
    else:
        lines.append("  ✘ 未能找到匹配档位，请检查输入或税率表")

    lines.append("")
    lines.append("【五、档位边界解释口径】")
    for exp in reverse_result.boundary_explanations:
        lines.append(f"  {exp}")

    lines.append("")
    lines.append("【六、校验与异常】")
    if validation.issues:
        for issue in validation.issues:
            lines.append(f"  {issue}")
    else:
        lines.append("  无异常")

    lines.append("")
    lines.append("─" * 72)
    lines.append("说明: 本报告档位解释、异常隔离均基于同一套税率表来源，"
                 "可直接转发相关同事复核。")
    lines.append("如有扣除项冲突，请先与数据提供方确认后再重新试算。")
    lines.append("月底复盘时可直接导出本报告归档。")
    lines.append("─" * 72)

    return "\n".join(lines)
