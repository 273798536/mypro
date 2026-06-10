import os
import sqlite3
import json
from datetime import datetime
from flask import Flask, request, jsonify, g, render_template

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pcr_inspection.db")


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
    db = sqlite3.connect(DB_PATH)
    db.executescript("""
    CREATE TABLE IF NOT EXISTS samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_code TEXT UNIQUE NOT NULL,
        species TEXT NOT NULL,
        sampling_location TEXT NOT NULL,
        collection_date TEXT NOT NULL,
        pathology_notes TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS corrections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT NOT NULL,
        new_value TEXT NOT NULL,
        reason TEXT NOT NULL,
        corrected_by TEXT DEFAULT 'admin',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (sample_id) REFERENCES samples(id)
    );

    CREATE TABLE IF NOT EXISTS conclusions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER NOT NULL UNIQUE,
        result TEXT DEFAULT '',
        status TEXT DEFAULT 'needs_review',
        review_opinion TEXT DEFAULT '',
        reviewer TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (sample_id) REFERENCES samples(id)
    );

    CREATE TABLE IF NOT EXISTS lineage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conclusion_id INTEGER NOT NULL,
        source_sample_code TEXT NOT NULL,
        source_material TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (conclusion_id) REFERENCES conclusions(id)
    );

    CREATE TABLE IF NOT EXISTS review_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER NOT NULL,
        flag_type TEXT NOT NULL,
        message TEXT NOT NULL,
        resolved INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (sample_id) REFERENCES samples(id)
    );
    """)
    db.commit()
    db.close()


def actionable_error(error_type, detail, suggestion=""):
    return {
        "ok": False,
        "error": {
            "type": error_type,
            "detail": detail,
            "suggestion": suggestion,
        },
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/samples/import", methods=["POST"])
def import_samples():
    db = get_db()
    data = request.get_json(force=True)
    if not data or "samples" not in data:
        return jsonify(actionable_error(
            "missing_field",
            "请求体缺少 samples 字段",
            "请提供 {\"samples\": [{\"sample_code\":\"...\",\"species\":\"...\",\"sampling_location\":\"...\",\"collection_date\":\"...\"}]}"
        )), 400

    results = {"imported": [], "duplicates": [], "errors": []}
    for idx, s in enumerate(data["samples"]):
        required = ["sample_code", "species", "sampling_location", "collection_date"]
        missing = [f for f in required if not s.get(f)]
        if missing:
            results["errors"].append({
                "index": idx,
                "sample_code": s.get("sample_code", ""),
                "message": f"缺少必填字段: {', '.join(missing)}",
                "suggestion": f"请补充 {', '.join(missing)} 后重新导入该样本",
            })
            continue

        existing = db.execute("SELECT id FROM samples WHERE sample_code = ?", (s["sample_code"],)).fetchone()
        if existing:
            results["duplicates"].append({
                "index": idx,
                "sample_code": s["sample_code"],
                "existing_id": existing["id"],
                "message": f"样本编号 {s['sample_code']} 已存在（ID: {existing['id']}），已跳过",
                "suggestion": "如需更新，请使用 PUT /api/samples/<id> 接口修改，或先删除旧记录再导入",
            })
            continue

        cur = db.execute(
            "INSERT INTO samples (sample_code, species, sampling_location, collection_date, pathology_notes, status) VALUES (?,?,?,?,?,?)",
            (s["sample_code"], s["species"], s["sampling_location"], s["collection_date"], s.get("pathology_notes", ""), s.get("status", "pending"))
        )
        sample_id = cur.lastrowid

        db.execute(
            "INSERT INTO conclusions (sample_id, result, status, review_opinion) VALUES (?,?,'needs_review','')",
            (sample_id, "")
        )
        conclusion_id = db.execute("SELECT id FROM conclusions WHERE sample_id = ?", (sample_id,)).fetchone()["id"]

        db.execute(
            "INSERT INTO lineage (conclusion_id, source_sample_code, source_material, description) VALUES (?,?,?,?)",
            (conclusion_id, s["sample_code"], s["species"], f"来源于 {s['sampling_location']} 采集的 {s['species']} 样本")
        )

        results["imported"].append({"id": sample_id, "sample_code": s["sample_code"]})

    db.commit()
    return jsonify({"ok": True, "data": results})


@app.route("/api/samples", methods=["GET"])
def list_samples():
    db = get_db()
    location = request.args.get("sampling_location", "")
    species = request.args.get("species", "")
    status = request.args.get("status", "")

    query = """
        SELECT s.*, c.status AS conclusion_status, c.result AS conclusion_result, c.id AS conclusion_id
        FROM samples s LEFT JOIN conclusions c ON s.id = c.sample_id WHERE 1=1
    """
    params = []
    if location:
        query += " AND s.sampling_location = ?"
        params.append(location)
    if species:
        query += " AND s.species = ?"
        params.append(species)
    if status:
        query += " AND s.status = ?"
        params.append(status)
    query += " ORDER BY s.created_at DESC"

    rows = db.execute(query, params).fetchall()
    samples = [dict(r) for r in rows]
    return jsonify({"ok": True, "data": samples})


@app.route("/api/samples/<int:sample_id>", methods=["GET"])
def get_sample(sample_id):
    db = get_db()
    sample = db.execute("SELECT * FROM samples WHERE id = ?", (sample_id,)).fetchone()
    if not sample:
        return jsonify(actionable_error(
            "not_found",
            f"样本 ID {sample_id} 不存在",
            "请检查样本 ID 是否正确，或通过 GET /api/samples 查看所有样本"
        )), 404

    conclusion = db.execute("SELECT * FROM conclusions WHERE sample_id = ?", (sample_id,)).fetchone()
    corrections = db.execute("SELECT * FROM corrections WHERE sample_id = ? ORDER BY created_at DESC", (sample_id,)).fetchall()
    flags = db.execute("SELECT * FROM review_flags WHERE sample_id = ? AND resolved = 0 ORDER BY created_at DESC", (sample_id,)).fetchall()

    result = dict(sample)
    result["conclusion"] = dict(conclusion) if conclusion else None
    result["corrections"] = [dict(c) for c in corrections]
    result["review_flags"] = [dict(f) for f in flags]

    if conclusion:
        lineages = db.execute("SELECT * FROM lineage WHERE conclusion_id = ?", (conclusion["id"],)).fetchall()
        result["conclusion"]["lineage"] = [dict(l) for l in lineages]

    return jsonify({"ok": True, "data": result})


@app.route("/api/samples/<int:sample_id>", methods=["PUT"])
def update_sample(sample_id):
    db = get_db()
    sample = db.execute("SELECT * FROM samples WHERE id = ?", (sample_id,)).fetchone()
    if not sample:
        return jsonify(actionable_error(
            "not_found",
            f"样本 ID {sample_id} 不存在",
            "请检查样本 ID 是否正确"
        )), 404

    data = request.get_json(force=True)
    old_location = sample["sampling_location"]
    new_location = data.get("sampling_location", old_location)

    fields = []
    values = []
    for col in ["species", "sampling_location", "collection_date", "pathology_notes", "status"]:
        if col in data:
            fields.append(f"{col} = ?")
            values.append(data[col])

    if not fields:
        return jsonify(actionable_error(
            "no_changes",
            "未提供任何需要更新的字段",
            "请至少提供一个字段: species, sampling_location, collection_date, pathology_notes, status"
        )), 400

    fields.append("updated_at = datetime('now','localtime')")
    values.append(sample_id)
    db.execute(f"UPDATE samples SET {', '.join(fields)} WHERE id = ?", values)

    if new_location != old_location:
        conclusion = db.execute("SELECT * FROM conclusions WHERE sample_id = ?", (sample_id,)).fetchone()
        if conclusion and conclusion["status"] == "confirmed":
            db.execute(
                "UPDATE conclusions SET status = 'needs_review', review_opinion = ?, updated_at = datetime('now','localtime') WHERE sample_id = ?",
                (f"采样地点已从「{old_location}」变更为「{new_location}」，需重新复核", sample_id)
            )
        db.execute(
            "INSERT INTO review_flags (sample_id, flag_type, message) VALUES (?,?,?)",
            (sample_id, "location_changed", f"采样地点从「{old_location}」变更为「{new_location}」，复核意见和结论需重新确认")
        )

    db.commit()
    return jsonify({"ok": True, "data": {"id": sample_id, "location_changed": new_location != old_location}})


@app.route("/api/samples/<int:sample_id>/correct", methods=["POST"])
def correct_sample(sample_id):
    db = get_db()
    sample = db.execute("SELECT * FROM samples WHERE id = ?", (sample_id,)).fetchone()
    if not sample:
        return jsonify(actionable_error(
            "not_found",
            f"样本 ID {sample_id} 不存在",
            "请检查样本 ID 是否正确"
        )), 404

    data = request.get_json(force=True)
    field_name = data.get("field_name")
    new_value = data.get("new_value")
    reason = data.get("reason", "")

    if not field_name or new_value is None:
        return jsonify(actionable_error(
            "missing_field",
            "缺少 field_name 或 new_value",
            "请提供 {\"field_name\": \"pathology_notes\", \"new_value\": \"...\", \"reason\": \"...\"}"
        )), 400

    allowed = ["species", "sampling_location", "collection_date", "pathology_notes"]
    if field_name not in allowed:
        return jsonify(actionable_error(
            "invalid_field",
            f"不允许修正字段: {field_name}",
            f"可修正字段: {', '.join(allowed)}"
        )), 400

    old_value = sample[field_name] or ""

    db.execute(
        "INSERT INTO corrections (sample_id, field_name, old_value, new_value, reason, corrected_by) VALUES (?,?,?,?,?,?)",
        (sample_id, field_name, old_value, new_value, reason, data.get("corrected_by", "admin"))
    )

    db.execute(
        f"UPDATE samples SET {field_name} = ?, updated_at = datetime('now','localtime') WHERE id = ?",
        (new_value, sample_id)
    )

    if field_name == "sampling_location":
        conclusion = db.execute("SELECT * FROM conclusions WHERE sample_id = ?", (sample_id,)).fetchone()
        if conclusion and conclusion["status"] == "confirmed":
            db.execute(
                "UPDATE conclusions SET status = 'needs_review', review_opinion = ?, updated_at = datetime('now','localtime') WHERE sample_id = ?",
                (f"采样地点已修正从「{old_value}」至「{new_value}」，需重新复核", sample_id)
            )
        db.execute(
            "INSERT INTO review_flags (sample_id, flag_type, message) VALUES (?,?,?)",
            (sample_id, "location_corrected", f"采样地点修正: {old_value} → {new_value}，复核意见和结论需重新确认")
        )

    db.commit()
    return jsonify({"ok": True, "data": {"sample_id": sample_id, "field": field_name, "old": old_value, "new": new_value}})


@app.route("/api/statistics/groups", methods=["GET"])
def group_statistics():
    db = get_db()
    group_by = request.args.get("group_by", "sampling_location")
    allowed_groups = ["sampling_location", "species", "collection_date", "status"]
    if group_by not in allowed_groups:
        return jsonify(actionable_error(
            "invalid_group",
            f"不支持按 {group_by} 分组",
            f"可选分组字段: {', '.join(allowed_groups)}"
        )), 400

    query = f"""
        SELECT s.{group_by} AS group_key,
               COUNT(*) AS total,
               SUM(CASE WHEN c.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
               SUM(CASE WHEN c.status = 'needs_review' THEN 1 ELSE 0 END) AS needs_review,
               SUM(CASE WHEN c.status = 'draft' THEN 1 ELSE 0 END) AS draft
        FROM samples s LEFT JOIN conclusions c ON s.id = c.sample_id
        GROUP BY s.{group_by}
        ORDER BY total DESC
    """
    rows = db.execute(query).fetchall()
    groups = [dict(r) for r in rows]
    return jsonify({"ok": True, "data": {"group_by": group_by, "groups": groups}})


@app.route("/api/conclusions", methods=["GET"])
def list_conclusions():
    db = get_db()
    status = request.args.get("status", "")

    query = """
        SELECT c.*, s.sample_code, s.species, s.sampling_location, s.collection_date
        FROM conclusions c JOIN samples s ON c.sample_id = s.id WHERE 1=1
    """
    params = []
    if status:
        query += " AND c.status = ?"
        params.append(status)
    query += " ORDER BY c.updated_at DESC"

    rows = db.execute(query, params).fetchall()
    conclusions = []
    for r in rows:
        c = dict(r)
        lineages = db.execute("SELECT * FROM lineage WHERE conclusion_id = ?", (r["id"],)).fetchall()
        c["lineage"] = [dict(l) for l in lineages]
        conclusions.append(c)

    return jsonify({"ok": True, "data": conclusions})


@app.route("/api/conclusions/<int:conclusion_id>", methods=["GET"])
def get_conclusion(conclusion_id):
    db = get_db()
    conclusion = db.execute(
        "SELECT c.*, s.sample_code, s.species, s.sampling_location, s.collection_date, s.id AS sample_id FROM conclusions c JOIN samples s ON c.sample_id = s.id WHERE c.id = ?",
        (conclusion_id,)
    ).fetchone()
    if not conclusion:
        return jsonify(actionable_error(
            "not_found",
            f"结论 ID {conclusion_id} 不存在",
            "请检查结论 ID 是否正确，或通过 GET /api/conclusions 查看所有结论"
        )), 404

    result = dict(conclusion)
    lineages = db.execute("SELECT * FROM lineage WHERE conclusion_id = ?", (conclusion_id,)).fetchall()
    result["lineage"] = [dict(l) for l in lineages]

    corrections = db.execute(
        "SELECT * FROM corrections WHERE sample_id = ? ORDER BY created_at DESC",
        (conclusion["sample_id"],)
    ).fetchall()
    result["corrections"] = [dict(c) for c in corrections]

    flags = db.execute(
        "SELECT * FROM review_flags WHERE sample_id = ? AND resolved = 0",
        (conclusion["sample_id"],)
    ).fetchall()
    result["review_flags"] = [dict(f) for f in flags]

    return jsonify({"ok": True, "data": result})


@app.route("/api/conclusions/<int:conclusion_id>", methods=["PUT"])
def update_conclusion(conclusion_id):
    db = get_db()
    conclusion = db.execute("SELECT * FROM conclusions WHERE id = ?", (conclusion_id,)).fetchone()
    if not conclusion:
        return jsonify(actionable_error(
            "not_found",
            f"结论 ID {conclusion_id} 不存在",
            "请检查结论 ID 是否正确"
        )), 404

    sample = db.execute("SELECT * FROM samples WHERE id = ?", (conclusion["sample_id"],)).fetchone()
    data = request.get_json(force=True)

    if data.get("status") == "confirmed":
        if not sample["pathology_notes"]:
            return jsonify(actionable_error(
                "missing_pathology_notes",
                f"样本 {sample['sample_code']} 缺少病理备注，无法确认为已复核",
                f"请先在样本编辑中补充 {sample['sample_code']} 的病理备注，再确认结论"
            )), 422
        if not data.get("review_opinion") and not conclusion["review_opinion"]:
            return jsonify(actionable_error(
                "missing_review_opinion",
                f"样本 {sample['sample_code']} 缺少复核意见，无法确认为已复核",
                f"请先填写 {sample['sample_code']} 的复核意见，再确认结论"
            )), 422

    fields = []
    values = []
    for col in ["result", "status", "review_opinion", "reviewer"]:
        if col in data:
            fields.append(f"{col} = ?")
            values.append(data[col])

    if not fields:
        return jsonify(actionable_error(
            "no_changes",
            "未提供任何需要更新的字段",
            "请至少提供一个字段: result, status, review_opinion, reviewer"
        )), 400

    fields.append("updated_at = datetime('now','localtime')")
    values.append(conclusion_id)
    db.execute(f"UPDATE conclusions SET {', '.join(fields)} WHERE id = ?", values)

    if data.get("status") in ("confirmed", "draft"):
        db.execute("UPDATE review_flags SET resolved = 1 WHERE sample_id = ?", (conclusion["sample_id"],))

    db.commit()
    return jsonify({"ok": True, "data": {"id": conclusion_id}})


@app.route("/api/lineage/<int:conclusion_id>", methods=["GET"])
def get_lineage(conclusion_id):
    db = get_db()
    conclusion = db.execute("SELECT * FROM conclusions WHERE id = ?", (conclusion_id,)).fetchone()
    if not conclusion:
        return jsonify(actionable_error(
            "not_found",
            f"结论 ID {conclusion_id} 不存在",
            "请检查结论 ID 是否正确"
        )), 404

    lineages = db.execute("SELECT * FROM lineage WHERE conclusion_id = ?", (conclusion_id,)).fetchall()
    sample = db.execute("SELECT * FROM samples WHERE id = ?", (conclusion["sample_id"],)).fetchone()

    return jsonify({
        "ok": True,
        "data": {
            "conclusion_id": conclusion_id,
            "sample_code": sample["sample_code"] if sample else "",
            "conclusion_result": conclusion["result"],
            "conclusion_status": conclusion["status"],
            "lineage": [dict(l) for l in lineages],
        }
    })


@app.route("/api/lineage", methods=["POST"])
def add_lineage():
    db = get_db()
    data = request.get_json(force=True)
    conclusion_id = data.get("conclusion_id")
    if not conclusion_id:
        return jsonify(actionable_error(
            "missing_field",
            "缺少 conclusion_id",
            "请提供 {\"conclusion_id\": 1, \"source_sample_code\": \"...\", \"source_material\": \"...\", \"description\": \"...\"}"
        )), 400

    conclusion = db.execute("SELECT * FROM conclusions WHERE id = ?", (conclusion_id,)).fetchone()
    if not conclusion:
        return jsonify(actionable_error(
            "not_found",
            f"结论 ID {conclusion_id} 不存在",
            "请检查结论 ID 是否正确"
        )), 404

    db.execute(
        "INSERT INTO lineage (conclusion_id, source_sample_code, source_material, description) VALUES (?,?,?,?)",
        (conclusion_id, data.get("source_sample_code", ""), data.get("source_material", ""), data.get("description", ""))
    )
    db.commit()
    return jsonify({"ok": True, "data": {"conclusion_id": conclusion_id}})


@app.route("/api/review-flags", methods=["GET"])
def list_review_flags():
    db = get_db()
    resolved = request.args.get("resolved", "0")
    rows = db.execute(
        "SELECT f.*, s.sample_code, s.sampling_location FROM review_flags f JOIN samples s ON f.sample_id = s.id WHERE f.resolved = ? ORDER BY f.created_at DESC",
        (int(resolved),)
    ).fetchall()
    return jsonify({"ok": True, "data": [dict(r) for r in rows]})


@app.route("/api/review-flags/<int:flag_id>/resolve", methods=["POST"])
def resolve_flag(flag_id):
    db = get_db()
    flag = db.execute("SELECT * FROM review_flags WHERE id = ?", (flag_id,)).fetchone()
    if not flag:
        return jsonify(actionable_error(
            "not_found",
            f"标记 ID {flag_id} 不存在",
            "请检查标记 ID 是否正确"
        )), 404

    db.execute("UPDATE review_flags SET resolved = 1 WHERE id = ?", (flag_id,))
    db.commit()
    return jsonify({"ok": True, "data": {"id": flag_id, "resolved": True}})


@app.route("/api/reset", methods=["POST"])
def reset_db():
    db = get_db()
    for table in ["lineage", "corrections", "review_flags", "conclusions", "samples"]:
        db.execute(f"DELETE FROM {table}")
    db.commit()
    return jsonify({"ok": True, "message": "数据库已清空"})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
