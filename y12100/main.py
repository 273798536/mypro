from __future__ import annotations

from datetime import date
from tax_bracket import TaxTable, default_cn_annual_table, BracketRow
from deduction_merger import DeductionItem, merge_deductions
from reverse_calculator import reverse_calculate
from validator import validate
from report import generate_report


def demo_normal():
    print("=" * 72)
    print("场景1: 正常逆向试算")
    print("=" * 72)
    table = default_cn_annual_table(as_of=date(2024, 6, 1))

    source_a = [
        DeductionItem("基本减除费用", 60000, "HR-A", category="standard", row_index=3),
        DeductionItem("专项扣除-社保", 24000, "HR-A", category="social", row_index=5),
    ]
    source_b = [
        DeductionItem("专项附加扣除-子女教育", 12000, "HR-B", category="special", row_index=1),
        DeductionItem("专项附加扣除-住房贷款", 12000, "HR-B", category="special", row_index=2),
    ]

    merge_result = merge_deductions({"HR-A": source_a, "HR-B": source_b})
    post_tax = 150000.0

    validation = validate([table], merge_result, as_of=date(2024, 6, 1))
    reverse_result = reverse_calculate(post_tax, merge_result.total_deduction, table)

    report_text = generate_report(
        post_tax, table, merge_result, reverse_result, validation,
        as_of=date(2024, 6, 1),
    )
    print(report_text)
    print()


def demo_conflict():
    print("=" * 72)
    print("场景2: 扣除项冲突 + 负值扣除 + 税率表过期")
    print("=" * 72)

    table = TaxTable(
        id="CN-ANNUAL-2023",
        name="中国综合所得年度税率表(旧)",
        brackets=[
            BracketRow(0, 36000, 0.03, 0, label="第1档 0~36000"),
            BracketRow(36000, 144000, 0.10, 2520, label="第2档 36000~144000"),
            BracketRow(144000, 300000, 0.20, 16920, label="第3档 144000~300000"),
            BracketRow(300000, 420000, 0.25, 31920, label="第4档 300000~420000"),
            BracketRow(420000, 660000, 0.30, 52920, label="第5档 420000~660000"),
            BracketRow(660000, 960000, 0.35, 85920, label="第6档 660000~960000"),
            BracketRow(960000, None, 0.45, 181920, label="第7档 960000以上"),
        ],
        valid_from=date(2023, 1, 1),
        valid_to=date(2023, 12, 31),
        source="国家税务总局(旧表)",
    )

    source_a = [
        DeductionItem("基本减除费用", 60000, "HR-A", row_index=3),
        DeductionItem("专项扣除-社保", 24000, "HR-A", row_index=5),
    ]
    source_b = [
        DeductionItem("专项扣除-社保", 28000, "HR-B", row_index=5),
        DeductionItem("专项附加扣除-子女教育", 12000, "HR-B", row_index=1),
        DeductionItem("其他扣除", -3000, "HR-B", category="other", row_index=8),
    ]

    merge_result = merge_deductions({"HR-A": source_a, "HR-B": source_b})
    post_tax = 200000.0

    validation = validate([table], merge_result, as_of=date(2024, 6, 1))
    effective_deduction = sum(
        it.amount for name, it in merge_result.merged.items()
    )
    reverse_result = reverse_calculate(post_tax, effective_deduction, table)

    report_text = generate_report(
        post_tax, table, merge_result, reverse_result, validation,
        as_of=date(2024, 6, 1),
    )
    print(report_text)
    print()
    print(">>> 注意: 冲突项「专项扣除-社保」未参与试算合计，"
          "负值「其他扣除」已标记，税率表已过期。")
    print(">>> 以上异常均在报告第六节中定位到具体记录，不会悄悄忽略。")
    print()


def demo_boundary_cross():
    print("=" * 72)
    print("场景3: 税前恰好在档位边界附近 — 验证边界拦截")
    print("=" * 72)

    table = default_cn_annual_table(as_of=date(2024, 6, 1))

    source_a = [
        DeductionItem("基本减除费用", 60000, "HR-A", row_index=1),
    ]
    merge_result = merge_deductions({"HR-A": source_a})

    test_post_tax_values = [70000, 130000, 250000, 500000]
    for pt in test_post_tax_values:
        validation = validate([table], merge_result, as_of=date(2024, 6, 1))
        reverse_result = reverse_calculate(pt, merge_result.total_deduction, table)
        winner = reverse_result.winning_trial()
        if winner:
            print(f"  税后={pt:>10,.2f} → 税前={reverse_result.pretax:>10,.2f}  "
                  f"档位={winner.bracket.label}")
            for trial in reverse_result.trials:
                if not trial.matched:
                    print(f"    被拦截: {trial.bracket.label} — {trial.reject_reason}")
        else:
            print(f"  税后={pt:>10,.2f} → 未命中任何档位")
    print()


if __name__ == "__main__":
    demo_normal()
    demo_conflict()
    demo_boundary_cross()
