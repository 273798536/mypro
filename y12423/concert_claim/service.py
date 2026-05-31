from __future__ import annotations
import json
from typing import Optional
from concert_claim.db import get_conn, row_to_dict, snapshot_change


def get_current_clause(clause_code: str) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM policy_clauses WHERE clause_code=? AND is_current=1",
        (clause_code,)
    ).fetchone()
    conn.close()
    return row_to_dict(row)


def get_clause_version(clause_code: str, version: int) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM policy_clauses WHERE clause_code=? AND version=?",
        (clause_code, version)
    ).fetchone()
    conn.close()
    return row_to_dict(row)


def calculate_compensation(
    refund_amount: float,
    rent_amount: float,
    penalty_rate: float,
    deductible_rate: float,
    cross_city_delay: bool,
    deductible_correct: bool,
) -> dict:
    rent_penalty = rent_amount * penalty_rate
    gross_loss = refund_amount + rent_penalty

    if deductible_correct:
        deductible_amount = gross_loss * deductible_rate
    else:
        deductible_amount = 0.0

    net_compensation = gross_loss - deductible_amount
    if cross_city_delay:
        net_compensation *= 0.85

    return {
        "gross_loss": round(gross_loss, 2),
        "deductible_amount": round(deductible_amount, 2),
        "net_compensation": round(net_compensation, 2),
    }


def build_result_diff(old: dict, new: dict) -> dict:
    diff = {}
    for key in ["gross_loss", "deductible_amount", "net_compensation"]:
        old_val = old.get(key)
        new_val = new.get(key)
        if old_val != new_val:
            diff[key] = {"old": old_val, "new": new_val}
    return diff


def recalc_and_snapshot(calc_id: int, updates: dict) -> dict:
    conn = get_conn()
    old_row = conn.execute(
        "SELECT * FROM compensation_calculations WHERE id=?", (calc_id,)
    ).fetchone()
    if not old_row:
        conn.close()
        raise ValueError(f"核算记录 {calc_id} 不存在")

    old = row_to_dict(old_row)

    ticket_refund = row_to_dict(
        conn.execute("SELECT * FROM ticket_refunds WHERE id=?", (old["ticket_refund_id"],)).fetchone()
    )
    venue_contract = row_to_dict(
        conn.execute("SELECT * FROM venue_contracts WHERE id=?", (old["venue_contract_id"],)).fetchone()
    )

    clause_code = updates.get("clause_code") or old["clause_code"]
    clause = get_current_clause(clause_code)
    if not clause:
        conn.close()
        raise ValueError(f"保单条款 {clause_code} 不存在")

    cross_city_delay = updates.get("cross_city_delay", old["cross_city_delay"])
    if isinstance(cross_city_delay, int):
        cross_city_delay = bool(cross_city_delay)
    deductible_correct = updates.get("deductible_correct", old["deductible_correct"])
    if isinstance(deductible_correct, int):
        deductible_correct = bool(deductible_correct)

    calc_result = calculate_compensation(
        refund_amount=ticket_refund["refund_amount"],
        rent_amount=venue_contract["rent_amount"],
        penalty_rate=venue_contract["penalty_rate"],
        deductible_rate=clause["deductible_rate"],
        cross_city_delay=cross_city_delay,
        deductible_correct=deductible_correct,
    )

    old_calc = {
        "gross_loss": old["gross_loss"],
        "deductible_amount": old["deductible_amount"],
        "net_compensation": old["net_compensation"],
    }
    diff = build_result_diff(old_calc, calc_result)

    conn.execute(
        """UPDATE compensation_calculations SET
            clause_code=?, clause_version=?,
            gross_loss=?, deductible_amount=?, net_compensation=?,
            deductible_correct=?, cross_city_delay=?,
            cross_city_delay_reason=?, deductible_misapply_reason=?,
            old_gross_loss=?, old_deductible_amount=?, old_net_compensation=?,
            result_diff=?, updated_at=datetime('now','localtime')
        WHERE id=?""",
        (
            clause_code, clause["version"],
            calc_result["gross_loss"], calc_result["deductible_amount"], calc_result["net_compensation"],
            int(deductible_correct), int(cross_city_delay),
            updates.get("cross_city_delay_reason", old.get("cross_city_delay_reason", "")),
            updates.get("deductible_misapply_reason", old.get("deductible_misapply_reason", "")),
            old["gross_loss"], old["deductible_amount"], old["net_compensation"],
            json.dumps(diff, ensure_ascii=False),
            calc_id,
        ),
    )

    new_row = conn.execute(
        "SELECT * FROM compensation_calculations WHERE id=?", (calc_id,)
    ).fetchone()
    new = row_to_dict(new_row)

    snapshot_change(conn, "compensation_calculation", calc_id, old, new)
    conn.commit()
    conn.close()
    return new


def propagate_refund_change(refund_id: int):
    conn = get_conn()
    calcs = conn.execute(
        "SELECT id FROM compensation_calculations WHERE ticket_refund_id=?", (refund_id,)
    ).fetchall()
    conn.close()

    for calc in calcs:
        recalc_and_snapshot(calc["id"], {})


def propagate_contract_change(contract_id: int):
    conn = get_conn()
    calcs = conn.execute(
        "SELECT id FROM compensation_calculations WHERE venue_contract_id=?", (contract_id,)
    ).fetchall()
    conn.close()

    for calc in calcs:
        recalc_and_snapshot(calc["id"], {})


def generate_report(calc_id: int) -> dict:
    conn = get_conn()
    calc = row_to_dict(
        conn.execute("SELECT * FROM compensation_calculations WHERE id=?", (calc_id,)).fetchone()
    )
    if not calc:
        conn.close()
        raise ValueError(f"核算记录 {calc_id} 不存在")

    refund = row_to_dict(
        conn.execute("SELECT * FROM ticket_refunds WHERE id=?", (calc["ticket_refund_id"],)).fetchone()
    )
    contract = row_to_dict(
        conn.execute("SELECT * FROM venue_contracts WHERE id=?", (calc["venue_contract_id"],)).fetchone()
    )
    clause = get_current_clause(calc["clause_code"])
    if not clause:
        clause = get_clause_version(calc["clause_code"], calc["clause_version"])

    notes = [
        row_to_dict(r)
        for r in conn.execute(
            "SELECT * FROM dispute_notes WHERE calculation_id=? ORDER BY created_at",
            (calc_id,),
        ).fetchall()
    ]

    snapshots = [
        row_to_dict(r)
        for r in conn.execute(
            "SELECT * FROM record_snapshots WHERE entity_type='compensation_calculation' AND entity_id=? ORDER BY changed_at",
            (calc_id,),
        ).fetchall()
    ]

    cross_city_delay_affected = bool(calc["cross_city_delay"])
    deductible_misapplied = not bool(calc["deductible_correct"])

    impact_reasons = []
    if cross_city_delay_affected:
        impact_reasons.append(
            f"延期跨城影响: {calc.get('cross_city_delay_reason', '未注明')}, 净赔付金额乘以0.85系数"
        )
    if deductible_misapplied:
        impact_reasons.append(
            f"免赔错用: {calc.get('deductible_misapply_reason', '未注明')}, 免赔额已置零"
        )

    report_data = {
        "核算ID": calc_id,
        "演唱会": calc["concert_name"],
        "总损失": calc["gross_loss"],
        "免赔额": calc["deductible_amount"],
        "净赔付": calc["net_compensation"],
        "免赔是否正确适用": "是" if calc["deductible_correct"] else "否",
        "延期跨城": "是" if calc["cross_city_delay"] else "否",
        "原始票务退款": refund,
        "原始场租合同": contract,
        "适用条款": {
            "条款代码": clause["clause_code"] if clause else calc["clause_code"],
            "条款版本": clause["version"] if clause else calc["clause_version"],
            "条款内容": clause["content"] if clause else "",
            "免赔率": clause["deductible_rate"] if clause else 0,
            "跨城条款": clause["cross_city_clause"] if clause else "",
        },
        "争议备注": notes,
        "变更快照": snapshots,
        "旧结果": {
            "旧总损失": calc.get("old_gross_loss"),
            "旧免赔额": calc.get("old_deductible_amount"),
            "旧净赔付": calc.get("old_net_compensation"),
        } if calc.get("old_gross_loss") is not None else None,
        "新旧差分": calc.get("result_diff"),
        "延期跨城是否影响报告": cross_city_delay_affected,
        "免赔错用是否影响报告": deductible_misapplied,
        "影响原因": impact_reasons,
    }

    clause_version_str = f"{calc['clause_code']}@v{calc['clause_version']}"

    conn.execute(
        """INSERT INTO report_exports
            (calculation_id, report_data, cross_city_delay_affected, deductible_misapplied, impact_reasons, clause_version_at_export)
            VALUES (?, ?, ?, ?, ?, ?)""",
        (
            calc_id,
            json.dumps(report_data, ensure_ascii=False),
            int(cross_city_delay_affected),
            int(deductible_misapplied),
            json.dumps(impact_reasons, ensure_ascii=False),
            clause_version_str,
        ),
    )
    conn.commit()

    export_row = conn.execute(
        "SELECT * FROM report_exports WHERE calculation_id=? ORDER BY created_at DESC LIMIT 1",
        (calc_id,),
    ).fetchone()
    conn.close()

    return row_to_dict(export_row)
