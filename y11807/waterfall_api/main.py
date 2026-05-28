import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from database import get_conn, init_db
from models import (
    ImportPayload, ImportResult, DistributionCreate, AdvanceRequest,
    DisputeNoteIn, ConfirmationResolve,
    DistributionSummary, WaterfallStepOut, DistributionDetailOut,
    PendingConfirmationOut, DisputeNoteOut, ExportRow, ExportResult,
    InvestorOut, PendingConfirmationOut as PendingOut,
)
from waterfall import (
    calculate_waterfall,
    detect_hurdle_cross_tier, detect_co_invest_issues, detect_batch_distribution,
    REASON_HURDLE_CROSS_TIER, REASON_CO_INVEST_DISCOUNT, REASON_BATCH_DISTRIBUTION,
)

app = FastAPI(title="私募投资人分配瀑布 API", version="1.0.0")

DB_PATH = Path(__file__).parent / "waterfall.db"


@app.on_event("startup")
def startup():
    if not DB_PATH.exists():
        init_db()
    else:
        init_db()


@app.get("/")
def root():
    return {"service": "私募投资人分配瀑布 API", "version": "1.0.0", "status": "running"}


@app.post("/import", response_model=ImportResult)
def import_data(payload: ImportPayload):
    conn = get_conn()
    try:
        cur = conn.execute(
            "INSERT INTO funds (name, total_commitment) VALUES (?, ?)",
            (payload.fund_name, payload.total_commitment),
        )
        fund_id = cur.lastrowid

        rule_tiers_json = json.dumps([t.model_dump() for t in payload.rule.hurdle_tiers])
        cur = conn.execute(
            """INSERT INTO distribution_rules
            (fund_id, version, effective_date, preferred_return_rate, catch_up_rate,
             carried_interest_rate, residual_split_gp, residual_split_lp, hurdle_tiers)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)""",
            (fund_id, payload.rule.effective_date, payload.rule.preferred_return_rate,
             payload.rule.catch_up_rate, payload.rule.carried_interest_rate,
             payload.rule.residual_split_gp, payload.rule.residual_split_lp, rule_tiers_json),
        )
        rule_id = cur.lastrowid

        investor_ids = []
        investor_name_map = {}
        for inv in payload.investors:
            cur = conn.execute(
                "INSERT INTO investors (fund_id, name, share_percentage, commitment_amount, investor_type) VALUES (?, ?, ?, ?, ?)",
                (fund_id, inv.name, inv.share_percentage, inv.commitment_amount, inv.investor_type),
            )
            iid = cur.lastrowid
            investor_ids.append(iid)
            investor_name_map[inv.name] = iid

        co_investment_ids = []
        for ci in payload.co_investments:
            iid = investor_name_map.get(ci.investor_name)
            if iid is None:
                continue
            cur = conn.execute(
                "INSERT INTO co_investments (investor_id, fund_id, co_invest_amount, discount_rate, batch_number, status) VALUES (?, ?, ?, ?, ?, 'active')",
                (iid, fund_id, ci.co_invest_amount, ci.discount_rate, ci.batch_number),
            )
            co_investment_ids.append(cur.lastrowid)

        conn.commit()

        pending_confirmations = []
        for iid in investor_ids:
            cross_tier = detect_hurdle_cross_tier(iid, rule_id, conn)
            for ct in cross_tier:
                inv_row = conn.execute("SELECT name FROM investors WHERE id = ?", (iid,)).fetchone()
                detail = f"投资人{inv_row['name']}的累计回报率{ct['current_rate']}处于门槛跨档区间[{ct['lower_threshold']}, {ct['upper_threshold']}), 从'{ct['lower_tier']}'跨至'{ct['upper_tier']}'"
                next_action = "请确认是否按跨档后门槛计算分配，或维持当前档位"
                cur = conn.execute(
                    "INSERT INTO pending_confirmations (distribution_id, investor_id, reason_type, reason_detail, status, next_action) VALUES (0, ?, ?, ?, 'pending', ?)",
                    (iid, REASON_HURDLE_CROSS_TIER, detail, next_action),
                )
                pending_confirmations.append(PendingConfirmationOut(
                    id=cur.lastrowid, investor_id=iid, investor_name=inv_row["name"],
                    reason_type=REASON_HURDLE_CROSS_TIER, reason_detail=detail,
                    status="pending", next_action=next_action,
                ))

            co_issues = detect_co_invest_issues(iid, conn)
            for ci_issue in co_issues:
                inv_row = conn.execute("SELECT name FROM investors WHERE id = ?", (iid,)).fetchone()
                detail = f"投资人{inv_row['name']}存在跟投折扣率{ci_issue['discount_rate']}，跟投金额{ci_issue['co_invest_amount']}"
                next_action = "请确认跟投折扣在本次分配中是否适用"
                cur = conn.execute(
                    "INSERT INTO pending_confirmations (distribution_id, investor_id, reason_type, reason_detail, status, next_action) VALUES (0, ?, ?, ?, 'pending', ?)",
                    (iid, REASON_CO_INVEST_DISCOUNT, detail, next_action),
                )
                pending_confirmations.append(PendingConfirmationOut(
                    id=cur.lastrowid, investor_id=iid, investor_name=inv_row["name"],
                    reason_type=REASON_CO_INVEST_DISCOUNT, reason_detail=detail,
                    status="pending", next_action=next_action,
                ))

            batch_issues = detect_batch_distribution(iid, conn)
            for bi in batch_issues:
                inv_row = conn.execute("SELECT name FROM investors WHERE id = ?", (iid,)).fetchone()
                detail = f"投资人{inv_row['name']}存在第{bi['batch_number']}批跟投回款，金额{bi['co_invest_amount']}"
                next_action = "请确认本批次回款是否参与本次分配"
                cur = conn.execute(
                    "INSERT INTO pending_confirmations (distribution_id, investor_id, reason_type, reason_detail, status, next_action) VALUES (0, ?, ?, ?, 'pending', ?)",
                    (iid, REASON_BATCH_DISTRIBUTION, detail, next_action),
                )
                pending_confirmations.append(PendingConfirmationOut(
                    id=cur.lastrowid, investor_id=iid, investor_name=inv_row["name"],
                    reason_type=REASON_BATCH_DISTRIBUTION, reason_detail=detail,
                    status="pending", next_action=next_action,
                ))

        conn.commit()
        return ImportResult(
            fund_id=fund_id, rule_id=rule_id,
            investor_ids=investor_ids, co_investment_ids=co_investment_ids,
            pending_confirmations=pending_confirmations,
        )
    finally:
        conn.close()


@app.post("/distributions", response_model=DistributionSummary)
def create_distribution(payload: DistributionCreate):
    conn = get_conn()
    try:
        fund = conn.execute("SELECT * FROM funds WHERE id = ?", (payload.fund_id,)).fetchone()
        if not fund:
            raise HTTPException(404, "基金不存在")
        rule = conn.execute("SELECT * FROM distribution_rules WHERE id = ?", (payload.rule_id,)).fetchone()
        if not rule:
            raise HTTPException(404, "分配规则不存在")

        cur = conn.execute(
            "INSERT INTO distributions (fund_id, rule_id, total_amount, status) VALUES (?, ?, ?, 'draft')",
            (payload.fund_id, payload.rule_id, payload.total_amount),
        )
        dist_id = cur.lastrowid
        conn.commit()

        result = calculate_waterfall(dist_id, conn)

        for iid in result.get("hurdle_blocked_investors", []):
            inv_row = conn.execute("SELECT name FROM investors WHERE id = ?", (iid,)).fetchone()
            cross_tier = detect_hurdle_cross_tier(iid, payload.rule_id, conn)
            for ct in cross_tier:
                detail = f"投资人{inv_row['name']}的累计回报率{ct['current_rate']}处于门槛跨档区间，分配已被拦截"
                next_action = "确认跨档后可推进，或调整分配金额使回报率维持在当前档位"
                existing = conn.execute(
                    "SELECT id FROM pending_confirmations WHERE distribution_id = ? AND investor_id = ? AND reason_type = ? AND status = 'pending'",
                    (dist_id, iid, REASON_HURDLE_CROSS_TIER),
                ).fetchone()
                if not existing:
                    conn.execute(
                        "INSERT INTO pending_confirmations (distribution_id, investor_id, reason_type, reason_detail, status, next_action) VALUES (?, ?, ?, ?, 'pending', ?)",
                        (dist_id, iid, REASON_HURDLE_CROSS_TIER, detail, next_action),
                    )

        investors_list = conn.execute("SELECT * FROM investors WHERE fund_id = ?", (payload.fund_id,)).fetchall()
        for inv in investors_list:
            co_issues = detect_co_invest_issues(inv["id"], conn)
            for ci_issue in co_issues:
                detail = f"投资人{inv['name']}存在跟投折扣率{ci_issue['discount_rate']}"
                next_action = "请确认跟投折扣在本次分配中是否适用"
                existing = conn.execute(
                    "SELECT id FROM pending_confirmations WHERE distribution_id = ? AND investor_id = ? AND reason_type = ? AND status = 'pending'",
                    (dist_id, inv["id"], REASON_CO_INVEST_DISCOUNT),
                ).fetchone()
                if not existing:
                    conn.execute(
                        "INSERT INTO pending_confirmations (distribution_id, investor_id, reason_type, reason_detail, status, next_action) VALUES (?, ?, ?, ?, 'pending', ?)",
                        (dist_id, inv["id"], REASON_CO_INVEST_DISCOUNT, detail, next_action),
                    )

            batch_issues = detect_batch_distribution(inv["id"], conn)
            for bi in batch_issues:
                detail = f"投资人{inv['name']}存在第{bi['batch_number']}批跟投回款"
                next_action = "请确认本批次回款是否参与本次分配"
                existing = conn.execute(
                    "SELECT id FROM pending_confirmations WHERE distribution_id = ? AND investor_id = ? AND reason_type = ? AND status = 'pending'",
                    (dist_id, inv["id"], REASON_BATCH_DISTRIBUTION),
                ).fetchone()
                if not existing:
                    conn.execute(
                        "INSERT INTO pending_confirmations (distribution_id, investor_id, reason_type, reason_detail, status, next_action) VALUES (?, ?, ?, ?, 'pending', ?)",
                        (dist_id, inv["id"], REASON_BATCH_DISTRIBUTION, detail, next_action),
                    )

        conn.commit()
        return _build_summary(dist_id, conn)
    finally:
        conn.close()


@app.post("/distributions/{dist_id}/advance")
def advance_distribution(dist_id: int, req: AdvanceRequest):
    conn = get_conn()
    try:
        dist = conn.execute("SELECT * FROM distributions WHERE id = ?", (dist_id,)).fetchone()
        if not dist:
            raise HTTPException(404, "分配记录不存在")

        if dist["status"] == "completed":
            raise HTTPException(400, "分配已完成，无法继续推进")

        hurdle_pending = conn.execute(
            "SELECT COUNT(*) as cnt FROM pending_confirmations WHERE distribution_id = ? AND reason_type = ? AND status = 'pending'",
            (dist_id, REASON_HURDLE_CROSS_TIER),
        ).fetchone()

        if hurdle_pending["cnt"] > 0:
            if not req.confirmation_ids:
                raise HTTPException(
                    400,
                    f"存在{hurdle_pending['cnt']}条门槛跨档待确认项，必须先确认或拒绝后才能推进。请传入confirmation_ids明确处理意向。",
                )

            for cid in req.confirmation_ids:
                pc = conn.execute("SELECT * FROM pending_confirmations WHERE id = ? AND distribution_id = ?", (cid, dist_id)).fetchone()
                if not pc:
                    continue
                if req.confirm_action == "approve":
                    conn.execute(
                        "UPDATE pending_confirmations SET status = 'approved', resolved_at = datetime('now') WHERE id = ?",
                        (cid,),
                    )
                elif req.confirm_action == "reject":
                    conn.execute(
                        "UPDATE pending_confirmations SET status = 'rejected', resolved_at = datetime('now') WHERE id = ?",
                        (cid,),
                    )
                else:
                    raise HTTPException(400, "confirm_action 必须为 approve 或 reject")

            conn.commit()
            calculate_waterfall(dist_id, conn)

        new_status = dist["status"]
        if dist["status"] == "draft":
            new_status = "confirmed"
        elif dist["status"] == "confirmed":
            still_pending = conn.execute(
                "SELECT COUNT(*) as cnt FROM pending_confirmations WHERE distribution_id = ? AND reason_type = ? AND status = 'pending'",
                (dist_id, REASON_HURDLE_CROSS_TIER),
            ).fetchone()
            if still_pending["cnt"] > 0:
                raise HTTPException(400, "仍有门槛跨档待确认项未处理，无法完成分配")
            new_status = "completed"

        conn.execute(
            "UPDATE distributions SET status = ?, updated_at = datetime('now') WHERE id = ?",
            (new_status, dist_id),
        )
        conn.commit()
        return {"distribution_id": dist_id, "previous_status": dist["status"], "current_status": new_status}
    finally:
        conn.close()


@app.get("/distributions/{dist_id}/details", response_model=DistributionSummary)
def get_distribution_details(dist_id: int):
    conn = get_conn()
    try:
        dist = conn.execute("SELECT * FROM distributions WHERE id = ?", (dist_id,)).fetchone()
        if not dist:
            raise HTTPException(404, "分配记录不存在")
        return _build_summary(dist_id, conn)
    finally:
        conn.close()


@app.get("/distributions", response_model=list)
def list_distributions(fund_id: int = None, status: str = None):
    conn = get_conn()
    try:
        query = """
            SELECT d.id, d.fund_id, f.name as fund_name, d.rule_id, r.version as rule_version,
                   d.total_amount, d.status, d.created_at, d.updated_at
            FROM distributions d
            JOIN funds f ON d.fund_id = f.id
            JOIN distribution_rules r ON d.rule_id = r.id
            WHERE 1=1
        """
        params = []
        if fund_id:
            query += " AND d.fund_id = ?"
            params.append(fund_id)
        if status:
            query += " AND d.status = ?"
            params.append(status)
        query += " ORDER BY d.created_at DESC"
        rows = conn.execute(query, params).fetchall()
        result = []
        for r in rows:
            hurdle_pending = conn.execute(
                "SELECT COUNT(*) as cnt FROM pending_confirmations WHERE distribution_id = ? AND reason_type = ? AND status = 'pending'",
                (r["id"], REASON_HURDLE_CROSS_TIER),
            ).fetchone()
            result.append({
                "id": r["id"],
                "fund_id": r["fund_id"],
                "fund_name": r["fund_name"],
                "rule_id": r["rule_id"],
                "rule_version": r["rule_version"],
                "total_amount": r["total_amount"],
                "status": r["status"],
                "hurdle_cross_tier_blocked": hurdle_pending["cnt"] > 0,
                "pending_confirmation_count": hurdle_pending["cnt"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            })
        return result
    finally:
        conn.close()


@app.post("/distributions/{dist_id}/dispute", response_model=DisputeNoteOut)
def add_dispute_note(dist_id: int, note: DisputeNoteIn):
    conn = get_conn()
    try:
        dist = conn.execute("SELECT * FROM distributions WHERE id = ?", (dist_id,)).fetchone()
        if not dist:
            raise HTTPException(404, "分配记录不存在")
        cur = conn.execute(
            "INSERT INTO dispute_notes (distribution_id, investor_id, note, created_by) VALUES (?, ?, ?, ?)",
            (dist_id, note.investor_id, note.note, note.created_by),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM dispute_notes WHERE id = ?", (cur.lastrowid,)).fetchone()
        return DisputeNoteOut(
            id=row["id"], investor_id=row["investor_id"],
            note=row["note"], created_by=row["created_by"], created_at=row["created_at"],
        )
    finally:
        conn.close()


@app.get("/distributions/{dist_id}/export", response_model=ExportResult)
def export_distribution(dist_id: int):
    conn = get_conn()
    try:
        dist = conn.execute("SELECT * FROM distributions WHERE id = ?", (dist_id,)).fetchone()
        if not dist:
            raise HTTPException(404, "分配记录不存在")
        fund = conn.execute("SELECT * FROM funds WHERE id = ?", (dist["fund_id"],)).fetchone()
        rule = conn.execute("SELECT * FROM distribution_rules WHERE id = ?", (dist["rule_id"],)).fetchone()

        hurdle_pending = conn.execute(
            "SELECT * FROM pending_confirmations WHERE distribution_id = ? AND reason_type = ?",
            (dist_id, REASON_HURDLE_CROSS_TIER),
        ).fetchall()
        hurdle_intercepted = any(p["status"] == "pending" for p in hurdle_pending)

        steps = conn.execute(
            "SELECT * FROM waterfall_steps WHERE distribution_id = ? ORDER BY step_order",
            (dist_id,),
        ).fetchall()
        details = conn.execute(
            "SELECT dd.*, ws.step_type, i.name as investor_name FROM distribution_details dd JOIN waterfall_steps ws ON dd.waterfall_step_id = ws.id JOIN investors i ON dd.investor_id = i.id WHERE dd.distribution_id = ?",
            (dist_id,),
        ).fetchall()

        pending_map = {}
        pending_rows = conn.execute(
            "SELECT pc.*, i.name as investor_name FROM pending_confirmations pc JOIN investors i ON pc.investor_id = i.id WHERE pc.distribution_id = ?",
            (dist_id,),
        ).fetchall()
        for p in pending_rows:
            pending_map.setdefault(p["investor_id"], []).append(p)

        rows = []
        for d in details:
            inv_id = d["investor_id"]
            inv_pendings = pending_map.get(inv_id, [])
            pending_reason = None
            if inv_pendings:
                reasons = [f"{p['reason_type']}({p['status']})" for p in inv_pendings]
                pending_reason = "; ".join(reasons)

            rows.append(ExportRow(
                investor_name=d["investor_name"],
                step_type=d["step_type"] if "step_type" in d.keys() else "",
                amount=d["amount"],
                percentage=d["percentage"],
                is_co_invest=bool(d["is_co_invest"]),
                hurdle_cross_tier_blocked=any(
                    p["reason_type"] == REASON_HURDLE_CROSS_TIER and p["status"] == "pending"
                    for p in inv_pendings
                ),
                pending_reason=pending_reason,
            ))

        return ExportResult(
            distribution_id=dist_id,
            fund_name=fund["name"],
            rule_version=rule["version"],
            total_amount=dist["total_amount"],
            status=dist["status"],
            hurdle_cross_tier_intercepted=hurdle_intercepted,
            rows=rows,
        )
    finally:
        conn.close()


@app.get("/funds/{fund_id}/investors", response_model=list[InvestorOut])
def list_investors(fund_id: int):
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM investors WHERE fund_id = ?", (fund_id,)).fetchall()
        return [InvestorOut(
            id=r["id"], name=r["name"],
            share_percentage=r["share_percentage"],
            commitment_amount=r["commitment_amount"],
            investor_type=r["investor_type"],
        ) for r in rows]
    finally:
        conn.close()


@app.get("/funds/{fund_id}/rules", response_model=list)
def list_rules(fund_id: int):
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM distribution_rules WHERE fund_id = ? ORDER BY version", (fund_id,)).fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r["id"], "version": r["version"],
                "effective_date": r["effective_date"],
                "preferred_return_rate": r["preferred_return_rate"],
                "catch_up_rate": r["catch_up_rate"],
                "carried_interest_rate": r["carried_interest_rate"],
                "residual_split_gp": r["residual_split_gp"],
                "residual_split_lp": r["residual_split_lp"],
                "hurdle_tiers": json.loads(r["hurdle_tiers"]),
                "is_active": bool(r["is_active"]),
            })
        return result
    finally:
        conn.close()


@app.post("/funds/{fund_id}/rules", response_model=dict)
def create_rule_version(fund_id: int, payload: dict):
    conn = get_conn()
    try:
        latest = conn.execute(
            "SELECT * FROM distribution_rules WHERE fund_id = ? ORDER BY version DESC LIMIT 1",
            (fund_id,),
        ).fetchone()
        new_version = (latest["version"] + 1) if latest else 1

        if latest:
            conn.execute(
                "INSERT INTO rule_change_log (rule_id, from_version, to_version, change_detail, changed_by) VALUES (?, ?, ?, ?, ?)",
                (latest["id"], latest["version"], new_version,
                 json.dumps(payload, ensure_ascii=False), "fund_secretary"),
            )

        tiers_json = json.dumps(payload.get("hurdle_tiers", []))
        cur = conn.execute(
            """INSERT INTO distribution_rules
            (fund_id, version, effective_date, preferred_return_rate, catch_up_rate,
             carried_interest_rate, residual_split_gp, residual_split_lp, hurdle_tiers, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)""",
            (fund_id, new_version, payload.get("effective_date", "2026-01-01"),
             payload.get("preferred_return_rate", 0.08), payload.get("catch_up_rate", 1.0),
             payload.get("carried_interest_rate", 0.20), payload.get("residual_split_gp", 0.20),
             payload.get("residual_split_lp", 0.80), tiers_json),
        )
        if latest:
            conn.execute("UPDATE distribution_rules SET is_active = 0 WHERE id = ?", (latest["id"],))
        conn.commit()
        return {"rule_id": cur.lastrowid, "version": new_version}
    finally:
        conn.close()


@app.get("/pending-confirmations", response_model=list[PendingConfirmationOut])
def list_pending_confirmations(fund_id: int = None, status: str = None):
    conn = get_conn()
    try:
        query = """
            SELECT pc.*, i.name as investor_name
            FROM pending_confirmations pc
            JOIN investors i ON pc.investor_id = i.id
            WHERE 1=1
        """
        params = []
        if fund_id:
            query += " AND i.fund_id = ?"
            params.append(fund_id)
        if status:
            query += " AND pc.status = ?"
            params.append(status)
        query += " ORDER BY pc.created_at DESC"
        rows = conn.execute(query, params).fetchall()
        return [PendingConfirmationOut(
            id=r["id"], investor_id=r["investor_id"], investor_name=r["investor_name"],
            reason_type=r["reason_type"], reason_detail=r["reason_detail"],
            status=r["status"], next_action=r["next_action"],
        ) for r in rows]
    finally:
        conn.close()


@app.patch("/pending-confirmations/{confirmation_id}", response_model=PendingConfirmationOut)
def resolve_confirmation(confirmation_id: int, payload: ConfirmationResolve):
    conn = get_conn()
    try:
        pc = conn.execute("SELECT * FROM pending_confirmations WHERE id = ?", (confirmation_id,)).fetchone()
        if not pc:
            raise HTTPException(404, "待确认项不存在")
        if payload.status not in ("approved", "rejected"):
            raise HTTPException(400, "status 必须为 approved 或 rejected")
        conn.execute(
            "UPDATE pending_confirmations SET status = ?, resolved_at = datetime('now') WHERE id = ?",
            (payload.status, confirmation_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT pc.*, i.name as investor_name FROM pending_confirmations pc JOIN investors i ON pc.investor_id = i.id WHERE pc.id = ?",
            (confirmation_id,),
        ).fetchone()
        return PendingConfirmationOut(
            id=row["id"], investor_id=row["investor_id"], investor_name=row["investor_name"],
            reason_type=row["reason_type"], reason_detail=row["reason_detail"],
            status=row["status"], next_action=row["next_action"],
        )
    finally:
        conn.close()


@app.post("/seed", response_model=dict)
def seed_sample_data():
    from seed import load_sample
    result = load_sample()
    return result


def _build_summary(dist_id: int, conn) -> DistributionSummary:
    dist = conn.execute("SELECT * FROM distributions WHERE id = ?", (dist_id,)).fetchone()
    fund = conn.execute("SELECT * FROM funds WHERE id = ?", (dist["fund_id"],)).fetchone()
    rule = conn.execute("SELECT * FROM distribution_rules WHERE id = ?", (dist["rule_id"],)).fetchone()

    steps_rows = conn.execute(
        "SELECT * FROM waterfall_steps WHERE distribution_id = ? ORDER BY step_order", (dist_id,),
    ).fetchall()
    steps = [WaterfallStepOut(
        id=r["id"], step_order=r["step_order"], step_type=r["step_type"],
        total_amount=r["total_amount"], description=r["description"],
    ) for r in steps_rows]

    details_rows = conn.execute(
        "SELECT dd.*, i.name as investor_name FROM distribution_details dd JOIN investors i ON dd.investor_id = i.id WHERE dd.distribution_id = ?",
        (dist_id,),
    ).fetchall()
    details = [DistributionDetailOut(
        investor_id=d["investor_id"], investor_name=d["investor_name"],
        step_type="", amount=d["amount"], percentage=d["percentage"],
        is_co_invest=bool(d["is_co_invest"]),
    ) for d in details_rows]

    pending_rows = conn.execute(
        "SELECT pc.*, i.name as investor_name FROM pending_confirmations pc JOIN investors i ON pc.investor_id = i.id WHERE pc.distribution_id = ?",
        (dist_id,),
    ).fetchall()
    pending = [PendingConfirmationOut(
        id=r["id"], investor_id=r["investor_id"], investor_name=r["investor_name"],
        reason_type=r["reason_type"], reason_detail=r["reason_detail"],
        status=r["status"], next_action=r["next_action"],
    ) for r in pending_rows]

    dispute_rows = conn.execute(
        "SELECT * FROM dispute_notes WHERE distribution_id = ?", (dist_id,),
    ).fetchall()
    disputes = [DisputeNoteOut(
        id=r["id"], investor_id=r["investor_id"], note=r["note"],
        created_by=r["created_by"], created_at=r["created_at"],
    ) for r in dispute_rows]

    hurdle_blocked = any(p.reason_type == REASON_HURDLE_CROSS_TIER and p.status == "pending" for p in pending)

    return DistributionSummary(
        id=dist["id"], fund_id=dist["fund_id"], fund_name=fund["name"],
        rule_id=dist["rule_id"], rule_version=rule["version"],
        total_amount=dist["total_amount"], status=dist["status"],
        hurdle_cross_tier_blocked=hurdle_blocked,
        steps=steps, details=details,
        pending_confirmations=pending, dispute_notes=disputes,
    )
