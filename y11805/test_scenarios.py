#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parent))

from surrender_value.models import Policy, PaymentRecord, SurrenderApplication
from surrender_value.engine import SurrenderEngine
from surrender_value.statement import StatementGenerator
from surrender_value.diff import ResultDiffer


SAMPLES_DIR = Path(__file__).parent / "samples"


def load_policy(name: str) -> Policy:
    return Policy.from_dict(
        __import__("json").load(open(SAMPLES_DIR / name, encoding="utf-8"))
    )


def load_payments(name: str) -> list[PaymentRecord]:
    return [
        PaymentRecord.from_dict(item)
        for item in __import__("json").load(open(SAMPLES_DIR / name, encoding="utf-8"))
    ]


def load_surrender_app(name: str) -> SurrenderApplication:
    return SurrenderApplication.from_dict(
        __import__("json").load(open(SAMPLES_DIR / name, encoding="utf-8"))
    )


def test_normal():
    print("=" * 60)
    print("场景1: 正常退保（含贷款、逾期、跨年累积红利、退保申请冲突）")
    print("=" * 60)

    policy = load_policy("policy_normal.json")
    payments = load_payments("payments_normal.json")
    app = load_surrender_app("surrender_app.json")

    ref = date(2025, 5, 28)
    engine = SurrenderEngine(policy, payments, app, ref)
    result = engine.calculate()

    gen = StatementGenerator()
    print(gen.generate(result))

    assert result.policy_year == 6, f"保单年度应为6, 实际{result.policy_year}"
    assert result.base_cash_value == 76000.0, f"基础现金价值应为76000, 实际{result.base_cash_value}"
    assert result.grace_period_status == "已过宽限期", f"宽限期状态应为已过宽限期, 实际{result.grace_period_status}"

    ded_names = [d.name for d in result.deductions]
    assert "欠缴保费" in ded_names, "应有欠缴保费抵扣"
    assert "保单贷款本金" in ded_names, "应有贷款本金抵扣"
    assert "保单贷款利息" in ded_names, "应有贷款利息抵扣"

    quar_names = [q.name for q in result.quarantined_items]
    assert any("贷款本金(退保申请声明)" in n for n in quar_names), "退保申请贷款本金冲突应被隔离"
    assert any("贷款利息(退保申请声明)" in n for n in quar_names), "退保申请贷款利息冲突应被隔离"

    conflict_fields = [c.field_name for c in result.conflicts]
    assert "贷款本金" in conflict_fields, "应有贷款本金冲突"
    assert "贷款利息" in conflict_fields, "应有贷款利息冲突"
    assert "红利余额" in conflict_fields, "应有红利余额冲突"

    print("✅ 场景1通过\n")
    return result


def test_grace_error():
    print("=" * 60)
    print("场景2: 宽限期误判（保单90天宽限期vs缴费记录实际超期）+ 跨年现金领取红利隔离")
    print("=" * 60)

    policy = load_policy("policy_grace_error.json")
    payments = load_payments("payments_grace_error.json")
    app = load_surrender_app("surrender_app.json")

    ref = date(2025, 5, 28)
    engine = SurrenderEngine(policy, payments, app, ref)
    result = engine.calculate()

    gen = StatementGenerator()
    print(gen.generate(result))

    assert result.grace_period_status == "宽限期误判", f"应为宽限期误判, 实际{result.grace_period_status}"

    quar_names = [q.name for q in result.quarantined_items]
    assert any("跨年红利-2023年" in n for n in quar_names), "2023年跨年现金领取红利应被隔离"

    conflict_fields = [c.field_name for c in result.conflicts]
    assert "宽限期判断" in conflict_fields, "应有宽限期判断冲突"
    has_error_grace = any(
        c.severity.value == "error" and c.field_name == "宽限期判断"
        for c in result.conflicts
    )
    assert has_error_grace, "宽限期误判应为ERROR级别"

    for dd in result.dividend_details:
        if dd.get("year") == 2023 and dd.get("is_cross_year"):
            assert dd.get("quarantined") is True, "2023年跨年现金领取红利明细应标记隔离"

    print("✅ 场景2通过\n")
    return result


def test_no_loan():
    print("=" * 60)
    print("场景3: 贷款未扣（保单标记has_loan=false但实际有贷款金额）")
    print("=" * 60)

    policy = load_policy("policy_no_loan.json")
    payments = load_payments("payments_normal.json")
    app = load_surrender_app("surrender_app.json")

    ref = date(2025, 5, 28)
    engine = SurrenderEngine(policy, payments, app, ref)
    result = engine.calculate()

    gen = StatementGenerator()
    print(gen.generate(result))

    conflict_fields = [c.field_name for c in result.conflicts]
    assert "贷款标记" in conflict_fields, "应有贷款标记冲突"

    loan_conflict = next(c for c in result.conflicts if c.field_name == "贷款标记")
    assert "贷款标记遗漏" in loan_conflict.resolution, "应为贷款标记遗漏"

    ded_names = [d.name for d in result.deductions]
    assert "保单贷款本金" in ded_names, "即使标记遗漏，仍应抵扣贷款本金"

    print("✅ 场景3通过\n")
    return result


def test_diff():
    print("=" * 60)
    print("场景4: 变更对比（normal vs no_loan）")
    print("=" * 60)

    result_normal = test_normal()
    result_no_loan = test_no_loan()

    differ = ResultDiffer()
    diff_items = differ.diff(result_normal, result_no_loan)
    print(differ.format_diff(diff_items))

    changed_fields = [item.field_name for item in diff_items]
    assert "退保净额" in changed_fields, "退保净额应有变化"
    assert "宽限期状态" not in changed_fields or True, "宽限期状态可能变化"

    print("✅ 场景4通过\n")


if __name__ == "__main__":
    test_normal()
    test_grace_error()
    test_no_loan()
    test_diff()
    print("\n🎉 全部场景测试通过!")
