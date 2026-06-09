import os
import json
import csv
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory

from .database import init_db, get_db, DB_PATH
from . import batch_service

app = Flask(__name__)

EXPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "exports")
os.makedirs(EXPORT_DIR, exist_ok=True)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "db": DB_PATH})


@app.route("/init", methods=["POST"])
def init():
    init_db()
    return jsonify({"message": "database initialized"})


@app.route("/students", methods=["POST"])
def add_students():
    data = request.get_json(force=True)
    items = data if isinstance(data, list) else [data]
    ids = []
    with get_db() as conn:
        c = conn.cursor()
        for it in items:
            c.execute("""
                INSERT OR IGNORE INTO students (student_code, student_name, class_name)
                VALUES (?, ?, ?)
            """, (it["student_code"], it.get("student_name"), it.get("class_name")))
            c.execute("SELECT id FROM students WHERE student_code = ?", (it["student_code"],))
            ids.append(c.fetchone()["id"])
        conn.commit()
    return jsonify({"inserted": len(ids), "ids": ids})


@app.route("/questions", methods=["POST"])
def add_questions():
    data = request.get_json(force=True)
    items = data if isinstance(data, list) else [data]
    ids = []
    with get_db() as conn:
        c = conn.cursor()
        for it in items:
            c.execute("""
                INSERT OR IGNORE INTO questions
                (question_code, question_text, correct_answer, correct_derivative, critical_points, has_zero_division_risk)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                it["question_code"], it.get("question_text", ""),
                it.get("correct_answer"), it.get("correct_derivative"),
                it.get("critical_points"), it.get("has_zero_division_risk", 0)
            ))
            c.execute("SELECT id FROM questions WHERE question_code = ?", (it["question_code"],))
            ids.append(c.fetchone()["id"])
        conn.commit()
    return jsonify({"inserted": len(ids), "ids": ids})


@app.route("/wrong_answers", methods=["POST"])
def add_wrong_answers():
    data = request.get_json(force=True)
    items = data if isinstance(data, list) else [data]
    ids = []
    with get_db() as conn:
        c = conn.cursor()
        for it in items:
            c.execute("SELECT id FROM students WHERE student_code = ?", (it["student_code"],))
            s = c.fetchone()
            c.execute("SELECT id FROM questions WHERE question_code = ?", (it["question_code"],))
            q = c.fetchone()
            if not s or not q:
                continue
            c.execute("""
                INSERT OR REPLACE INTO wrong_answers
                (student_id, question_id, student_answer, student_derivative, student_work,
                 historical_score, historical_score_missing, answered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                s["id"], q["id"],
                it.get("student_answer"), it.get("student_derivative"), it.get("student_work"),
                it.get("historical_score"),
                1 if it.get("historical_score") is None or it.get("historical_score_missing") else 0,
                it.get("answered_at", datetime.now().isoformat())
            ))
            c.execute("SELECT id FROM wrong_answers WHERE student_id = ? AND question_id = ?", (s["id"], q["id"]))
            ids.append(c.fetchone()["id"])
        conn.commit()
    return jsonify({"inserted": len(ids), "ids": ids})


@app.route("/wrong_answers", methods=["GET"])
def list_wrong_answers():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT wa.id, s.student_code, s.student_name, s.class_name,
                   q.question_code, q.question_text, q.correct_answer,
                   wa.student_answer, wa.student_derivative,
                   wa.historical_score, wa.historical_score_missing
            FROM wrong_answers wa
            JOIN students s ON s.id = wa.student_id
            JOIN questions q ON q.id = wa.question_id
            ORDER BY wa.id DESC
        """)
        rows = [dict(r) for r in c.fetchall()]
    return jsonify(rows)


@app.route("/batches", methods=["POST"])
def create_batch():
    data = request.get_json(force=True)
    batch = batch_service.create_batch(data["batch_code"], data.get("batch_name"))
    if data.get("wrong_answer_ids"):
        cnt = batch_service.attach_wrong_answers_to_batch(batch["id"], data["wrong_answer_ids"])
        batch["attached"] = cnt
    return jsonify(batch)


@app.route("/batches/<int:batch_id>/attach", methods=["POST"])
def attach_to_batch(batch_id):
    data = request.get_json(force=True)
    cnt = batch_service.attach_wrong_answers_to_batch(batch_id, data.get("wrong_answer_ids", []))
    return jsonify({"attached": cnt})


@app.route("/batches/<int:batch_id>/process", methods=["POST"])
def process_batch(batch_id):
    result = batch_service.process_batch(batch_id)
    return jsonify(result)


@app.route("/batches", methods=["GET"])
def list_batches():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM processing_batches ORDER BY id DESC")
        rows = [dict(r) for r in c.fetchall()]
    return jsonify(rows)


@app.route("/batches/<int:batch_id>/records", methods=["GET"])
def batch_records(batch_id):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT br.id, br.process_status, br.zero_division_boundary, br.boundary_valid, br.processed_at,
                   s.student_code, s.student_name, q.question_code, q.question_text,
                   wa.student_answer, wa.historical_score, wa.historical_score_missing
            FROM batch_records br
            JOIN wrong_answers wa ON wa.id = br.wrong_answer_id
            JOIN students s ON s.id = wa.student_id
            JOIN questions q ON q.id = wa.question_id
            WHERE br.batch_id = ?
            ORDER BY br.id
        """, (batch_id,))
        rows = [dict(r) for r in c.fetchall()]
    return jsonify(rows)


@app.route("/anomalies", methods=["GET"])
def list_anomalies():
    reviewed = request.args.get("reviewed")
    with get_db() as conn:
        c = conn.cursor()
        sql = """
            SELECT a.id, a.anomaly_type, a.severity, a.description, a.gap_detail, a.needs_review, a.reviewed,
                   pb.batch_code, s.student_code, s.student_name, q.question_code,
                   wa.historical_score_missing, br.boundary_valid
            FROM anomalies a
            JOIN batch_records br ON br.id = a.batch_record_id
            JOIN processing_batches pb ON pb.id = br.batch_id
            JOIN wrong_answers wa ON wa.id = br.wrong_answer_id
            JOIN students s ON s.id = wa.student_id
            JOIN questions q ON q.id = wa.question_id
        """
        params = []
        if reviewed is not None:
            sql += " WHERE a.reviewed = ?"
            params.append(1 if reviewed in ("1", "true", "yes") else 0)
        sql += " ORDER BY a.id DESC"
        rows = [dict(r) for r in c.execute(sql, params).fetchall()]
    return jsonify(rows)


@app.route("/anomalies/<int:anomaly_id>/trace", methods=["GET"])
def trace_anomaly(anomaly_id):
    trace = batch_service.trace_anomaly(anomaly_id)
    if not trace:
        return jsonify({"error": "not found"}), 404
    return jsonify(trace)


@app.route("/anomalies/<int:anomaly_id>/review", methods=["POST"])
def review_anomaly(anomaly_id):
    data = request.get_json(force=True)
    result = batch_service.add_review_decision(
        anomaly_id,
        data["reviewer"],
        data["decision"],
        data.get("handling_opinion"),
        data.get("supplemental_data")
    )
    return jsonify(result)


@app.route("/batches/<int:batch_id>/export", methods=["GET"])
def export_batch(batch_id):
    fmt = request.args.get("format", "csv")
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT batch_code FROM processing_batches WHERE id = ?", (batch_id,))
        bc_row = c.fetchone()
        if not bc_row:
            return jsonify({"error": "batch not found"}), 404
        batch_code = bc_row["batch_code"]

        c.execute("""
            SELECT pb.batch_code, pb.batch_name, pb.status,
                   s.student_code, s.student_name, s.class_name,
                   q.question_code, q.question_text, q.correct_answer,
                   wa.student_answer, wa.student_derivative,
                   wa.historical_score, wa.historical_score_missing,
                   br.process_status, br.zero_division_boundary, br.boundary_valid,
                   cc.check_type AS constraint_type, cc.check_result, cc.detail AS constraint_detail,
                   ea.error_type, ea.error_magnitude, ea.relative_error, ea.root_cause, ea.detail AS error_detail
            FROM batch_records br
            JOIN processing_batches pb ON pb.id = br.batch_id
            JOIN wrong_answers wa ON wa.id = br.wrong_answer_id
            JOIN students s ON s.id = wa.student_id
            JOIN questions q ON q.id = wa.question_id
            LEFT JOIN constraint_checks cc ON cc.batch_record_id = br.id
            LEFT JOIN error_analyses ea ON ea.batch_record_id = br.id
            WHERE br.batch_id = ?
            ORDER BY br.id, cc.id, ea.id
        """, (batch_id,))
        rows = [dict(r) for r in c.fetchall()]

    fname = f"batch_{batch_code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{fmt}"
    fpath = os.path.join(EXPORT_DIR, fname)

    if fmt == "json":
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2, default=str)
    else:
        with open(fpath, "w", encoding="utf-8-sig", newline="") as f:
            if rows:
                writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                for r in rows:
                    writer.writerow({k: ("" if v is None else v) for k, v in r.items()})
            else:
                f.write("")

    return send_from_directory(EXPORT_DIR, fname, as_attachment=True)


@app.route("/gaps", methods=["GET"])
def list_gaps():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT a.id, a.anomaly_type, a.gap_detail,
                   pb.batch_code, s.student_code, s.student_name, q.question_code, q.question_text
            FROM anomalies a
            JOIN batch_records br ON br.id = a.batch_record_id
            JOIN processing_batches pb ON pb.id = br.batch_id
            JOIN wrong_answers wa ON wa.id = br.wrong_answer_id
            JOIN students s ON s.id = wa.student_id
            JOIN questions q ON q.id = wa.question_id
            WHERE a.anomaly_type = 'historical_score_missing' AND a.reviewed = 0
            ORDER BY a.id
        """)
        rows = [dict(r) for r in c.fetchall()]
    return jsonify(rows)


def run():
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    run()
