from __future__ import annotations
import json
from typing import Optional
from fastapi import FastAPI, HTTPException
from concert_claim.db import init_db, get_conn, row_to_dict, snapshot_change
from concert_claim.schemas import (
    ClauseCreate, ClauseUpdate,
    RefundCreate, RefundUpdate,
    ContractCreate, ContractUpdate,
    CalculationCreate, CalculationRecalc,
    DisputeNoteCreate, ReportExportRequest,
)
from concert_claim.service import (
    get_current_clause, calculate_compensation,
    recalc_and_snapshot, propagate_refund_change,
    propagate_contract_change, generate_report,
)

app = FastAPI(title="演唱会保险赔付核算", version="1.0.0")


@app.on_event("startup")
def startup():
    init_db()


# ── 保单条款 ──────────────────────────────────────────────

@app.post("/api/clauses")
def create_clause(body: ClauseCreate):
    conn = get_conn()
    existing = conn.execute(
        "SELECT MAX(version) as mv FROM policy_clauses WHERE clause_code=?", (body.clause_code,)
    ).fetchone()
    next_ver = (existing["mv"] or 0) + 1

    if next_ver > 1:
        conn.execute(
            "UPDATE policy_clauses SET is_current=0 WHERE clause_code=?", (body.clause_code,)
        )

    conn.execute(
        """INSERT INTO policy_clauses (clause_code, version, content, deductible_rate, cross_city_clause, effective_date)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (body.clause_code, next_ver, body.content, body.deductible_rate, body.cross_city_clause, body.effective_date),
    )
    row = conn.execute(
        "SELECT * FROM policy_clauses WHERE clause_code=? AND version=?", (body.clause_code, next_ver)
    ).fetchone()
    conn.commit()
    conn.close()
    return row_to_dict(row)


@app.get("/api/clauses/{clause_code}")
def get_clause(clause_code: str, version: Optional[int] = None):
    conn = get_conn()
    if version:
        row = conn.execute(
            "SELECT * FROM policy_clauses WHERE clause_code=? AND version=?", (clause_code, version)
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT * FROM policy_clauses WHERE clause_code=? AND is_current=1", (clause_code,)
        ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, f"条款 {clause_code} 不存在")
    return row_to_dict(row)


@app.get("/api/clauses")
def list_clauses(clause_code: Optional[str] = None):
    conn = get_conn()
    if clause_code:
        rows = conn.execute(
            "SELECT * FROM policy_clauses WHERE clause_code=? ORDER BY version", (clause_code,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM policy_clauses WHERE is_current=1 ORDER BY clause_code"
        ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.put("/api/clauses/{clause_code}")
def update_clause(clause_code: str, body: ClauseUpdate):
    conn = get_conn()
    old = conn.execute(
        "SELECT * FROM policy_clauses WHERE clause_code=? AND is_current=1", (clause_code,)
    ).fetchone()
    if not old:
        conn.close()
        raise HTTPException(404, f"条款 {clause_code} 不存在")

    old_dict = row_to_dict(old)
    new_ver = old["version"] + 1

    updates = {}
    for field in ["content", "deductible_rate", "cross_city_clause", "effective_date"]:
        val = getattr(body, field, None)
        updates[field] = val if val is not None else old_dict[field]

    conn.execute(
        "UPDATE policy_clauses SET is_current=0 WHERE clause_code=?", (clause_code,)
    )
    conn.execute(
        """INSERT INTO policy_clauses (clause_code, version, content, deductible_rate, cross_city_clause, effective_date)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (clause_code, new_ver, updates["content"], updates["deductible_rate"],
         updates["cross_city_clause"], updates["effective_date"]),
    )
    new_row = conn.execute(
        "SELECT * FROM policy_clauses WHERE clause_code=? AND version=?", (clause_code, new_ver)
    ).fetchone()
    new_dict = row_to_dict(new_row)

    snapshot_change(conn, "policy_clause", old_dict["id"], old_dict, new_dict)
    conn.commit()
    conn.close()
    return new_dict


# ── 票务退款 ──────────────────────────────────────────────

@app.post("/api/refunds")
def create_refund(body: RefundCreate):
    conn = get_conn()
    conn.execute(
        """INSERT INTO ticket_refunds (concert_name, refund_amount, refund_reason, ticket_count, clause_code)
           VALUES (?, ?, ?, ?, ?)""",
        (body.concert_name, body.refund_amount, body.refund_reason, body.ticket_count, body.clause_code),
    )
    row = conn.execute("SELECT * FROM ticket_refunds ORDER BY id DESC LIMIT 1").fetchone()
    conn.commit()
    conn.close()
    return row_to_dict(row)


@app.get("/api/refunds")
def list_refunds():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM ticket_refunds ORDER BY id").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.get("/api/refunds/{refund_id}")
def get_refund(refund_id: int):
    conn = get_conn()
    row = conn.execute("SELECT * FROM ticket_refunds WHERE id=?", (refund_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, f"票务退款 {refund_id} 不存在")
    return row_to_dict(row)


@app.put("/api/refunds/{refund_id}")
def update_refund(refund_id: int, body: RefundUpdate):
    conn = get_conn()
    old = conn.execute("SELECT * FROM ticket_refunds WHERE id=?", (refund_id,)).fetchone()
    if not old:
        conn.close()
        raise HTTPException(404, f"票务退款 {refund_id} 不存在")

    old_dict = row_to_dict(old)
    updates = {}
    for field in ["refund_amount", "refund_reason", "ticket_count", "clause_code"]:
        val = getattr(body, field, None)
        updates[field] = val if val is not None else old_dict[field]

    conn.execute(
        """UPDATE ticket_refunds SET refund_amount=?, refund_reason=?, ticket_count=?, clause_code=?,
           updated_at=datetime('now','localtime') WHERE id=?""",
        (updates["refund_amount"], updates["refund_reason"], updates["ticket_count"], updates["clause_code"], refund_id),
    )
    new_row = conn.execute("SELECT * FROM ticket_refunds WHERE id=?", (refund_id,)).fetchone()
    new_dict = row_to_dict(new_row)

    snapshot_change(conn, "ticket_refund", refund_id, old_dict, new_dict)
    conn.commit()
    conn.close()

    propagate_refund_change(refund_id)

    return row_to_dict(
        get_conn().execute("SELECT * FROM ticket_refunds WHERE id=?", (refund_id,)).fetchone()
    )


# ── 场租合同 ──────────────────────────────────────────────

@app.post("/api/contracts")
def create_contract(body: ContractCreate):
    conn = get_conn()
    conn.execute(
        """INSERT INTO venue_contracts (concert_name, venue_name, rent_amount, contract_terms, penalty_rate, clause_code)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (body.concert_name, body.venue_name, body.rent_amount, body.contract_terms, body.penalty_rate, body.clause_code),
    )
    row = conn.execute("SELECT * FROM venue_contracts ORDER BY id DESC LIMIT 1").fetchone()
    conn.commit()
    conn.close()
    return row_to_dict(row)


@app.get("/api/contracts")
def list_contracts():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM venue_contracts ORDER BY id").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.get("/api/contracts/{contract_id}")
def get_contract(contract_id: int):
    conn = get_conn()
    row = conn.execute("SELECT * FROM venue_contracts WHERE id=?", (contract_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, f"场租合同 {contract_id} 不存在")
    return row_to_dict(row)


@app.put("/api/contracts/{contract_id}")
def update_contract(contract_id: int, body: ContractUpdate):
    conn = get_conn()
    old = conn.execute("SELECT * FROM venue_contracts WHERE id=?", (contract_id,)).fetchone()
    if not old:
        conn.close()
        raise HTTPException(404, f"场租合同 {contract_id} 不存在")

    old_dict = row_to_dict(old)
    updates = {}
    for field in ["venue_name", "rent_amount", "contract_terms", "penalty_rate", "clause_code"]:
        val = getattr(body, field, None)
        updates[field] = val if val is not None else old_dict[field]

    conn.execute(
        """UPDATE venue_contracts SET venue_name=?, rent_amount=?, contract_terms=?, penalty_rate=?, clause_code=?,
           updated_at=datetime('now','localtime') WHERE id=?""",
        (updates["venue_name"], updates["rent_amount"], updates["contract_terms"],
         updates["penalty_rate"], updates["clause_code"], contract_id),
    )
    new_row = conn.execute("SELECT * FROM venue_contracts WHERE id=?", (contract_id,)).fetchone()
    new_dict = row_to_dict(new_row)

    snapshot_change(conn, "venue_contract", contract_id, old_dict, new_dict)
    conn.commit()
    conn.close()

    propagate_contract_change(contract_id)

    return row_to_dict(
        get_conn().execute("SELECT * FROM venue_contracts WHERE id=?", (contract_id,)).fetchone()
    )


# ── 赔付核算 ──────────────────────────────────────────────

@app.post("/api/calculations")
def create_calculation(body: CalculationCreate):
    conn = get_conn()
    refund = conn.execute("SELECT * FROM ticket_refunds WHERE id=?", (body.ticket_refund_id,)).fetchone()
    if not refund:
        conn.close()
        raise HTTPException(400, f"票务退款 {body.ticket_refund_id} 不存在")

    contract = conn.execute("SELECT * FROM venue_contracts WHERE id=?", (body.venue_contract_id,)).fetchone()
    if not contract:
        conn.close()
        raise HTTPException(400, f"场租合同 {body.venue_contract_id} 不存在")

    clause = get_current_clause(body.clause_code)
    if not clause:
        conn.close()
        raise HTTPException(400, f"保单条款 {body.clause_code} 不存在")

    result = calculate_compensation(
        refund_amount=refund["refund_amount"],
        rent_amount=contract["rent_amount"],
        penalty_rate=contract["penalty_rate"],
        deductible_rate=clause["deductible_rate"],
        cross_city_delay=body.cross_city_delay,
        deductible_correct=body.deductible_correct,
    )

    conn.execute(
        """INSERT INTO compensation_calculations
           (concert_name, ticket_refund_id, venue_contract_id, clause_code, clause_version,
            gross_loss, deductible_amount, net_compensation,
            deductible_correct, cross_city_delay, cross_city_delay_reason, deductible_misapply_reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            body.concert_name, body.ticket_refund_id, body.venue_contract_id,
            body.clause_code, clause["version"],
            result["gross_loss"], result["deductible_amount"], result["net_compensation"],
            int(body.deductible_correct), int(body.cross_city_delay),
            body.cross_city_delay_reason, body.deductible_misapply_reason,
        ),
    )
    row = conn.execute("SELECT * FROM compensation_calculations ORDER BY id DESC LIMIT 1").fetchone()
    conn.commit()
    conn.close()
    return row_to_dict(row)


@app.get("/api/calculations")
def list_calculations():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM compensation_calculations ORDER BY id").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.get("/api/calculations/{calc_id}")
def get_calculation(calc_id: int):
    conn = get_conn()
    row = conn.execute("SELECT * FROM compensation_calculations WHERE id=?", (calc_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, f"赔付核算 {calc_id} 不存在")
    return row_to_dict(row)


@app.put("/api/calculations/{calc_id}")
def recalc_calculation(calc_id: int, body: CalculationRecalc):
    updates = body.model_dump(exclude_none=True)
    try:
        return recalc_and_snapshot(calc_id, updates)
    except ValueError as e:
        raise HTTPException(404, str(e))


# ── 争议备注 ──────────────────────────────────────────────

@app.post("/api/disputes")
def create_dispute(body: DisputeNoteCreate):
    conn = get_conn()
    calc = conn.execute("SELECT id FROM compensation_calculations WHERE id=?", (body.calculation_id,)).fetchone()
    if not calc:
        conn.close()
        raise HTTPException(400, f"核算记录 {body.calculation_id} 不存在")

    conn.execute(
        "INSERT INTO dispute_notes (calculation_id, note_content, author) VALUES (?, ?, ?)",
        (body.calculation_id, body.note_content, body.author),
    )
    row = conn.execute("SELECT * FROM dispute_notes ORDER BY id DESC LIMIT 1").fetchone()
    conn.commit()
    conn.close()
    return row_to_dict(row)


@app.get("/api/disputes")
def list_disputes(calculation_id: Optional[int] = None):
    conn = get_conn()
    if calculation_id:
        rows = conn.execute(
            "SELECT * FROM dispute_notes WHERE calculation_id=? ORDER BY created_at", (calculation_id,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM dispute_notes ORDER BY created_at").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


# ── 报告导出 ──────────────────────────────────────────────

@app.post("/api/reports")
def export_report(body: ReportExportRequest):
    try:
        return generate_report(body.calculation_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@app.get("/api/reports")
def list_reports(calculation_id: Optional[int] = None):
    conn = get_conn()
    if calculation_id:
        rows = conn.execute(
            "SELECT * FROM report_exports WHERE calculation_id=? ORDER BY created_at DESC", (calculation_id,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM report_exports ORDER BY created_at DESC").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


# ── 变更快照查询 ──────────────────────────────────────────

@app.get("/api/snapshots")
def list_snapshots(entity_type: Optional[str] = None, entity_id: Optional[int] = None):
    conn = get_conn()
    query = "SELECT * FROM record_snapshots WHERE 1=1"
    params = []
    if entity_type:
        query += " AND entity_type=?"
        params.append(entity_type)
    if entity_id:
        query += " AND entity_id=?"
        params.append(entity_id)
    query += " ORDER BY changed_at"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.get("/api/health")
def health():
    conn = get_conn()
    tables = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()
    conn.close()
    return {"status": "ok", "tables": [t["name"] for t in tables]}
