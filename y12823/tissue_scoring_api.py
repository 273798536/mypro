import os
import sys
from flask import Flask, request, jsonify

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tissue_scoring import init_db, import_batch, review_score, list_records, show_record, link_micrograph, diff_analysis, get_db

app = Flask(__name__)
DB_PATH = os.environ.get("TISSUE_SCORING_DB", "tissue_scoring.db")


@app.route("/api/init", methods=["POST"])
def api_init():
    reset = request.json.get("reset", False) if request.json else False
    if reset and os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    init_db(DB_PATH)
    return jsonify({"status": "ok", "db": DB_PATH})


@app.route("/api/import", methods=["POST"])
def api_import():
    d = request.json
    force = d.get("force", False)
    try:
        import_batch(DB_PATH, d["batch_id"], d["sample_id"], d["score"],
                     d.get("annotation_boundary", "clear"), d.get("conclusion", ""), force)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    return jsonify({"status": "ok"})


@app.route("/api/review", methods=["POST"])
def api_review():
    d = request.json
    try:
        review_score(DB_PATH, d["batch_id"], d["sample_id"], d["score"],
                     d["reason"], d["reviewer"], d.get("conclusion"), d.get("annotation_boundary"))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    return jsonify({"status": "ok"})


@app.route("/api/records", methods=["GET"])
def api_list():
    batch_id = request.args.get("batch_id")
    boundary = request.args.get("annotation_boundary")
    conn = get_db(DB_PATH)
    try:
        sql = "SELECT r.id, r.batch_id, r.sample_id, r.score, r.annotation_boundary, r.conclusion, " \
              "r.created_at, r.updated_at, " \
              "(SELECT COUNT(*) FROM micrographs m WHERE m.record_id=r.id) AS micrograph_count " \
              "FROM scoring_records r WHERE 1=1"
        params = []
        if batch_id:
            sql += " AND r.batch_id=?"
            params.append(batch_id)
        if boundary:
            sql += " AND r.annotation_boundary=?"
            params.append(boundary)
        rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
        return jsonify(rows)
    finally:
        conn.close()


@app.route("/api/records/<batch_id>/<sample_id>", methods=["GET"])
def api_show(batch_id, sample_id):
    conn = get_db(DB_PATH)
    try:
        rec = conn.execute(
            "SELECT * FROM scoring_records WHERE batch_id=? AND sample_id=?",
            (batch_id, sample_id),
        ).fetchone()
        if not rec:
            return jsonify({"status": "error", "message": "not found"}), 404

        result = dict(rec)
        result["micrographs"] = [dict(r) for r in conn.execute(
            "SELECT id, file_path, description, created_at FROM micrographs WHERE record_id=?",
            (rec["id"],),
        ).fetchall()]
        result["review_history"] = [dict(r) for r in conn.execute(
            "SELECT * FROM review_opinions WHERE record_id=? ORDER BY created_at",
            (rec["id"],),
        ).fetchall()]
        return jsonify(result)
    finally:
        conn.close()


@app.route("/api/link-photo", methods=["POST"])
def api_link():
    d = request.json
    try:
        link_micrograph(DB_PATH, d["batch_id"], d["sample_id"], d["file_path"], d.get("description", ""))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    return jsonify({"status": "ok"})


@app.route("/api/diff", methods=["GET"])
def api_diff():
    batch_id = request.args.get("batch_id")
    since = request.args.get("since")
    conn = get_db(DB_PATH)
    try:
        sql = "SELECT ro.*, r.batch_id, r.sample_id FROM review_opinions ro " \
              "JOIN scoring_records r ON ro.record_id=r.id WHERE 1=1"
        params = []
        if batch_id:
            sql += " AND r.batch_id=?"
            params.append(batch_id)
        if since:
            sql += " AND ro.created_at>=?"
            params.append(since)
        sql += " ORDER BY ro.created_at"
        rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
        return jsonify(rows)
    finally:
        conn.close()


if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        init_db(DB_PATH)
    app.run(host="0.0.0.0", port=5230, debug=False)
