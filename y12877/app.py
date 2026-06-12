import sqlite3
import json
import os
import csv
import io
from datetime import datetime
from flask import Flask, request, jsonify, g, render_template, send_file

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "harbor.db")

app = Flask(__name__)

VALID_STATUSES = ["imported", "reviewing", "approved", "exported"]
STATUS_LABELS = {
    "imported": "已导入",
    "reviewing": "复核中",
    "approved": "已审批",
    "exported": "已导出",
}

VALID_SALINITY_UNITS = ["PPT", "PSU", "‰"]
SALINITY_UNIT_HINT = "盐度单位混用：同一批次内检测到多种盐度单位（{units}），无法直接比较。请统一为 PPT、PSU 或 ‰ 中的一种后重新导入。"


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SCHEMA)
    conn.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS batch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'imported',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    ship_name TEXT NOT NULL,
    berth TEXT NOT NULL,
    eta TEXT NOT NULL,
    etd TEXT NOT NULL,
    cargo_type TEXT NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES batch(id)
);

CREATE TABLE IF NOT EXISTS water_quality_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    schedule_record_id INTEGER,
    salinity_value REAL,
    salinity_unit TEXT,
    temperature REAL,
    turbidity REAL,
    measured_at TEXT,
    FOREIGN KEY (batch_id) REFERENCES batch(id),
    FOREIGN KEY (schedule_record_id) REFERENCES schedule_record(id)
);

CREATE TABLE IF NOT EXISTS conflict (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    schedule_record_id INTEGER,
    water_quality_record_id INTEGER,
    conflict_type TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    FOREIGN KEY (batch_id) REFERENCES batch(id),
    FOREIGN KEY (schedule_record_id) REFERENCES schedule_record(id),
    FOREIGN KEY (water_quality_record_id) REFERENCES water_quality_record(id)
);

CREATE TABLE IF NOT EXISTS review (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    conflict_id INTEGER NOT NULL,
    reviewer TEXT NOT NULL,
    opinion TEXT NOT NULL,
    action_taken TEXT NOT NULL DEFAULT '',
    reviewed_at TEXT NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES batch(id),
    FOREIGN KEY (conflict_id) REFERENCES conflict(id)
);

CREATE TABLE IF NOT EXISTS risk_notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    conflict_id INTEGER NOT NULL,
    notification_type TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    is_missing INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (batch_id) REFERENCES batch(id),
    FOREIGN KEY (conflict_id) REFERENCES conflict(id)
);

CREATE TABLE IF NOT EXISTS processing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    step TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
"""


def log_step(db, batch_id, step, detail=""):
    db.execute(
        "INSERT INTO processing_log (batch_id, step, detail, created_at) VALUES (?, ?, ?, ?)",
        (batch_id, step, detail, datetime.now().isoformat()),
    )
    db.commit()


def validate_salinity_units(records):
    units_found = set()
    for r in records:
        unit = r.get("salinity_unit", "")
        if unit:
            units_found.add(unit.upper())
    if len(units_found) > 1:
        return SALINITY_UNIT_HINT.format(units="、".join(sorted(units_found)))
    return None


def detect_conflicts(db, batch_id, schedule_records, water_quality_records):
    conflicts = []
    for sq in schedule_records:
        for wq in water_quality_records:
            if wq.get("schedule_record_id") == sq["id"] or wq.get("schedule_record_id") is None:
                if wq.get("salinity_value") is not None and wq["salinity_value"] < 5:
                    conflicts.append({
                        "batch_id": batch_id,
                        "schedule_record_id": sq["id"],
                        "water_quality_record_id": wq["id"],
                        "conflict_type": "低盐度异常",
                        "description": f"船舶 {sq['ship_name']} 在 {sq['berth']} 泊位，盐度 {wq['salinity_value']} {wq.get('salinity_unit', '')} 低于正常海水盐度下限(5)，可能受淡水径流影响",
                        "severity": "high",
                    })
                if wq.get("turbidity") is not None and wq["turbidity"] > 50:
                    conflicts.append({
                        "batch_id": batch_id,
                        "schedule_record_id": sq["id"],
                        "water_quality_record_id": wq["id"],
                        "conflict_type": "高浊度异常",
                        "description": f"船舶 {sq['ship_name']} 在 {sq['berth']} 泊位，浊度 {wq['turbidity']} NTU 超标(>50)，可能影响航行安全",
                        "severity": "medium",
                    })
    seen = set()
    unique = []
    for c in conflicts:
        key = (c["schedule_record_id"], c["water_quality_record_id"], c["conflict_type"])
        if key not in seen:
            seen.add(key)
            unique.append(c)
    return unique


def make_risk_notifications(db, batch_id, conflicts, provided_notifications=None):
    provided = provided_notifications or []
    provided_map = {}
    for n in provided:
        provided_map[n.get("conflict_id")] = n

    notifications = []
    gaps = []
    for c in conflicts:
        if c["id"] in provided_map:
            n = provided_map[c["id"]]
            notifications.append({
                "batch_id": batch_id,
                "conflict_id": c["id"],
                "notification_type": n.get("notification_type", "常规通报"),
                "content": n.get("content", ""),
                "is_missing": 0,
            })
        else:
            notifications.append({
                "batch_id": batch_id,
                "conflict_id": c["id"],
                "notification_type": "缺失",
                "content": "",
                "is_missing": 1,
            })
            gaps.append({
                "conflict_id": c["id"],
                "conflict_type": c["conflict_type"],
                "description": c["description"],
                "hint": f"冲突「{c['conflict_type']}」缺少风险通报，请海事安全员补充",
            })
    return notifications, gaps


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/import", methods=["POST"])
def api_import():
    data = request.get_json(force=True)
    db = get_db()
    now = datetime.now().isoformat()
    label = data.get("label", f"批次-{datetime.now().strftime('%Y%m%d-%H%M%S')}")

    schedule_data = data.get("schedule_records", [])
    water_quality_data = data.get("water_quality_records", [])
    notification_data = data.get("risk_notifications", [])

    if not schedule_data:
        return jsonify({"ok": False, "error": "没有船期记录，请至少导入一条"}), 400

    unit_error = validate_salinity_units(water_quality_data)
    if unit_error:
        return jsonify({"ok": False, "error": unit_error}), 400

    try:
        cur = db.execute(
            "INSERT INTO batch (label, status, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (label, "imported", now, now),
        )
        batch_id = cur.lastrowid

        schedule_ids = {}
        for sq in schedule_data:
            cur = db.execute(
                "INSERT INTO schedule_record (batch_id, ship_name, berth, eta, etd, cargo_type) VALUES (?, ?, ?, ?, ?, ?)",
                (batch_id, sq["ship_name"], sq.get("berth", ""), sq.get("eta", ""), sq.get("etd", ""), sq.get("cargo_type", "")),
            )
            schedule_ids[sq.get("ref", "")] = cur.lastrowid

        wq_ids = []
        for wq in water_quality_data:
            sid = schedule_ids.get(wq.get("schedule_ref", ""), None)
            cur = db.execute(
                "INSERT INTO water_quality_record (batch_id, schedule_record_id, salinity_value, salinity_unit, temperature, turbidity, measured_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (batch_id, sid, wq.get("salinity_value"), wq.get("salinity_unit"), wq.get("temperature"), wq.get("turbidity"), wq.get("measured_at", "")),
            )
            wq_ids.append(cur.lastrowid)

        db.commit()

        sq_rows = [dict(r) for r in db.execute("SELECT * FROM schedule_record WHERE batch_id=?", (batch_id,)).fetchall()]
        wq_rows = [dict(r) for r in db.execute("SELECT * FROM water_quality_record WHERE batch_id=?", (batch_id,)).fetchall()]

        conflicts = detect_conflicts(db, batch_id, sq_rows, wq_rows)
        conflict_ids = {}
        for c in conflicts:
            cur = db.execute(
                "INSERT INTO conflict (batch_id, schedule_record_id, water_quality_record_id, conflict_type, description, severity) VALUES (?, ?, ?, ?, ?, ?)",
                (c["batch_id"], c["schedule_record_id"], c["water_quality_record_id"], c["conflict_type"], c["description"], c["severity"]),
            )
            conflict_ids[c.get("_idx", 0)] = cur.lastrowid

        db.commit()

        conflict_rows = [dict(r) for r in db.execute("SELECT * FROM conflict WHERE batch_id=?", (batch_id,)).fetchall()]
        notifications, gaps = make_risk_notifications(db, batch_id, conflict_rows, notification_data)

        for n in notifications:
            db.execute(
                "INSERT INTO risk_notification (batch_id, conflict_id, notification_type, content, is_missing) VALUES (?, ?, ?, ?, ?)",
                (n["batch_id"], n["conflict_id"], n["notification_type"], n["content"], n["is_missing"]),
            )
        db.commit()

        log_step(db, batch_id, "import", json.dumps({"schedule_count": len(schedule_data), "wq_count": len(water_quality_data), "conflict_count": len(conflicts), "gap_count": len(gaps)}, ensure_ascii=False))

        result = {
            "ok": True,
            "batch_id": batch_id,
            "label": label,
            "conflict_count": len(conflicts),
            "gap_count": len(gaps),
        }
        if gaps:
            result["warning"] = f"有 {len(gaps)} 条冲突缺少风险通报，已先处理其余部分，缺口请补充"
            result["gaps"] = gaps
        return jsonify(result), 201

    except Exception as e:
        db.rollback()
        return jsonify({"ok": False, "error": f"导入失败：{str(e)}"}), 500


@app.route("/api/batches", methods=["GET"])
def api_batches():
    db = get_db()
    rows = db.execute("SELECT * FROM batch ORDER BY created_at DESC").fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["status_label"] = STATUS_LABELS.get(d["status"], d["status"])
        conflict_count = db.execute("SELECT COUNT(*) FROM conflict WHERE batch_id=?", (d["id"],)).fetchone()[0]
        review_count = db.execute("SELECT COUNT(*) FROM review WHERE batch_id=?", (d["id"],)).fetchone()[0]
        d["conflict_count"] = conflict_count
        d["review_count"] = review_count
        result.append(d)
    return jsonify(result)


@app.route("/api/batches/<int:batch_id>", methods=["GET"])
def api_batch_detail(batch_id):
    db = get_db()
    batch = db.execute("SELECT * FROM batch WHERE id=?", (batch_id,)).fetchone()
    if not batch:
        return jsonify({"ok": False, "error": "批次不存在"}), 404
    batch = dict(batch)
    batch["status_label"] = STATUS_LABELS.get(batch["status"], batch["status"])

    schedules = [dict(r) for r in db.execute("SELECT * FROM schedule_record WHERE batch_id=?", (batch_id,)).fetchall()]
    water_qualities = [dict(r) for r in db.execute("SELECT * FROM water_quality_record WHERE batch_id=?", (batch_id,)).fetchall()]
    conflicts = [dict(r) for r in db.execute("SELECT * FROM conflict WHERE batch_id=?", (batch_id,)).fetchall()]
    reviews = [dict(r) for r in db.execute("SELECT * FROM review WHERE batch_id=?", (batch_id,)).fetchall()]
    notifications = [dict(r) for r in db.execute("SELECT * FROM risk_notification WHERE batch_id=?", (batch_id,)).fetchall()]
    logs = [dict(r) for r in db.execute("SELECT * FROM processing_log WHERE batch_id=? ORDER BY created_at", (batch_id,)).fetchall()]

    return jsonify({
        "batch": batch,
        "schedule_records": schedules,
        "water_quality_records": water_qualities,
        "conflicts": conflicts,
        "reviews": reviews,
        "risk_notifications": notifications,
        "processing_log": logs,
    })


@app.route("/api/batches/<int:batch_id>/review", methods=["PUT"])
def api_review(batch_id):
    data = request.get_json(force=True)
    db = get_db()
    batch = db.execute("SELECT * FROM batch WHERE id=?", (batch_id,)).fetchone()
    if not batch:
        return jsonify({"ok": False, "error": "批次不存在"}), 404

    conflict_id = data.get("conflict_id")
    reviewer = data.get("reviewer", "海事安全员")
    opinion = data.get("opinion", "")
    action_taken = data.get("action_taken", "")

    if not conflict_id:
        return jsonify({"ok": False, "error": "请指定要复核的冲突记录"}), 400

    conflict = db.execute("SELECT * FROM conflict WHERE id=? AND batch_id=?", (conflict_id, batch_id)).fetchone()
    if not conflict:
        return jsonify({"ok": False, "error": "冲突记录不存在或不属于该批次"}), 404

    now = datetime.now().isoformat()
    cur = db.execute(
        "INSERT INTO review (batch_id, conflict_id, reviewer, opinion, action_taken, reviewed_at) VALUES (?, ?, ?, ?, ?, ?)",
        (batch_id, conflict_id, reviewer, opinion, action_taken, now),
    )
    review_id = cur.lastrowid

    if batch["status"] == "imported":
        db.execute("UPDATE batch SET status='reviewing', updated_at=? WHERE id=?", (now, batch_id))

    db.commit()
    log_step(db, batch_id, "review", f"冲突#{conflict_id}已由{reviewer}复核：{opinion}")

    return jsonify({"ok": True, "review_id": review_id}), 201


@app.route("/api/reviews/<int:review_id>", methods=["PUT"])
def api_edit_review(review_id):
    data = request.get_json(force=True)
    db = get_db()
    review = db.execute("SELECT * FROM review WHERE id=?", (review_id,)).fetchone()
    if not review:
        return jsonify({"ok": False, "error": "复核记录不存在"}), 404

    opinion = data.get("opinion", review["opinion"])
    action_taken = data.get("action_taken", review["action_taken"])
    now = datetime.now().isoformat()

    db.execute(
        "UPDATE review SET opinion=?, action_taken=?, reviewed_at=? WHERE id=?",
        (opinion, action_taken, now, review_id),
    )
    db.commit()
    log_step(db, review["batch_id"], "review_edit", f"复核#{review_id}已修改")

    return jsonify({"ok": True})


@app.route("/api/risk_notifications/<int:notif_id>", methods=["PUT"])
def api_fill_notification(notif_id):
    data = request.get_json(force=True)
    db = get_db()
    notif = db.execute("SELECT * FROM risk_notification WHERE id=?", (notif_id,)).fetchone()
    if not notif:
        return jsonify({"ok": False, "error": "通报记录不存在"}), 404

    notification_type = data.get("notification_type", notif["notification_type"])
    content = data.get("content", notif["content"])
    now_str = datetime.now().isoformat()

    db.execute(
        "UPDATE risk_notification SET notification_type=?, content=?, is_missing=0 WHERE id=?",
        (notification_type, content, notif_id),
    )
    db.commit()
    log_step(db, notif["batch_id"], "notification_fill", f"风险通报#{notif_id}已补充")

    return jsonify({"ok": True})


@app.route("/api/batches/<int:batch_id>/advance", methods=["POST"])
def api_advance(batch_id):
    db = get_db()
    batch = db.execute("SELECT * FROM batch WHERE id=?", (batch_id,)).fetchone()
    if not batch:
        return jsonify({"ok": False, "error": "批次不存在"}), 404

    current = batch["status"]
    idx = VALID_STATUSES.index(current) if current in VALID_STATUSES else -1
    if idx >= len(VALID_STATUSES) - 1:
        return jsonify({"ok": False, "error": f"当前状态「{STATUS_LABELS.get(current, current)}」已是终态，无法继续推进"}), 400

    if current == "imported":
        review_count = db.execute("SELECT COUNT(*) FROM review WHERE batch_id=?", (batch_id,)).fetchone()[0]
        conflict_count = db.execute("SELECT COUNT(*) FROM conflict WHERE batch_id=?", (batch_id,)).fetchone()[0]
        if conflict_count > 0 and review_count == 0:
            return jsonify({"ok": False, "error": "有未复核的冲突，请先完成复核再推进状态"}), 400

    if current == "reviewing":
        conflict_count = db.execute("SELECT COUNT(*) FROM conflict WHERE batch_id=?", (batch_id,)).fetchone()[0]
        review_count = db.execute("SELECT COUNT(*) FROM review WHERE batch_id=?", (batch_id,)).fetchone()[0]
        if conflict_count > 0 and review_count < conflict_count:
            return jsonify({"ok": False, "error": f"还有 {conflict_count - review_count} 条冲突未复核，请全部复核后再审批"}), 400

    next_status = VALID_STATUSES[idx + 1]
    now = datetime.now().isoformat()
    db.execute("UPDATE batch SET status=?, updated_at=? WHERE id=?", (next_status, now, batch_id))
    db.commit()
    log_step(db, batch_id, "advance", f"状态从「{STATUS_LABELS.get(current, current)}」推进到「{STATUS_LABELS.get(next_status, next_status)}」")

    return jsonify({"ok": True, "previous": current, "current": next_status, "current_label": STATUS_LABELS.get(next_status, next_status)})


@app.route("/api/batches/<int:batch_id>/export", methods=["GET"])
def api_export(batch_id):
    db = get_db()
    batch = db.execute("SELECT * FROM batch WHERE id=?", (batch_id,)).fetchone()
    if not batch:
        return jsonify({"ok": False, "error": "批次不存在"}), 404

    schedules = db.execute("SELECT * FROM schedule_record WHERE batch_id=?", (batch_id,)).fetchall()
    wqs = db.execute("SELECT * FROM water_quality_record WHERE batch_id=?", (batch_id,)).fetchall()
    conflicts = db.execute("SELECT * FROM conflict WHERE batch_id=?", (batch_id,)).fetchall()
    reviews = db.execute("SELECT * FROM review WHERE batch_id=?", (batch_id,)).fetchall()
    notifications = db.execute("SELECT * FROM risk_notification WHERE batch_id=?", (batch_id,)).fetchall()
    logs = db.execute("SELECT * FROM processing_log WHERE batch_id=? ORDER BY created_at", (batch_id,)).fetchall()

    output = io.StringIO()
    output.write(f"海港船期冲突台 - 处理报告\n")
    output.write(f"批次: {batch['label']} (ID: {batch_id})\n")
    output.write(f"状态: {STATUS_LABELS.get(batch['status'], batch['status'])}\n")
    output.write(f"创建时间: {batch['created_at']}\n")
    output.write(f"更新时间: {batch['updated_at']}\n")
    output.write(f"{'='*60}\n\n")

    output.write(f"一、船期记录（共 {len(schedules)} 条）\n")
    output.write("-" * 40 + "\n")
    for s in schedules:
        output.write(f"  船舶: {s['ship_name']}  泊位: {s['berth']}  货类: {s['cargo_type']}\n")
        output.write(f"  预计到港: {s['eta']}  预计离港: {s['etd']}\n\n")

    output.write(f"二、水质检测记录（共 {len(wqs)} 条）\n")
    output.write("-" * 40 + "\n")
    for w in wqs:
        output.write(f"  盐度: {w['salinity_value']} {w['salinity_unit']}  水温: {w['temperature']}°C  浊度: {w['turbidity']} NTU\n")
        output.write(f"  检测时间: {w['measured_at']}\n\n")

    output.write(f"三、冲突记录（共 {len(conflicts)} 条）\n")
    output.write("-" * 40 + "\n")
    for c in conflicts:
        output.write(f"  [{c['severity'].upper()}] {c['conflict_type']}\n")
        output.write(f"  {c['description']}\n")
        related_reviews = [r for r in reviews if r["conflict_id"] == c["id"]]
        if related_reviews:
            for rv in related_reviews:
                output.write(f"  → 复核: {rv['reviewer']} - {rv['opinion']} (措施: {rv['action_taken']})\n")
        else:
            output.write(f"  → 尚未复核\n")
        output.write("\n")

    output.write(f"四、风险通报（共 {len(notifications)} 条）\n")
    output.write("-" * 40 + "\n")
    for n in notifications:
        status_tag = "【缺失】" if n["is_missing"] else ""
        output.write(f"  {status_tag}{n['notification_type']}: {n['content']}\n")

    output.write(f"\n五、处理日志\n")
    output.write("-" * 40 + "\n")
    for l in logs:
        output.write(f"  [{l['created_at']}] {l['step']}: {l['detail']}\n")

    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    filename = f"冲突台-批次{batch_id}-{batch['label']}-{ts}.txt"

    if batch["status"] != "exported":
        now = datetime.now().isoformat()
        db.execute("UPDATE batch SET status='exported', updated_at=? WHERE id=?", (now, batch_id))
        db.commit()
        log_step(db, batch_id, "export", f"报告已导出: {filename}")

    mem = io.BytesIO()
    content = output.getvalue()
    mem.write(content.encode("utf-8-sig"))
    mem.seek(0)

    return send_file(mem, as_attachment=True, download_name=filename, mimetype="text/plain; charset=utf-8")


@app.route("/api/conflicts/<int:conflict_id>/trace", methods=["GET"])
def api_trace(conflict_id):
    db = get_db()
    conflict = db.execute("SELECT * FROM conflict WHERE id=?", (conflict_id,)).fetchone()
    if not conflict:
        return jsonify({"ok": False, "error": "冲突记录不存在"}), 404

    conflict = dict(conflict)

    trace = {"conflict": conflict}

    if conflict["water_quality_record_id"]:
        wq = db.execute("SELECT * FROM water_quality_record WHERE id=?", (conflict["water_quality_record_id"],)).fetchone()
        trace["water_quality_record"] = dict(wq) if wq else None

    if conflict["schedule_record_id"]:
        sq = db.execute("SELECT * FROM schedule_record WHERE id=?", (conflict["schedule_record_id"],)).fetchone()
        trace["schedule_record"] = dict(sq) if sq else None

    reviews = [dict(r) for r in db.execute("SELECT * FROM review WHERE conflict_id=?", (conflict_id,)).fetchall()]
    trace["reviews"] = reviews

    notifs = [dict(n) for n in db.execute("SELECT * FROM risk_notification WHERE conflict_id=?", (conflict_id,)).fetchall()]
    trace["risk_notifications"] = notifs

    batch = db.execute("SELECT * FROM batch WHERE id=?", (conflict["batch_id"],)).fetchone()
    trace["batch"] = dict(batch) if batch else None

    return jsonify(trace)


@app.route("/api/batches/<int:batch_id>/gaps", methods=["GET"])
def api_gaps(batch_id):
    db = get_db()
    batch = db.execute("SELECT * FROM batch WHERE id=?", (batch_id,)).fetchone()
    if not batch:
        return jsonify({"ok": False, "error": "批次不存在"}), 404

    missing = [dict(n) for n in db.execute("SELECT * FROM risk_notification WHERE batch_id=? AND is_missing=1", (batch_id,)).fetchall()]
    enriched = []
    for m in missing:
        conflict = db.execute("SELECT * FROM conflict WHERE id=?", (m["conflict_id"],)).fetchone()
        entry = dict(m)
        entry["conflict"] = dict(conflict) if conflict else None
        enriched.append(entry)

    return jsonify({"ok": True, "gaps": enriched})


@app.route("/api/batches/<int:batch_id>", methods=["DELETE"])
def api_delete_batch(batch_id):
    db = get_db()
    batch = db.execute("SELECT * FROM batch WHERE id=?", (batch_id,)).fetchone()
    if not batch:
        return jsonify({"ok": False, "error": "批次不存在"}), 404

    for table in ["risk_notification", "review", "conflict", "water_quality_record", "schedule_record", "processing_log"]:
        db.execute(f"DELETE FROM {table} WHERE batch_id=?", (batch_id,))
    db.execute("DELETE FROM batch WHERE id=?", (batch_id,))
    db.commit()
    return jsonify({"ok": True})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
