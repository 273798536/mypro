from typing import List, Dict, Optional

from database import get_conn, now
from audit_engine import compare_answers, detect_boundary_cases


def correct_question(question_db_id: int, field_name: str, new_value: str,
                     note: str = None, corrected_by: str = "analyst") -> Dict:
    allowed_fields = ["question_text", "student_answer", "correct_answer", "is_correct"]
    if field_name not in allowed_fields:
        return {"success": False, "error": f"不允许修改字段: {field_name}"}

    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM student_questions WHERE id = ?", (question_db_id,))
        q = c.fetchone()
        if not q:
            return {"success": False, "error": f"题目不存在: id={question_db_id}"}

        old_value = str(q[field_name]) if q[field_name] is not None else None
        if old_value == new_value:
            return {"success": False, "error": "新旧值相同，无需修正"}

        c.execute(
            f"UPDATE student_questions SET {field_name} = ? WHERE id = ?",
            (new_value, question_db_id)
        )

        c.execute(
            """INSERT INTO corrections
               (question_id, field_name, old_value, new_value, corrected_by, corrected_at, note)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (question_db_id, field_name, old_value, new_value, corrected_by, now(), note)
        )

        if field_name in ["student_answer", "correct_answer"]:
            c.execute("SELECT student_answer, correct_answer FROM student_questions WHERE id = ?",
                      (question_db_id,))
            row = c.fetchone()
            sa, ca = row["student_answer"], row["correct_answer"]
            if sa and ca:
                try:
                    is_correct = compare_answers(sa, ca)
                    c.execute(
                        "UPDATE student_questions SET is_correct = ?, has_error = 0, error_note = NULL WHERE id = ?",
                        (1 if is_correct else (0 if is_correct is False else None), question_db_id)
                    )
                except Exception as e:
                    c.execute(
                        "UPDATE student_questions SET has_error = 1, error_note = ? WHERE id = ?",
                        (f"重新判定异常: {e}", question_db_id)
                    )

            c.execute("DELETE FROM boundary_cases WHERE question_id = ?", (question_db_id,))
            c.execute("SELECT question_text, student_answer, correct_answer FROM student_questions WHERE id = ?",
                      (question_db_id,))
            row = c.fetchone()
            if row["student_answer"] and row["correct_answer"]:
                try:
                    bcs = detect_boundary_cases(row["question_text"], row["student_answer"], row["correct_answer"])
                    for bc in bcs:
                        c.execute(
                            """INSERT INTO boundary_cases
                               (question_id, case_type, description, original_result, boundary_result, result_changed)
                               VALUES (?, ?, ?, ?, ?, ?)""",
                            (question_db_id, bc["case_type"], bc["description"],
                             bc["original_result"], bc["boundary_result"], bc["result_changed"])
                        )
                except Exception:
                    pass

        if field_name == "correct_answer":
            c.execute("UPDATE missing_answers SET resolved = 1 WHERE question_id = ? AND missing_field = 'correct_answer'",
                      (question_db_id,))
        if field_name == "question_text":
            c.execute("UPDATE missing_answers SET resolved = 1 WHERE question_id = ? AND missing_field = 'question_text'",
                      (question_db_id,))

    return {"success": True, "question_id": question_db_id, "field": field_name,
            "old_value": old_value, "new_value": new_value}


def confirm_question(question_db_id: int, note: str = None, confirmed_by: str = "analyst") -> Dict:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM student_questions WHERE id = ?", (question_db_id,))
        if not c.fetchone():
            return {"success": False, "error": f"题目不存在: id={question_db_id}"}

        c.execute(
            """INSERT INTO confirmations (question_id, confirmed_by, confirmed_at, note)
               VALUES (?, ?, ?, ?)""",
            (question_db_id, confirmed_by, now(), note)
        )
    return {"success": True, "question_id": question_db_id}


def batch_review(batch_id: int, corrections: List[Dict] = None,
                 note: str = None, reviewed_by: str = "analyst") -> Dict:
    result = {
        "success": True,
        "review_session_id": None,
        "total_reviewed": 0,
        "changed_count": 0,
        "failed": [],
        "missing": [],
        "changes": []
    }

    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM import_batches WHERE id = ?", (batch_id,))
        if not c.fetchone():
            return {"success": False, "error": f"批次不存在: id={batch_id}"}

    processable_ids = []
    missing_info = []
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT q.id, q.question_id,
                   GROUP_CONCAT(m.missing_field) as missing_fields
            FROM student_questions q
            LEFT JOIN missing_answers m ON m.question_id = q.id AND m.resolved = 0
            WHERE q.batch_id = ?
            GROUP BY q.id
        """, (batch_id,))
        for row in c.fetchall():
            if row["missing_fields"]:
                missing_info.append({
                    "db_id": row["id"],
                    "question_id": row["question_id"],
                    "missing_fields": row["missing_fields"].split(",")
                })
            else:
                processable_ids.append(row["id"])

    result["missing"] = missing_info

    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            """INSERT INTO review_sessions
               (batch_id, reviewed_at, reviewed_by, total_reviewed, changed_count, note)
               VALUES (?, ?, ?, 0, 0, ?)""",
            (batch_id, now(), reviewed_by, note)
        )
        review_id = c.lastrowid
        result["review_session_id"] = review_id

    if corrections:
        for corr in corrections:
            q_db_id = corr.get("question_db_id")
            field_name = corr.get("field")
            new_value = corr.get("new_value")
            corr_note = corr.get("note")

            if not all([q_db_id, field_name, new_value is not None]):
                result["failed"].append({"item": corr, "reason": "缺少必要字段"})
                continue

            if q_db_id not in processable_ids and not corr.get("force", False):
                result["failed"].append({"item": corr, "reason": f"题目 {q_db_id} 存在未解决的缺失字段"})
                continue

            try:
                fix_result = correct_question(q_db_id, field_name, str(new_value), corr_note, reviewed_by)
                if fix_result["success"]:
                    result["changes"].append(fix_result)
                    result["changed_count"] += 1
                    with get_conn() as conn:
                        c = conn.cursor()
                        c.execute(
                            """INSERT INTO review_changes
                               (review_session_id, question_id, field_name, before_value, after_value)
                               VALUES (?, ?, ?, ?, ?)""",
                            (review_id, q_db_id, field_name,
                             fix_result["old_value"], fix_result["new_value"])
                        )
                else:
                    result["failed"].append({"item": corr, "reason": fix_result.get("error", "未知错误")})
            except Exception as e:
                result["failed"].append({"item": corr, "reason": str(e)})

    result["total_reviewed"] = len(processable_ids) + len(corrections or [])

    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            "UPDATE review_sessions SET total_reviewed = ?, changed_count = ? WHERE id = ?",
            (result["total_reviewed"], result["changed_count"], review_id)
        )

    return result


def get_wrong_questions(batch_id: int = None, include_boundary: bool = True) -> List[Dict]:
    with get_conn() as conn:
        c = conn.cursor()
        query = """
            SELECT q.id as db_id, q.question_id, q.student_id, q.question_text,
                   q.student_answer, q.correct_answer, q.is_correct, q.has_error, q.error_note
            FROM student_questions q
            WHERE (q.is_correct = 0 OR q.has_error = 1)
        """
        params = []
        if batch_id:
            query += " AND q.batch_id = ?"
            params.append(batch_id)
        c.execute(query, params)
        questions = []
        for row in c.fetchall():
            q = dict(row)
            if include_boundary:
                c.execute(
                    "SELECT * FROM boundary_cases WHERE question_id = ? AND result_changed = 1",
                    (q["db_id"],)
                )
                q["boundary_cases"] = [dict(r) for r in c.fetchall()]
            else:
                q["boundary_cases"] = []
            c.execute(
                "SELECT id, field_name, old_value, new_value, corrected_at, note FROM corrections WHERE question_id = ? ORDER BY corrected_at",
                (q["db_id"],)
            )
            q["corrections"] = [dict(r) for r in c.fetchall()]
            c.execute(
                "SELECT id, confirmed_at, note FROM confirmations WHERE question_id = ? ORDER BY confirmed_at",
                (q["db_id"],)
            )
            q["confirmations"] = [dict(r) for r in c.fetchall()]
            questions.append(q)
    return questions


def get_missing_answers(batch_id: int = None) -> List[Dict]:
    with get_conn() as conn:
        c = conn.cursor()
        query = """
            SELECT m.id, q.id as db_id, q.question_id, q.student_id, q.question_text,
                   m.missing_field, m.noted_at, m.resolved
            FROM missing_answers m
            JOIN student_questions q ON q.id = m.question_id
            WHERE m.resolved = 0
        """
        params = []
        if batch_id:
            query += " AND m.batch_id = ?"
            params.append(batch_id)
        query += " ORDER BY m.noted_at"
        c.execute(query, params)
        return [dict(r) for r in c.fetchall()]


def get_history(question_db_id: int) -> Dict:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM student_questions WHERE id = ?", (question_db_id,))
        q = c.fetchone()
        if not q:
            return {"success": False, "error": f"题目不存在"}

        result = {"question": dict(q), "corrections": [], "confirmations": [], "review_changes": [], "boundary_cases": []}

        c.execute(
            "SELECT * FROM corrections WHERE question_id = ? ORDER BY corrected_at",
            (question_db_id,)
        )
        result["corrections"] = [dict(r) for r in c.fetchall()]

        c.execute(
            "SELECT * FROM confirmations WHERE question_id = ? ORDER BY confirmed_at",
            (question_db_id,)
        )
        result["confirmations"] = [dict(r) for r in c.fetchall()]

        c.execute(
            "SELECT rc.*, rs.reviewed_at, rs.reviewed_by FROM review_changes rc JOIN review_sessions rs ON rs.id = rc.review_session_id WHERE rc.question_id = ? ORDER BY rs.reviewed_at",
            (question_db_id,)
        )
        result["review_changes"] = [dict(r) for r in c.fetchall()]

        c.execute(
            "SELECT * FROM boundary_cases WHERE question_id = ? ORDER BY id",
            (question_db_id,)
        )
        result["boundary_cases"] = [dict(r) for r in c.fetchall()]

    return result


def list_batches() -> List[Dict]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM import_batches ORDER BY imported_at DESC")
        return [dict(r) for r in c.fetchall()]


def list_review_sessions(batch_id: int = None) -> List[Dict]:
    with get_conn() as conn:
        c = conn.cursor()
        query = "SELECT * FROM review_sessions"
        params = []
        if batch_id:
            query += " WHERE batch_id = ?"
            params.append(batch_id)
        query += " ORDER BY reviewed_at DESC"
        c.execute(query, params)
        sessions = []
        for row in c.fetchall():
            s = dict(row)
            c.execute(
                "SELECT * FROM review_changes WHERE review_session_id = ?",
                (s["id"],)
            )
            s["changes"] = [dict(r) for r in c.fetchall()]
            sessions.append(s)
        return sessions
