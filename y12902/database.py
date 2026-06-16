import sqlite3
import os
import json
import hashlib
from datetime import datetime
from contextlib import contextmanager
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_platform.db")


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        c = conn.cursor()

        c.execute("""
        CREATE TABLE IF NOT EXISTS question_bank (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT UNIQUE NOT NULL,
            question_text TEXT NOT NULL,
            category TEXT,
            difficulty TEXT,
            knowledge_point TEXT,
            source TEXT,
            reference_answer TEXT,
            tags TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """)

        c.execute("""
        CREATE TABLE IF NOT EXISTS prompt_version (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version_hash TEXT UNIQUE NOT NULL,
            version_name TEXT NOT NULL,
            prompt_content TEXT NOT NULL,
            description TEXT,
            imported_at TEXT NOT NULL,
            import_note TEXT,
            author TEXT
        )
        """)

        c.execute("""
        CREATE TABLE IF NOT EXISTS eval_record (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt_version_id INTEGER NOT NULL,
            question_id TEXT NOT NULL,
            model_output TEXT,
            score REAL,
            is_pass INTEGER,
            eval_status TEXT DEFAULT 'pending',
            exception_type TEXT,
            exception_detail TEXT,
            latency_ms INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (prompt_version_id) REFERENCES prompt_version(id) ON DELETE CASCADE,
            FOREIGN KEY (question_id) REFERENCES question_bank(question_id) ON DELETE CASCADE,
            UNIQUE(prompt_version_id, question_id)
        )
        """)

        c.execute("""
        CREATE TABLE IF NOT EXISTS treatment_note (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            eval_record_id INTEGER NOT NULL,
            note_type TEXT NOT NULL,
            note_content TEXT NOT NULL,
            handler TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (eval_record_id) REFERENCES eval_record(id) ON DELETE CASCADE
        )
        """)

        c.execute("""
        CREATE TABLE IF NOT EXISTS dataset_ratio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt_version_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            expected_ratio REAL,
            actual_count INTEGER,
            actual_ratio REAL,
            deviation REAL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (prompt_version_id) REFERENCES prompt_version(id) ON DELETE CASCADE,
            UNIQUE(prompt_version_id, category)
        )
        """)


def compute_version_hash(version_name: str, prompt_content: str) -> str:
    raw = f"{version_name.strip()}||{prompt_content.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


# ---------- question_bank ----------

def upsert_question_bank(rows: List[Dict[str, Any]]) -> Dict[str, int]:
    now = datetime.now().isoformat(timespec="seconds")
    inserted = 0
    updated = 0
    skipped = 0
    with get_conn() as conn:
        c = conn.cursor()
        for row in rows:
            qid = str(row.get("question_id", "")).strip()
            if not qid:
                skipped += 1
                continue
            qtext = str(row.get("question_text", "")).strip()
            if not qtext:
                skipped += 1
                continue
            existing = c.execute(
                "SELECT id FROM question_bank WHERE question_id = ?", (qid,)
            ).fetchone()
            if existing:
                c.execute("""
                    UPDATE question_bank SET
                        question_text = ?, category = ?, difficulty = ?,
                        knowledge_point = ?, source = ?, reference_answer = ?,
                        tags = ?, updated_at = ?
                    WHERE question_id = ?
                """, (
                    qtext,
                    row.get("category"),
                    row.get("difficulty"),
                    row.get("knowledge_point"),
                    row.get("source"),
                    row.get("reference_answer"),
                    json.dumps(row.get("tags"), ensure_ascii=False) if isinstance(row.get("tags"), (list, dict)) else row.get("tags"),
                    now, qid
                ))
                updated += 1
            else:
                c.execute("""
                    INSERT INTO question_bank (
                        question_id, question_text, category, difficulty,
                        knowledge_point, source, reference_answer, tags,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    qid, qtext,
                    row.get("category"),
                    row.get("difficulty"),
                    row.get("knowledge_point"),
                    row.get("source"),
                    row.get("reference_answer"),
                    json.dumps(row.get("tags"), ensure_ascii=False) if isinstance(row.get("tags"), (list, dict)) else row.get("tags"),
                    now, now
                ))
                inserted += 1
    return {"inserted": inserted, "updated": updated, "skipped": skipped}


def list_questions(category: Optional[str] = None, keyword: Optional[str] = None) -> List[Dict]:
    sql = "SELECT * FROM question_bank WHERE 1=1"
    params: List = []
    if category:
        sql += " AND category = ?"
        params.append(category)
    if keyword:
        sql += " AND (question_text LIKE ? OR question_id LIKE ? OR knowledge_point LIKE ?)"
        params.extend([f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"])
    sql += " ORDER BY id DESC"
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def get_question_categories() -> List[str]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT category FROM question_bank WHERE category IS NOT NULL AND category <> '' ORDER BY category"
        ).fetchall()
    return [r["category"] for r in rows]


def get_question_count_by_category() -> Dict[str, int]:
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT COALESCE(NULLIF(category, ''), '未分类') AS cat, COUNT(*) AS cnt
            FROM question_bank GROUP BY cat ORDER BY cnt DESC
        """).fetchall()
    return {r["cat"]: r["cnt"] for r in rows}


# ---------- prompt_version ----------

def import_prompt_version(
    version_name: str,
    prompt_content: str,
    description: str = "",
    import_note: str = "",
    author: str = ""
) -> Dict[str, Any]:
    version_hash = compute_version_hash(version_name, prompt_content)
    now = datetime.now().isoformat(timespec="seconds")
    with get_conn() as conn:
        c = conn.cursor()
        existing = c.execute(
            "SELECT * FROM prompt_version WHERE version_hash = ?", (version_hash,)
        ).fetchone()
        if existing:
            note = f"检测到同一批提示词版本已存在（版本标识：{existing['version_name']}，导入于 {existing['imported_at']}）。已合并到同一份处理记录，不会产生冲突结论。"
            return {
                "status": "merged",
                "id": existing["id"],
                "version_hash": version_hash,
                "version_name": existing["version_name"],
                "message": note
            }
        c.execute("""
            INSERT INTO prompt_version (
                version_hash, version_name, prompt_content, description,
                imported_at, import_note, author
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (version_hash, version_name.strip(), prompt_content, description, now, import_note, author))
        new_id = c.lastrowid
    return {
        "status": "new",
        "id": new_id,
        "version_hash": version_hash,
        "version_name": version_name.strip(),
        "message": f"已新建提示词版本（ID={new_id}）。"
    }


def list_prompt_versions() -> List[Dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM prompt_version ORDER BY id DESC").fetchall()
    return [dict(r) for r in rows]


def get_prompt_version(pv_id: int) -> Optional[Dict]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM prompt_version WHERE id = ?", (pv_id,)).fetchone()
    return dict(row) if row else None


# ---------- eval_record ----------

def upsert_eval_records(
    prompt_version_id: int,
    records: List[Dict[str, Any]]
) -> Dict[str, int]:
    now = datetime.now().isoformat(timespec="seconds")
    inserted = 0
    updated = 0
    skipped = 0
    with get_conn() as conn:
        c = conn.cursor()
        for rec in records:
            qid = str(rec.get("question_id", "")).strip()
            if not qid:
                skipped += 1
                continue
            existing = c.execute("""
                SELECT id FROM eval_record WHERE prompt_version_id = ? AND question_id = ?
            """, (prompt_version_id, qid)).fetchone()
            is_pass = rec.get("is_pass")
            if is_pass is None:
                score = rec.get("score")
                if score is not None:
                    try:
                        is_pass = 1 if float(score) >= 60 else 0
                    except Exception:
                        is_pass = None
            if existing:
                c.execute("""
                    UPDATE eval_record SET
                        model_output = ?, score = ?, is_pass = ?, eval_status = ?,
                        exception_type = ?, exception_detail = ?, latency_ms = ?,
                        updated_at = ?
                    WHERE id = ?
                """, (
                    rec.get("model_output"),
                    rec.get("score"),
                    is_pass,
                    rec.get("eval_status", "done"),
                    rec.get("exception_type"),
                    rec.get("exception_detail"),
                    rec.get("latency_ms"),
                    now, existing["id"]
                ))
                updated += 1
            else:
                c.execute("""
                    INSERT INTO eval_record (
                        prompt_version_id, question_id, model_output, score, is_pass,
                        eval_status, exception_type, exception_detail, latency_ms,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    prompt_version_id, qid,
                    rec.get("model_output"),
                    rec.get("score"),
                    is_pass,
                    rec.get("eval_status", "done"),
                    rec.get("exception_type"),
                    rec.get("exception_detail"),
                    rec.get("latency_ms"),
                    now, now
                ))
                inserted += 1
    _refresh_dataset_ratio(prompt_version_id)
    return {"inserted": inserted, "updated": updated, "skipped": skipped}


def list_eval_records(
    prompt_version_id: Optional[int] = None,
    only_exception: bool = False,
    only_fail: bool = False,
    category: Optional[str] = None,
    keyword: Optional[str] = None
) -> List[Dict]:
    sql = """
        SELECT e.*, q.question_text, q.category, q.difficulty, q.knowledge_point, q.reference_answer
        FROM eval_record e
        LEFT JOIN question_bank q ON e.question_id = q.question_id
        WHERE 1=1
    """
    params: List = []
    if prompt_version_id:
        sql += " AND e.prompt_version_id = ?"
        params.append(prompt_version_id)
    if only_exception:
        sql += " AND (e.exception_type IS NOT NULL AND e.exception_type <> '')"
    if only_fail:
        sql += " AND e.is_pass = 0"
    if category:
        sql += " AND q.category = ?"
        params.append(category)
    if keyword:
        sql += " AND (q.question_text LIKE ? OR e.question_id LIKE ? OR e.exception_detail LIKE ?)"
        params.extend([f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"])
    sql += " ORDER BY e.id DESC"
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def get_eval_record_detail(eval_record_id: int) -> Optional[Dict]:
    with get_conn() as conn:
        row = conn.execute("""
            SELECT e.*, q.question_text, q.category, q.difficulty, q.knowledge_point,
                   q.reference_answer, q.source, q.tags,
                   pv.version_name, pv.prompt_content, pv.description
            FROM eval_record e
            LEFT JOIN question_bank q ON e.question_id = q.question_id
            LEFT JOIN prompt_version pv ON e.prompt_version_id = pv.id
            WHERE e.id = ?
        """, (eval_record_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    notes = conn_execute_fetchall("""
        SELECT * FROM treatment_note WHERE eval_record_id = ? ORDER BY id
    """, (eval_record_id,))
    d["treatment_notes"] = [dict(n) for n in notes]
    return d


# ---------- treatment_note ----------

def add_treatment_note(eval_record_id: int, note_type: str, note_content: str, handler: str = "") -> int:
    now = datetime.now().isoformat(timespec="seconds")
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO treatment_note (eval_record_id, note_type, note_content, handler, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (eval_record_id, note_type, note_content, handler, now))
        return c.lastrowid


def list_treatment_notes(eval_record_id: int) -> List[Dict]:
    return [dict(r) for r in conn_execute_fetchall("""
        SELECT * FROM treatment_note WHERE eval_record_id = ? ORDER BY id
    """, (eval_record_id,))]


# ---------- dataset_ratio ----------

def _refresh_dataset_ratio(prompt_version_id: int):
    now = datetime.now().isoformat(timespec="seconds")
    with get_conn() as conn:
        conn.execute("DELETE FROM dataset_ratio WHERE prompt_version_id = ?", (prompt_version_id,))
        total_rows = conn.execute("""
            SELECT COUNT(*) AS cnt FROM eval_record WHERE prompt_version_id = ?
        """, (prompt_version_id,)).fetchone()
        total = total_rows["cnt"] if total_rows else 0
        if total == 0:
            return
        rows = conn.execute("""
            SELECT COALESCE(NULLIF(q.category, ''), '未分类') AS cat,
                   COUNT(*) AS cnt
            FROM eval_record e
            LEFT JOIN question_bank q ON e.question_id = q.question_id
            WHERE e.prompt_version_id = ?
            GROUP BY cat
        """, (prompt_version_id,)).fetchall()
        c = conn.cursor()
        for r in rows:
            actual_ratio = round(r["cnt"] / total * 100, 2)
            c.execute("""
                INSERT INTO dataset_ratio (
                    prompt_version_id, category, actual_count, actual_ratio,
                    expected_ratio, deviation, created_at
                ) VALUES (?, ?, ?, ?, NULL, NULL, ?)
            """, (prompt_version_id, r["cat"], r["cnt"], actual_ratio, now))


def set_expected_ratio(prompt_version_id: int, ratios: Dict[str, float]):
    now = datetime.now().isoformat(timespec="seconds")
    with get_conn() as conn:
        c = conn.cursor()
        for cat, exp in ratios.items():
            existing = c.execute("""
                SELECT id, actual_ratio FROM dataset_ratio
                WHERE prompt_version_id = ? AND category = ?
            """, (prompt_version_id, cat)).fetchone()
            if existing:
                dev = round((existing["actual_ratio"] or 0) - float(exp), 2)
                c.execute("""
                    UPDATE dataset_ratio SET expected_ratio = ?, deviation = ?, created_at = ?
                    WHERE id = ?
                """, (float(exp), dev, now, existing["id"]))
            else:
                c.execute("""
                    INSERT INTO dataset_ratio (prompt_version_id, category, expected_ratio, deviation, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (prompt_version_id, cat, float(exp), None, now))


def get_dataset_ratio(prompt_version_id: int) -> List[Dict]:
    rows = conn_execute_fetchall("""
        SELECT * FROM dataset_ratio WHERE prompt_version_id = ? ORDER BY actual_count DESC
    """, (prompt_version_id,))
    return [dict(r) for r in rows]


# ---------- summary ----------

def get_prompt_version_summary(prompt_version_id: int) -> Dict[str, Any]:
    records = list_eval_records(prompt_version_id=prompt_version_id)
    total = len(records)
    if total == 0:
        return {
            "total": 0, "pass": 0, "fail": 0, "exception": 0,
            "pending": 0, "pass_rate": 0.0,
            "by_category": {}, "by_difficulty": {},
            "avg_score": 0.0
        }
    passed = sum(1 for r in records if r.get("is_pass") == 1)
    failed = sum(1 for r in records if r.get("is_pass") == 0)
    exc = sum(1 for r in records if r.get("exception_type"))
    pending = sum(1 for r in records if r.get("eval_status") == "pending")
    scores = [r["score"] for r in records if r.get("score") is not None]
    avg = round(sum(scores) / len(scores), 2) if scores else 0.0

    by_cat: Dict[str, Dict] = {}
    for r in records:
        cat = r.get("category") or "未分类"
        if cat not in by_cat:
            by_cat[cat] = {"total": 0, "pass": 0, "fail": 0, "exception": 0, "scores": []}
        by_cat[cat]["total"] += 1
        if r.get("is_pass") == 1:
            by_cat[cat]["pass"] += 1
        elif r.get("is_pass") == 0:
            by_cat[cat]["fail"] += 1
        if r.get("exception_type"):
            by_cat[cat]["exception"] += 1
        if r.get("score") is not None:
            by_cat[cat]["scores"].append(r["score"])
    for cat in by_cat:
        s = by_cat[cat]["scores"]
        by_cat[cat]["avg_score"] = round(sum(s) / len(s), 2) if s else 0.0
        by_cat[cat]["pass_rate"] = round(by_cat[cat]["pass"] / by_cat[cat]["total"] * 100, 2) if by_cat[cat]["total"] else 0.0

    by_diff: Dict[str, Dict] = {}
    for r in records:
        diff = r.get("difficulty") or "未标注"
        if diff not in by_diff:
            by_diff[diff] = {"total": 0, "pass": 0, "fail": 0}
        by_diff[diff]["total"] += 1
        if r.get("is_pass") == 1:
            by_diff[diff]["pass"] += 1
        elif r.get("is_pass") == 0:
            by_diff[diff]["fail"] += 1

    return {
        "total": total,
        "pass": passed,
        "fail": failed,
        "exception": exc,
        "pending": pending,
        "pass_rate": round(passed / total * 100, 2) if total else 0.0,
        "avg_score": avg,
        "by_category": by_cat,
        "by_difficulty": by_diff,
    }


# ---------- helper ----------

def conn_execute_fetchall(sql: str, params=()) -> List[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute(sql, params).fetchall()


init_db()
