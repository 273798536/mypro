import os
import json
import sqlite3
import csv
import io
import datetime
from contextlib import contextmanager
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
from flask import Flask, request, jsonify, send_file, g
from flask_cors import CORS

from fractal_core import (
    box_counting_dimension, correlation_dimension, information_dimension,
    compute_all_dimensions, compare_before_after,
    generate_cantor_set, generate_koch_curve, generate_sierpinski_triangle,
    generate_random_points, generate_uniform_line,
    generate_boundary_unstable_sorting, generate_duplicate_points_fractal,
    generate_sparse_boundary
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "fractal_estimator.db")

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

STATUS_FLOW = ["待导入", "已导入待计算", "计算中", "计算完成待复核", "复核通过", "复核驳回", "已导出报告"]

ALLOWED_TRANSITIONS = {
    "待导入": ["已导入待计算"],
    "已导入待计算": ["计算中"],
    "计算中": ["计算完成待复核", "已导入待计算"],
    "计算完成待复核": ["复核通过", "复核驳回"],
    "复核驳回": ["已导入待计算"],
    "复核通过": ["已导出报告"],
    "已导出报告": [],
}

UNIT_HANDLING_STEPS = ["重复运行", "补录单位", "人工确认"]


@contextmanager
def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
        g._database = None


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT '待导入',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        total_problems INTEGER DEFAULT 0,
        computed_problems INTEGER DEFAULT 0,
        missing_problems TEXT DEFAULT '[]',
        notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS problems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER NOT NULL,
        problem_no TEXT NOT NULL,
        student_name TEXT DEFAULT '',
        student_id TEXT DEFAULT '',
        raw_data TEXT NOT NULL,
        units TEXT DEFAULT '',
        params TEXT DEFAULT '{}',
        results TEXT DEFAULT '{}',
        status TEXT NOT NULL DEFAULT '待计算',
        score REAL,
        teacher_comment TEXT DEFAULT '',
        handling_log TEXT DEFAULT '[]',
        unit_missing INTEGER DEFAULT 0,
        retry_count INTEGER DEFAULT 0,
        manually_confirmed INTEGER DEFAULT 0,
        before_after_compare TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS status_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        problem_id INTEGER,
        from_status TEXT,
        to_status TEXT NOT NULL,
        operator TEXT DEFAULT 'system',
        comment TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS counterexamples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        before_points TEXT NOT NULL,
        after_points TEXT NOT NULL,
        compare_result TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
    );
    """)
    conn.commit()
    conn.close()


def now_str() -> str:
    return datetime.datetime.now().isoformat()


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    for k in ["raw_data", "params", "results", "handling_log", "missing_problems",
              "before_after_compare", "compare_result", "before_points", "after_points"]:
        if k in d and d[k]:
            try:
                d[k] = json.loads(d[k])
            except (json.JSONDecodeError, TypeError):
                pass
    return d


def log_status(db: sqlite3.Connection, to_status: str, batch_id: Optional[int] = None,
               problem_id: Optional[int] = None, from_status: Optional[str] = None,
               operator: str = "system", comment: str = ""):
    db.execute(
        "INSERT INTO status_logs (batch_id, problem_id, from_status, to_status, operator, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (batch_id, problem_id, from_status, to_status, operator, comment, now_str())
    )


def parse_points_from_text(text: str) -> Tuple[Optional[np.ndarray], List[str]]:
    errors = []
    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    if not lines:
        return None, ["数据为空"]

    points = []
    for i, line in enumerate(lines, 1):
        parts = [p for p in line.replace(",", " ").replace(";", " ").replace("\t", " ").split() if p]
        if not parts:
            continue
        try:
            coords = [float(p) for p in parts if _is_number(p)]
            if coords:
                points.append(coords)
            else:
                errors.append(f"第{i}行无法解析数值: {line[:30]}")
        except ValueError:
            errors.append(f"第{i}行格式错误: {line[:30]}")

    if not points:
        return None, errors or ["无有效数据点"]

    n_cols = max(len(p) for p in points)
    normalized = []
    for p in points:
        while len(p) < n_cols:
            p.append(0.0)
        normalized.append(p[:n_cols])
    return np.array(normalized), errors


def _is_number(s: str) -> bool:
    try:
        float(s)
        return True
    except ValueError:
        return False


def sample_real_bad_data() -> List[Dict[str, Any]]:
    return [
        {
            "problem_no": "F-001",
            "student_name": "张三",
            "student_id": "20230101",
            "raw_data": "\n".join([f"{x}, {x * 0.3 + (i % 3) * 0.005}" for i, x in enumerate(np.random.rand(200))]),
            "units": "",
            "teacher_comment": "典型缺单位案例，学生只给了数值没写坐标含义",
            "simulate_bad": True
        },
        {
            "problem_no": "F-002",
            "student_name": "李四",
            "student_id": "20230102",
            "raw_data": "\n".join([f"{x}" for x in list(np.random.rand(30)) + ["", "abc", "??"] + list(np.random.rand(30))]),
            "units": "cm",
            "teacher_comment": "数据中混入非数值和空行，像平时作业里会混进来的小麻烦",
            "simulate_bad": True
        },
        {
            "problem_no": "F-003",
            "student_name": "王五",
            "student_id": "20230103",
            "raw_data": "0.0, 0.0\n" + "\n".join([f"{x}" for x in np.random.rand(50)]),
            "units": "m",
            "teacher_comment": "维度不一致，有的行给了二维坐标有的只给了一维",
            "simulate_bad": True
        }
    ]


def boundary_examples() -> List[Dict[str, Any]]:
    np.random.seed(42)
    n = 3000
    filled = np.random.rand(n, 2)

    border = np.vstack([
        np.column_stack([np.linspace(0, 1, 750), np.zeros(750)]),
        np.column_stack([np.linspace(0, 1, 750), np.ones(750)]),
        np.column_stack([np.zeros(750), np.linspace(0, 1, 750)]),
        np.column_stack([np.ones(750), np.linspace(0, 1, 750)])
    ])

    base_fractal = generate_koch_curve(n_levels=3)
    n_dup = 30
    repeated = np.repeat(base_fractal, n_dup, axis=0)
    tiny_noise = np.random.normal(0, 1e-9, repeated.shape)
    repeated_noisy = repeated + tiny_noise
    deduped = np.unique(repeated_noisy.round(decimals=8), axis=0)

    sparse = generate_sparse_boundary(n=20, dense_center=800)
    densified = sparse.copy()
    extra_border = np.random.rand(400, 2)
    extra_border[:, 0] = np.where(extra_border[:, 0] < 0.5, 0.0, 1.0)
    extra_border2 = np.random.rand(400, 2)
    extra_border2[:, 1] = np.where(extra_border2[:, 1] < 0.5, 0.0, 1.0)
    extra_corners = np.array([[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]] * 50)
    densified = np.vstack([densified, extra_border, extra_border2, extra_corners])

    return [
        {
            "name": "排序不稳定（内部噪点干扰）",
            "description": "学生把区域内部采样点也混进来，正确做法应该只取边界轮廓；排序和清洗后维数显著降低",
            "before_points": filled.tolist(),
            "after_points": border.tolist(),
            "before_note": "混入内部噪点（接近平面填充，维数≈2）",
            "after_note": "清洗后仅保留轮廓（维数≈1）"
        },
        {
            "name": "重复点去重",
            "description": "数据采集时仪器重复读数产生大量重复点，会压低盒计数维数估计",
            "before_points": repeated_noisy.tolist(),
            "after_points": deduped.tolist(),
            "before_note": "含大量重复点",
            "after_note": "去重后"
        },
        {
            "name": "边界采样稀疏",
            "description": "边界点稀疏时结果偏低，补采样后更接近真实维数",
            "before_points": sparse.tolist(),
            "after_points": densified.tolist(),
            "before_note": "边界采样不足",
            "after_note": "边界补采样后"
        }
    ]


@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.route("/api/batches", methods=["GET"])
def list_batches():
    with get_db() as db:
        rows = db.execute("SELECT * FROM batches ORDER BY updated_at DESC").fetchall()
        return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/batches", methods=["POST"])
def create_batch():
    data = request.get_json() or {}
    name = data.get("name") or f"批次-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}"
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO batches (name, status, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (name, "待导入", now_str(), now_str())
        )
        batch_id = cur.lastrowid
        log_status(db, "待导入", batch_id=batch_id, comment="创建批次")
        return jsonify({"id": batch_id, "name": name, "status": "待导入"})


@app.route("/api/batches/<int:batch_id>", methods=["GET"])
def get_batch(batch_id: int):
    with get_db() as db:
        row = db.execute("SELECT * FROM batches WHERE id=?", (batch_id,)).fetchone()
        if not row:
            return jsonify({"error": "批次不存在"}), 404
        problems = db.execute(
            "SELECT * FROM problems WHERE batch_id=? ORDER BY problem_no",
            (batch_id,)
        ).fetchall()
        logs = db.execute(
            "SELECT * FROM status_logs WHERE batch_id=? ORDER BY created_at DESC",
            (batch_id,)
        ).fetchall()
        return jsonify({
            "batch": row_to_dict(row),
            "problems": [row_to_dict(p) for p in problems],
            "logs": [row_to_dict(l) for l in logs]
        })


@app.route("/api/batches/<int:batch_id>/status", methods=["POST"])
def advance_batch_status(batch_id: int):
    data = request.get_json() or {}
    target = data.get("status")
    operator = data.get("operator", "teacher")
    comment = data.get("comment", "")
    with get_db() as db:
        row = db.execute("SELECT * FROM batches WHERE id=?", (batch_id,)).fetchone()
        if not row:
            return jsonify({"error": "批次不存在"}), 404
        current = row["status"]
        if target not in ALLOWED_TRANSITIONS.get(current, []):
            return jsonify({"error": f"不允许从 {current} 转移到 {target}"}), 400
        db.execute(
            "UPDATE batches SET status=?, updated_at=? WHERE id=?",
            (target, now_str(), batch_id)
        )
        log_status(db, target, batch_id=batch_id, from_status=current, operator=operator, comment=comment)
        return jsonify({"ok": True, "status": target})


@app.route("/api/batches/<int:batch_id>/import", methods=["POST"])
def import_problems(batch_id: int):
    data = request.get_json() or {}
    problems_data = data.get("problems", [])
    use_sample = data.get("use_sample", False)

    if use_sample and not problems_data:
        problems_data = sample_real_bad_data()

    with get_db() as db:
        batch = db.execute("SELECT * FROM batches WHERE id=?", (batch_id,)).fetchone()
        if not batch:
            return jsonify({"error": "批次不存在"}), 404

        count = 0
        unit_missing_count = 0
        for p in problems_data:
            raw = p.get("raw_data", "")
            if not raw.strip():
                continue
            units = (p.get("units") or "").strip()
            unit_missing = 1 if not units else 0
            if unit_missing:
                unit_missing_count += 1

            cur = db.execute(
                """INSERT INTO problems (batch_id, problem_no, student_name, student_id, raw_data, units,
                   status, unit_missing, teacher_comment, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, '已导入待计算', ?, ?, ?, ?)""",
                (batch_id, p.get("problem_no", f"P{count+1}"),
                 p.get("student_name", ""), p.get("student_id", ""),
                 raw, units, unit_missing, p.get("teacher_comment", ""),
                 now_str(), now_str())
            )
            pid = cur.lastrowid
            if unit_missing:
                db.execute(
                    "UPDATE problems SET handling_log=? WHERE id=?",
                    (json.dumps([{"step": "检测到单位缺失", "time": now_str(),
                                  "detail": "已标记，后续需执行重复运行、补录、人工确认三步"}]), pid)
                )
            log_status(db, "已导入待计算", problem_id=pid, from_status="待计算", comment="导入")
            count += 1

        new_status = "已导入待计算" if count > 0 else batch["status"]
        db.execute(
            "UPDATE batches SET status=?, total_problems=?, updated_at=? WHERE id=?",
            (new_status, count, now_str(), batch_id)
        )
        if count > 0:
            log_status(db, new_status, batch_id=batch_id, from_status=batch["status"],
                       comment=f"导入 {count} 条题目，其中 {unit_missing_count} 条缺失单位")

        return jsonify({"imported": count, "unit_missing": unit_missing_count, "status": new_status})


@app.route("/api/batches/<int:batch_id>/compute", methods=["POST"])
def compute_batch(batch_id: int):
    with get_db() as db:
        batch = db.execute("SELECT * FROM batches WHERE id=?", (batch_id,)).fetchone()
        if not batch:
            return jsonify({"error": "批次不存在"}), 404

        problems = db.execute(
            "SELECT * FROM problems WHERE batch_id=?", (batch_id,)
        ).fetchall()

        default_params = {
            "methods": ["box_counting", "correlation", "information"],
            "box_sizes": None,
            "tolerance": 0.001
        }

        computed = 0
        missing = []
        partial_results = []

        for p in problems:
            pid = p["id"]
            pno = p["problem_no"]
            raw = p["raw_data"] if isinstance(p["raw_data"], str) else json.dumps(p["raw_data"])

            points, parse_errors = parse_points_from_text(raw)
            if points is None or len(points) == 0:
                missing.append({
                    "problem_no": pno,
                    "student_name": p["student_name"],
                    "reason": "; ".join(parse_errors) if parse_errors else "无法解析数据"
                })
                db.execute(
                    "UPDATE problems SET status='计算失败', updated_at=?, results=? WHERE id=?",
                    (now_str(), json.dumps({"error": parse_errors}), pid)
                )
                continue

            params = dict(default_params)
            try:
                results = compute_all_dimensions(points, methods=params.get("methods"))
                score = _auto_score(results)
                db.execute(
                    """UPDATE problems SET status='计算完成待复核', params=?, results=?, score=?,
                       updated_at=?, retry_count=retry_count+1 WHERE id=?""",
                    (json.dumps(params), json.dumps(results), score, now_str(), pid)
                )
                log_status(db, "计算完成待复核", problem_id=pid, from_status="已导入待计算",
                           comment=f"自动评分: {score}")
                partial_results.append({"problem_no": pno, "score": score, "results": results})
                computed += 1
            except Exception as e:
                missing.append({"problem_no": pno, "reason": f"计算异常: {str(e)}"})
                db.execute(
                    "UPDATE problems SET status='计算失败', updated_at=?, results=? WHERE id=?",
                    (now_str(), json.dumps({"error": str(e)}), pid)
                )

        new_status = "计算完成待复核" if computed > 0 else batch["status"]
        db.execute(
            """UPDATE batches SET status=?, computed_problems=?, missing_problems=?,
               updated_at=? WHERE id=?""",
            (new_status, computed, json.dumps(missing), now_str(), batch_id)
        )
        log_status(db, new_status, batch_id=batch_id, from_status=batch["status"],
                   comment=f"完成 {computed} 条，缺失/失败 {len(missing)} 条")

        return jsonify({
            "computed": computed,
            "missing": missing,
            "partial_results": partial_results,
            "status": new_status
        })


def _auto_score(results: Dict[str, Any]) -> Optional[float]:
    bc = results.get("box_counting", {})
    dim = bc.get("dimension")
    if dim is None:
        return None
    r2 = bc.get("r_squared", 0)
    score = max(0.0, min(100.0, 60 + (r2 - 0.8) * 200 if r2 >= 0.8 else r2 * 75))
    return round(score, 1)


@app.route("/api/problems/<int:problem_id>", methods=["GET"])
def get_problem(problem_id: int):
    with get_db() as db:
        p = db.execute("SELECT * FROM problems WHERE id=?", (problem_id,)).fetchone()
        if not p:
            return jsonify({"error": "不存在"}), 404
        ce = db.execute(
            "SELECT * FROM counterexamples WHERE problem_id=? ORDER BY created_at DESC",
            (problem_id,)
        ).fetchall()
        logs = db.execute(
            "SELECT * FROM status_logs WHERE problem_id=? ORDER BY created_at DESC",
            (problem_id,)
        ).fetchall()
        return jsonify({
            "problem": row_to_dict(p),
            "counterexamples": [row_to_dict(c) for c in ce],
            "logs": [row_to_dict(l) for l in logs]
        })


@app.route("/api/problems/<int:problem_id>/review", methods=["POST"])
def review_problem(problem_id: int):
    data = request.get_json() or {}
    passed = data.get("passed", True)
    comment = data.get("comment", "")
    score = data.get("score")
    operator = data.get("operator", "teacher")
    with get_db() as db:
        p = db.execute("SELECT * FROM problems WHERE id=?", (problem_id,)).fetchone()
        if not p:
            return jsonify({"error": "不存在"}), 404
        new_status = "复核通过" if passed else "复核驳回"
        updates = ["status=?", "teacher_comment=?", "updated_at=?"]
        vals = [new_status, comment, now_str()]
        if score is not None:
            updates.append("score=?")
            vals.append(float(score))
        vals.append(problem_id)
        db.execute(f"UPDATE problems SET {', '.join(updates)} WHERE id=?", vals)
        log_status(db, new_status, problem_id=problem_id, from_status=p["status"],
                   operator=operator, comment=comment)
        return jsonify({"ok": True, "status": new_status})


@app.route("/api/problems/<int:problem_id>/unit-handling", methods=["POST"])
def handle_unit_missing(problem_id: int):
    data = request.get_json() or {}
    step = data.get("step")
    detail = data.get("detail", "")
    unit_value = data.get("unit_value", "")

    if step not in UNIT_HANDLING_STEPS:
        return jsonify({"error": f"步骤必须是 {UNIT_HANDLING_STEPS} 之一"}), 400

    with get_db() as db:
        p = db.execute("SELECT * FROM problems WHERE id=?", (problem_id,)).fetchone()
        if not p:
            return jsonify({"error": "不存在"}), 404

        hlog = p["handling_log"] if isinstance(p["handling_log"], list) else json.loads(p["handling_log"] or "[]")
        hlog.append({"step": step, "time": now_str(), "detail": detail})

        updates = {"handling_log": json.dumps(hlog), "updated_at": now_str()}

        if step == "重复运行":
            raw = p["raw_data"] if isinstance(p["raw_data"], str) else json.dumps(p["raw_data"])
            points, _ = parse_points_from_text(raw)
            if points is not None:
                results = compute_all_dimensions(points)
                score = _auto_score(results)
                updates["results"] = json.dumps(results)
                updates["score"] = score
                updates["retry_count"] = (p["retry_count"] or 0) + 1

        if step == "补录单位" and unit_value:
            updates["units"] = unit_value
            updates["unit_missing"] = 0

        if step == "人工确认":
            updates["manually_confirmed"] = 1

        sets = ", ".join(f"{k}=?" for k in updates.keys())
        db.execute(f"UPDATE problems SET {sets} WHERE id=?", list(updates.values()) + [problem_id])

        steps_done = {h["step"] for h in hlog}
        all_done = all(s in steps_done for s in UNIT_HANDLING_STEPS)
        return jsonify({"ok": True, "steps_done": sorted(steps_done),
                        "all_required_done": all_done, "handling_log": hlog})


@app.route("/api/problems/<int:problem_id>/counterexample", methods=["POST"])
def add_counterexample(problem_id: int):
    data = request.get_json() or {}
    name = data.get("name", "反例")
    description = data.get("description", "")
    before_points = data.get("before_points")
    after_points = data.get("after_points")
    method = data.get("method", "box_counting")

    if not before_points or not after_points:
        return jsonify({"error": "需要提供处理前后数据"}), 400

    b = np.array(before_points)
    a = np.array(after_points)
    cmp_res = compare_before_after(b, a, method=method)

    with get_db() as db:
        cur = db.execute(
            """INSERT INTO counterexamples (problem_id, name, description, before_points,
               after_points, compare_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (problem_id, name, description, json.dumps(before_points),
             json.dumps(after_points), json.dumps(cmp_res), now_str())
        )
        ce_id = cur.lastrowid
        p = db.execute("SELECT * FROM problems WHERE id=?", (problem_id,)).fetchone()
        existing = p["before_after_compare"] if isinstance(p["before_after_compare"], dict) else json.loads(p["before_after_compare"] or "{}")
        existing[str(ce_id)] = cmp_res
        db.execute(
            "UPDATE problems SET before_after_compare=?, updated_at=? WHERE id=?",
            (json.dumps(existing), now_str(), problem_id)
        )
        return jsonify({"id": ce_id, "compare": cmp_res})


@app.route("/api/boundary-examples", methods=["GET"])
def get_boundary_examples():
    examples = boundary_examples()
    results = []
    for ex in examples:
        cmp_res = compare_before_after(np.array(ex["before_points"]), np.array(ex["after_points"]))
        results.append({
            **ex,
            "compare": cmp_res
        })
    return jsonify(results)


@app.route("/api/batches/<int:batch_id>/export", methods=["GET"])
def export_report(batch_id: int):
    fmt = request.args.get("format", "csv")
    with get_db() as db:
        batch = db.execute("SELECT * FROM batches WHERE id=?", (batch_id,)).fetchone()
        if not batch:
            return jsonify({"error": "不存在"}), 404
        problems = db.execute(
            "SELECT * FROM problems WHERE batch_id=? ORDER BY problem_no", (batch_id,)
        ).fetchall()

        if fmt == "json":
            report = {
                "batch": row_to_dict(batch),
                "exported_at": now_str(),
                "problems": []
            }
            for p in problems:
                pd = row_to_dict(p)
                ce = db.execute(
                    "SELECT name, description, compare_result FROM counterexamples WHERE problem_id=?",
                    (p["id"],)
                ).fetchall()
                pd["counterexamples"] = [row_to_dict(c) for c in ce]
                report["problems"].append(pd)
            buf = io.BytesIO(json.dumps(report, ensure_ascii=False, indent=2).encode("utf-8"))
            buf.seek(0)
            db.execute("UPDATE batches SET status='已导出报告', updated_at=? WHERE id=?",
                       (now_str(), batch_id))
            log_status(db, "已导出报告", batch_id=batch_id, from_status=batch["status"], comment="JSON报告导出")
            return send_file(buf, as_attachment=True, download_name=f"fractal_report_{batch_id}.json",
                             mimetype="application/json")

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "批次", "题目编号", "学生姓名", "学号", "单位", "状态", "盒计数维数", "R²",
            "关联维数", "信息维数", "评分", "处理意见", "单位缺失", "重复运行次数", "人工确认"
        ])
        for p in problems:
            res = p["results"] if isinstance(p["results"], dict) else json.loads(p["results"] or "{}")
            bc = res.get("box_counting", {})
            co = res.get("correlation", {})
            info = res.get("information", {})
            writer.writerow([
                batch["name"], p["problem_no"], p["student_name"], p["student_id"],
                p["units"], p["status"], bc.get("dimension"), bc.get("r_squared"),
                co.get("dimension"), info.get("dimension"), p["score"],
                p["teacher_comment"], "是" if p["unit_missing"] else "否",
                p["retry_count"] or 0, "是" if p["manually_confirmed"] else "否"
            ])
        db.execute("UPDATE batches SET status='已导出报告', updated_at=? WHERE id=?",
                   (now_str(), batch_id))
        log_status(db, "已导出报告", batch_id=batch_id, from_status=batch["status"], comment="CSV报告导出")
        mem = io.BytesIO(output.getvalue().encode("utf-8-sig"))
        mem.seek(0)
        return send_file(mem, as_attachment=True, download_name=f"fractal_report_{batch_id}.csv",
                         mimetype="text/csv")


@app.route("/api/sample/bad-data", methods=["GET"])
def sample_bad():
    return jsonify(sample_real_bad_data())


@app.route("/api/generator/<name>", methods=["POST"])
def generate_fractal(name: str):
    data = request.get_json() or {}
    n = data.get("n", 200)
    try:
        if name == "cantor":
            pts = generate_cantor_set(data.get("levels", 6))
        elif name == "koch":
            pts = generate_koch_curve(data.get("levels", 4))
        elif name == "sierpinski":
            pts = generate_sierpinski_triangle(data.get("levels", 6))
        elif name == "random":
            pts = generate_random_points(n, data.get("dim", 2))
        elif name == "line":
            pts = generate_uniform_line(n)
        else:
            return jsonify({"error": f"未知类型 {name}"}), 400
        return jsonify({"points": pts.tolist(), "shape": list(pts.shape)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    init_db()
    print("数据库已初始化:", DB_PATH)
    app.run(host="0.0.0.0", port=5001, debug=True)
else:
    init_db()
