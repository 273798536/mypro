import json
import os
from datetime import datetime

from flask import Flask, request, jsonify, send_file

from database import (
    init_db, db_session, generate_batch_no, get_next_run_index,
    STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_PASSED, STATUS_FAILED,
)
from review_logic import run_sample_review, run_batch_review
from report_export import export_report, build_report_content, generate_report_filename, REPORT_DIR

app = Flask(__name__)
init_db()


def _row_to_dict(row):
    if row is None:
        return None
    return {k: row[k] for k in row.keys()}


def _rows_to_dict_list(rows):
    return [_row_to_dict(r) for r in rows]


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.now().isoformat(timespec="seconds")})


@app.route("/api/import", methods=["POST"])
def import_batch():
    payload = request.get_json(force=True, silent=True) or {}
    source_file = payload.get("source_file", "manual_input.xlsx")
    imported_by = payload.get("imported_by", "操作人")
    remark = payload.get("remark", "")
    samples_raw = payload.get("samples", [])

    if not samples_raw:
        return jsonify({"error": "未提供任何样品数据"}), 400

    now = datetime.now().isoformat(timespec="seconds")
    batch_no = generate_batch_no()
    run_index = get_next_run_index()

    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            """INSERT INTO dissolution_batches
               (batch_no, run_index, imported_at, imported_by, source_file, remark, overall_status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (batch_no, run_index, now, imported_by, source_file, remark, STATUS_PENDING, now),
        )
        batch_id = c.lastrowid

        c.execute(
            """INSERT INTO status_audit (batch_id, from_status, to_status, operator, comment, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (batch_id, None, STATUS_PENDING, imported_by, "创建批次", now),
        )

        for sp in samples_raw:
            missing_fields = []
            for key in ("product_name", "batch_number", "test_date", "analyst", "medium", "temperature", "rotation_speed"):
                val = sp.get(key)
                if val is None or (isinstance(val, str) and val.strip() == ""):
                    missing_fields.append(key)
            if not sp.get("weighing_unit"):
                missing_fields.append("weighing_unit")

            c.execute(
                """INSERT INTO dissolution_samples
                   (batch_id, sample_no, product_name, batch_number, test_date, analyst,
                    weighing_value, weighing_unit, weighing_precision_ok, medium, temperature,
                    rotation_speed, time_points, dissolution_data, spectrum_data,
                    fill_remark, missing_fields, old_format, review_status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    batch_id,
                    sp.get("sample_no", ""),
                    sp.get("product_name"),
                    sp.get("batch_number"),
                    sp.get("test_date"),
                    sp.get("analyst"),
                    sp.get("weighing_value"),
                    sp.get("weighing_unit"),
                    1,
                    sp.get("medium"),
                    sp.get("temperature"),
                    sp.get("rotation_speed"),
                    json.dumps(sp.get("time_points", []), ensure_ascii=False) if sp.get("time_points") else None,
                    json.dumps(sp.get("dissolution_data", []), ensure_ascii=False) if sp.get("dissolution_data") else None,
                    json.dumps(sp.get("spectrum_data", []), ensure_ascii=False) if sp.get("spectrum_data") else None,
                    sp.get("fill_remark"),
                    json.dumps(missing_fields, ensure_ascii=False) if missing_fields else None,
                    1 if sp.get("old_format") else 0,
                    STATUS_PENDING,
                    now,
                ),
            )
            sample_id = c.lastrowid
            for tp in sp.get("temperature_curve", []) or []:
                c.execute(
                    """INSERT INTO temperature_curves
                       (sample_id, time_min, temperature_c, is_anomaly, anomaly_note)
                       VALUES (?, ?, ?, ?, ?)""",
                    (
                        sample_id,
                        float(tp.get("time_min", 0)),
                        float(tp.get("temperature_c", 0)),
                        1 if tp.get("is_anomaly") else 0,
                        tp.get("anomaly_note"),
                    ),
                )

    return jsonify({
        "batch_id": batch_id,
        "batch_no": batch_no,
        "run_index": run_index,
        "samples_count": len(samples_raw),
        "status": STATUS_PENDING,
    }), 201


@app.route("/api/batches", methods=["GET"])
def list_batches():
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM dissolution_batches ORDER BY id DESC")
        batches = _rows_to_dict_list(c.fetchall())
    return jsonify({"batches": batches})


@app.route("/api/batches/<int:batch_id>", methods=["GET"])
def get_batch(batch_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM dissolution_batches WHERE id = ?", (batch_id,))
        batch = _row_to_dict(c.fetchone())
        if not batch:
            return jsonify({"error": "批次不存在"}), 404
        c.execute("SELECT * FROM dissolution_samples WHERE batch_id = ? ORDER BY sample_no", (batch_id,))
        samples = _rows_to_dict_list(c.fetchall())
        for s in samples:
            c.execute(
                "SELECT * FROM temperature_curves WHERE sample_id = ? ORDER BY time_min",
                (s["id"],),
            )
            s["temperature_curve"] = _rows_to_dict_list(c.fetchall())
            c.execute(
                "SELECT * FROM review_findings WHERE sample_id = ? ORDER BY severity DESC, id",
                (s["id"],),
            )
            s["findings"] = _rows_to_dict_list(c.fetchall())
        c.execute(
            "SELECT * FROM safety_alerts WHERE batch_id = ? ORDER BY severity DESC, id",
            (batch_id,),
        )
        safety = _rows_to_dict_list(c.fetchall())
        c.execute(
            "SELECT * FROM status_audit WHERE batch_id = ? OR sample_id IN (SELECT id FROM dissolution_samples WHERE batch_id = ?) ORDER BY id",
            (batch_id, batch_id),
        )
        audit = _rows_to_dict_list(c.fetchall())
    return jsonify({"batch": batch, "samples": samples, "safety_alerts": safety, "audit_trail": audit})


@app.route("/api/batches/<int:batch_id>/review", methods=["POST"])
def review_batch(batch_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM dissolution_batches WHERE id = ?", (batch_id,))
        if not c.fetchone():
            return jsonify({"error": "批次不存在"}), 404
    result = run_batch_review(batch_id)

    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT id, review_status FROM dissolution_samples WHERE batch_id = ?", (batch_id,))
        samples = _rows_to_dict_list(c.fetchall())
        for s in samples:
            if s["review_status"] in (STATUS_PASSED, STATUS_FAILED):
                c.execute(
                    """INSERT INTO status_audit (batch_id, sample_id, from_status, to_status, operator, comment, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (batch_id, s["id"], STATUS_IN_PROGRESS, s["review_status"], "系统", "自动复核判定",
                     datetime.now().isoformat(timespec="seconds")),
                )

        c.execute(
            "SELECT id, finding_type, severity, title, description, sample_id FROM review_findings WHERE sample_id IN (SELECT id FROM dissolution_samples WHERE batch_id = ?)",
            (batch_id,),
        )
        findings = _rows_to_dict_list(c.fetchall())
        now = datetime.now().isoformat(timespec="seconds")
        for f in findings:
            c.execute(
                """INSERT INTO safety_alerts
                   (batch_id, sample_id, alert_type, severity, title, description, linked_finding_id, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (batch_id, f["sample_id"], f["finding_type"], f["severity"], f["title"], f["description"], f["id"], now),
            )

    return jsonify(result)


@app.route("/api/samples/<int:sample_id>/status", methods=["PUT"])
def update_sample_status(sample_id):
    payload = request.get_json(force=True, silent=True) or {}
    new_status = payload.get("status")
    operator = payload.get("operator", "操作人")
    comment = payload.get("comment", "")
    review_comment = payload.get("review_comment")

    if new_status not in (STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_PASSED, STATUS_FAILED):
        return jsonify({"error": "无效的状态值"}), 400

    now = datetime.now().isoformat(timespec="seconds")
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT review_status, batch_id FROM dissolution_samples WHERE id = ?", (sample_id,))
        row = c.fetchone()
        if not row:
            return jsonify({"error": "样品不存在"}), 404
        old_status = row["review_status"]
        batch_id = row["batch_id"]
        c.execute(
            "UPDATE dissolution_samples SET review_status = ?, reviewer = ?, reviewed_at = ?, review_comment = COALESCE(?, review_comment) WHERE id = ?",
            (new_status, operator, now, review_comment, sample_id),
        )
        c.execute(
            """INSERT INTO status_audit (batch_id, sample_id, from_status, to_status, operator, comment, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (batch_id, sample_id, old_status, new_status, operator, comment, now),
        )
    return jsonify({"sample_id": sample_id, "from": old_status, "to": new_status})


@app.route("/api/batches/<int:batch_id>/status", methods=["PUT"])
def update_batch_status(batch_id):
    payload = request.get_json(force=True, silent=True) or {}
    new_status = payload.get("status")
    operator = payload.get("operator", "操作人")
    comment = payload.get("comment", "")

    if new_status not in (STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_PASSED, STATUS_FAILED):
        return jsonify({"error": "无效的状态值"}), 400

    now = datetime.now().isoformat(timespec="seconds")
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT overall_status FROM dissolution_batches WHERE id = ?", (batch_id,))
        row = c.fetchone()
        if not row:
            return jsonify({"error": "批次不存在"}), 404
        old_status = row["overall_status"]
        c.execute("UPDATE dissolution_batches SET overall_status = ? WHERE id = ?", (new_status, batch_id))
        c.execute(
            """INSERT INTO status_audit (batch_id, from_status, to_status, operator, comment, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (batch_id, old_status, new_status, operator, comment, now),
        )
    return jsonify({"batch_id": batch_id, "from": old_status, "to": new_status})


@app.route("/api/batches/<int:batch_id>/safety", methods=["GET"])
def list_safety_alerts(batch_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM dissolution_batches WHERE id = ?", (batch_id,))
        if not c.fetchone():
            return jsonify({"error": "批次不存在"}), 404
        c.execute(
            "SELECT * FROM safety_alerts WHERE batch_id = ? ORDER BY severity DESC, id",
            (batch_id,),
        )
        alerts = _rows_to_dict_list(c.fetchall())
    return jsonify({"safety_alerts": alerts})


@app.route("/api/safety/<int:alert_id>/acknowledge", methods=["POST"])
def acknowledge_safety_alert(alert_id):
    payload = request.get_json(force=True, silent=True) or {}
    operator = payload.get("operator", "操作人")
    now = datetime.now().isoformat(timespec="seconds")
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            "UPDATE safety_alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ? WHERE id = ?",
            (operator, now, alert_id),
        )
        if c.rowcount == 0:
            return jsonify({"error": "提示不存在"}), 404
    return jsonify({"alert_id": alert_id, "acknowledged": True, "by": operator, "at": now})


@app.route("/api/batches/<int:batch_id>/export", methods=["GET"])
def export_batch_report(batch_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM dissolution_batches WHERE id = ?", (batch_id,))
        if not c.fetchone():
            return jsonify({"error": "批次不存在"}), 404
    filepath, filename, content = export_report(batch_id)
    return send_file(filepath, as_attachment=True, download_name=filename, mimetype="text/plain; charset=utf-8")


@app.route("/api/batches/<int:batch_id>/report_preview", methods=["GET"])
def preview_report(batch_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT id, batch_no, run_index FROM dissolution_batches WHERE id = ?", (batch_id,))
        row = c.fetchone()
        if not row:
            return jsonify({"error": "批次不存在"}), 404
        batch = _row_to_dict(row)
    content = build_report_content(batch_id)
    filename = generate_report_filename(batch)
    return jsonify({"filename": filename, "content": content})


@app.route("/api/history/runs", methods=["GET"])
def list_runs():
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            """SELECT b.*,
                      (SELECT COUNT(*) FROM dissolution_samples s WHERE s.batch_id = b.id) AS sample_count,
                      (SELECT COUNT(*) FROM review_findings f JOIN dissolution_samples s ON f.sample_id = s.id WHERE s.batch_id = b.id) AS finding_count
               FROM dissolution_batches b ORDER BY b.id DESC"""
        )
        runs = _rows_to_dict_list(c.fetchall())
    return jsonify({"runs": runs})


@app.route("/api/history/trace/<int:finding_id>", methods=["GET"])
def trace_finding(finding_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM review_findings WHERE id = ?", (finding_id,))
        finding = _row_to_dict(c.fetchone())
        if not finding:
            return jsonify({"error": "问题记录不存在"}), 404
        c.execute("SELECT * FROM dissolution_samples WHERE id = ?", (finding["sample_id"],))
        sample = _row_to_dict(c.fetchone())
        c.execute("SELECT * FROM dissolution_batches WHERE id = ?", (sample["batch_id"],))
        batch = _row_to_dict(c.fetchone())
        c.execute(
            "SELECT * FROM temperature_curves WHERE sample_id = ? ORDER BY time_min",
            (sample["id"],),
        )
        temps = _rows_to_dict_list(c.fetchall())
        c.execute(
            "SELECT * FROM status_audit WHERE sample_id = ? OR batch_id = ? ORDER BY id",
            (sample["id"], sample["batch_id"]),
        )
        audit = _rows_to_dict_list(c.fetchall())
    return jsonify({
        "finding": finding,
        "sample": sample,
        "batch": batch,
        "temperature_curve": temps,
        "audit_trail": audit,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
