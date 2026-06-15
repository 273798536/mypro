import json
from datetime import datetime

from db_init import get_conn
from conflict_detect import detect_tide_track_conflicts


def create_assessment(route_name, assess_date, ice_condition=None,
                      wind_wave_forecast=None, risk_level=None,
                      operator="system"):
    conn = get_conn()

    cur = conn.execute(
        "SELECT id, status FROM assessment WHERE route_name=? AND assess_date=?",
        (route_name, assess_date),
    )
    existing = cur.fetchone()
    if existing:
        conn.close()
        raise ValueError(
            f"route={route_name} date={assess_date} already exists (id={existing['id']}, status={existing['status']})"
        )

    conflict_report = detect_tide_track_conflicts()
    date_conflicts = [c for c in conflict_report["conflicts"] if c.get("date") == assess_date]
    tide_conflict_str = json.dumps(date_conflicts, ensure_ascii=False) if date_conflicts else None

    track_issue = None
    for c in date_conflicts:
        if c["type"] in ("track_jump", "tide_duplicate_batch"):
            track_issue = (track_issue or "") + f"{c['type']}: {c['detail']}; "

    conn.execute(
        "INSERT INTO assessment(route_name,assess_date,ice_condition,wind_wave_forecast,"
        "risk_level,tide_conflict,track_issue,status) VALUES(?,?,?,?,?,?,?,'pending')",
        (route_name, assess_date, ice_condition, wind_wave_forecast,
         risk_level, tide_conflict_str, track_issue),
    )
    aid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

    conn.execute(
        "INSERT INTO audit_log(assessment_id,action,field_name,old_value,new_value,operator,reason) "
        "VALUES(?,'create',NULL,NULL,?,?,?)",
        (aid, json.dumps({"route_name": route_name, "assess_date": assess_date}, ensure_ascii=False),
         operator, "initial creation"),
    )
    conn.commit()
    conn.close()
    return {"assessment_id": aid, "status": "pending", "conflicts_found": len(date_conflicts)}


def _snapshot(row):
    if row is None:
        return {}
    return {k: row[k] for k in row.keys()}


def revise_assessment(assessment_id, fields, operator="system", reason=None):
    conn = get_conn()
    cur = conn.execute("SELECT * FROM assessment WHERE id=?", (assessment_id,))
    old = cur.fetchone()
    if not old:
        conn.close()
        raise ValueError(f"assessment id={assessment_id} not found")

    old_snap = _snapshot(old)
    allowed = {"ice_condition", "wind_wave_forecast", "risk_level", "tide_conflict", "track_issue"}
    updates = {}
    for k, v in fields.items():
        if k in allowed:
            updates[k] = v

    if not updates:
        conn.close()
        return {"assessment_id": assessment_id, "changed": []}

    set_clause = ", ".join(f"{k}=?" for k in updates)
    values = list(updates.values()) + [assessment_id]
    conn.execute(f"UPDATE assessment SET {set_clause}, updated_ts=datetime('now') WHERE id=?", values)

    changed = []
    for k, new_val in updates.items():
        old_val = old_snap.get(k)
        if str(old_val) != str(new_val):
            conn.execute(
                "INSERT INTO audit_log(assessment_id,action,field_name,old_value,new_value,operator,reason) "
                "VALUES(?,'revise',?,?,?,?,?)",
                (assessment_id, k, str(old_val), str(new_val), operator, reason or "manual revision"),
            )
            changed.append({"field": k, "old": old_val, "new": new_val})

    cur2 = conn.execute("SELECT * FROM assessment WHERE id=?", (assessment_id,))
    new_snap = _snapshot(cur2.fetchone())

    conn.execute(
        "INSERT INTO audit_log(assessment_id,action,field_name,old_value,new_value,operator,reason) "
        "VALUES(?,'revise_snapshot','full',?,?,?,?)",
        (assessment_id,
         json.dumps(old_snap, ensure_ascii=False, default=str),
         json.dumps(new_snap, ensure_ascii=False, default=str),
         operator, reason or "revision snapshot"),
    )
    conn.commit()
    conn.close()
    return {"assessment_id": assessment_id, "changed": changed}


def transition_status(assessment_id, new_status, operator="system", reason=None):
    conn = get_conn()
    cur = conn.execute("SELECT id, status FROM assessment WHERE id=?", (assessment_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"assessment id={assessment_id} not found")

    old_status = row["status"]
    valid_transitions = {
        "pending": ["approved", "rejected", "revised"],
        "revised": ["approved", "rejected"],
        "approved": ["revised"],
        "rejected": ["revised"],
    }
    if new_status not in valid_transitions.get(old_status, []):
        conn.close()
        raise ValueError(f"invalid transition: {old_status} -> {new_status}")

    conn.execute(
        "UPDATE assessment SET status=?, updated_ts=datetime('now') WHERE id=?",
        (new_status, assessment_id),
    )
    conn.execute(
        "INSERT INTO audit_log(assessment_id,action,field_name,old_value,new_value,operator,reason) "
        "VALUES(?,'transition','status',?,?,?,?)",
        (assessment_id, old_status, new_status, operator, reason or f"{old_status}->{new_status}"),
    )
    conn.commit()
    conn.close()
    return {"assessment_id": assessment_id, "from": old_status, "to": new_status}


def get_assessment(assessment_id=None, route_name=None, assess_date=None, status=None):
    conn = get_conn()
    query = "SELECT * FROM assessment WHERE 1=1"
    params = []
    if assessment_id:
        query += " AND id=?"
        params.append(assessment_id)
    if route_name:
        query += " AND route_name=?"
        params.append(route_name)
    if assess_date:
        query += " AND assess_date=?"
        params.append(assess_date)
    if status:
        query += " AND status=?"
        params.append(status)
    query += " ORDER BY assess_date DESC"

    cur = conn.execute(query, params)
    results = [dict(r) for r in cur.fetchall()]
    conn.close()
    return results


def get_audit_trail(assessment_id):
    conn = get_conn()
    cur = conn.execute(
        "SELECT * FROM audit_log WHERE assessment_id=? ORDER BY created_ts",
        (assessment_id,),
    )
    results = [dict(r) for r in cur.fetchall()]
    conn.close()
    return results


def risk_stratification(risk_level=None, route_name=None, limit=50):
    conn = get_conn()
    query = "SELECT id, route_name, assess_date, risk_level, status, tide_conflict, track_issue " \
            "FROM assessment WHERE 1=1"
    params = []
    if risk_level:
        query += " AND risk_level=?"
        params.append(risk_level)
    if route_name:
        query += " AND route_name=?"
        params.append(route_name)
    query += " ORDER BY CASE risk_level " \
             "WHEN 'extreme' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, " \
             "assess_date DESC LIMIT ?"
    params.append(limit)

    cur = conn.execute(query, params)
    results = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"entry": "risk_stratification", "assessments": results}


def explain_change(assessment_id):
    trail = get_audit_trail(assessment_id)
    if not trail:
        return {"assessment_id": assessment_id, "explanation": "无修正记录"}

    explanations = []
    for entry in trail:
        action = entry["action"]
        if action == "create":
            explanations.append(f"[{entry['created_ts']}] 创建评估记录 (operator={entry['operator']})")
        elif action == "revise":
            explanations.append(
                f"[{entry['created_ts']}] 修正字段 '{entry['field_name']}': "
                f"'{entry['old_value']}' -> '{entry['new_value']}' "
                f"(operator={entry['operator']}, reason={entry['reason']})"
            )
        elif action == "transition":
            explanations.append(
                f"[{entry['created_ts']}] 状态变更 '{entry['old_value']}' -> '{entry['new_value']}' "
                f"(operator={entry['operator']}, reason={entry['reason']})"
            )
        elif action == "resolve_conflict":
            explanations.append(
                f"[{entry['created_ts']}] 冲突解决: '{entry['old_value']}' -> '{entry['new_value']}' "
                f"(operator={entry['operator']})"
            )
        elif action == "revise_snapshot":
            explanations.append(
                f"[{entry['created_ts']}] 修正快照已保存 (operator={entry['operator']})"
            )

    return {"assessment_id": assessment_id, "explanation": explanations}
