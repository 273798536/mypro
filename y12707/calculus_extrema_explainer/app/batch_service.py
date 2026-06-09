from datetime import datetime
from .database import get_db
from .engine import run_constraint_checks, run_error_analysis


def create_batch(batch_code: str, batch_name: str = None) -> dict:
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            "INSERT INTO processing_batches (batch_code, batch_name, status, started_at) VALUES (?, ?, 'running', ?)",
            (batch_code, batch_name or batch_code, datetime.now().isoformat())
        )
        batch_id = c.lastrowid
        conn.commit()
        return {"id": batch_id, "batch_code": batch_code}


def attach_wrong_answers_to_batch(batch_id: int, wrong_answer_ids: list) -> int:
    with get_db() as conn:
        c = conn.cursor()
        count = 0
        for wid in wrong_answer_ids:
            try:
                c.execute(
                    "INSERT OR IGNORE INTO batch_records (batch_id, wrong_answer_id, process_status) VALUES (?, ?, 'pending')",
                    (batch_id, wid)
                )
                count += c.rowcount
            except Exception:
                pass
        c.execute("UPDATE processing_batches SET total_records = ? WHERE id = ?", (count, batch_id))
        conn.commit()
        return count


def process_batch(batch_id: int) -> dict:
    result = {
        "processed": 0,
        "with_gaps": 0,
        "anomalies": 0,
        "gap_list": [],
        "anomaly_list": []
    }
    with get_db() as conn:
        c = conn.cursor()

        c.execute("""
            SELECT br.id, br.wrong_answer_id,
                   wa.student_id, wa.question_id, wa.student_answer, wa.student_derivative,
                   wa.student_work, wa.historical_score, wa.historical_score_missing,
                   s.student_code, s.student_name,
                   q.question_code, q.question_text, q.correct_answer, q.correct_derivative,
                   q.critical_points, q.has_zero_division_risk
            FROM batch_records br
            JOIN wrong_answers wa ON wa.id = br.wrong_answer_id
            JOIN students s ON s.id = wa.student_id
            JOIN questions q ON q.id = wa.question_id
            WHERE br.batch_id = ? AND br.process_status = 'pending'
        """, (batch_id,))
        rows = [dict(r) for r in c.fetchall()]

        for row in rows:
            br_id = row["id"]
            process_record(conn, br_id, row, result)
            result["processed"] += 1

        c.execute("""
            UPDATE processing_batches
            SET status = 'completed',
                processed_records = ?,
                missing_gaps = ?,
                anomalies_count = ?,
                finished_at = ?
            WHERE id = ?
        """, (result["processed"], result["with_gaps"], result["anomalies"], datetime.now().isoformat(), batch_id))
        conn.commit()

    return result


def process_record(conn, br_id: int, row: dict, result: dict):
    c = conn.cursor()

    missing_historical = row.get("historical_score_missing", 0) == 1

    checks = run_constraint_checks(br_id, row, row)
    for chk in checks:
        c.execute("""
            INSERT INTO constraint_checks (batch_record_id, check_type, check_result, check_passed, detail)
            VALUES (?, ?, ?, ?, ?)
        """, (chk["batch_record_id"], chk["check_type"], chk["check_result"], chk["check_passed"], chk["detail"]))

    analysis = run_error_analysis(br_id, row, row)
    c.execute("""
        INSERT INTO error_analyses (batch_record_id, error_type, error_magnitude, relative_error, root_cause, detail)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (analysis["batch_record_id"], analysis["error_type"], analysis["error_magnitude"],
          analysis["relative_error"], analysis["root_cause"], analysis["detail"]))

    boundary_check = next((c for c in checks if c["check_type"] == "zero_division_boundary"), None)
    boundary_valid = boundary_check["check_passed"] if boundary_check else None
    boundary_note = boundary_check["detail"] if boundary_check else ""

    c.execute("""
        UPDATE batch_records
        SET process_status = 'processed',
            zero_division_boundary = ?,
            boundary_valid = ?,
            processed_at = ?
        WHERE id = ?
    """, (boundary_note, 1 if boundary_valid else 0 if boundary_valid is not None else None,
          datetime.now().isoformat(), br_id))

    anomalies_to_create = []

    if missing_historical:
        anomalies_to_create.append({
            "anomaly_type": "historical_score_missing",
            "severity": "warning",
            "description": "该学生错题的历史评分记录缺失",
            "gap_detail": f"学生={row['student_code']}({row['student_name']}), 题目={row['question_code']}, "
                          f"请风控分析师补录该错题的历史评分后可重新校验边界判断",
            "needs_review": 1
        })
        result["with_gaps"] += 1
        result["gap_list"].append({
            "wrong_answer_id": row["wrong_answer_id"],
            "student_code": row["student_code"],
            "question_code": row["question_code"],
            "reason": "历史评分缺失"
        })

    if boundary_valid == 0:
        anomalies_to_create.append({
            "anomaly_type": "zero_division_boundary_violation",
            "severity": "error",
            "description": "除零边界判断不通过，学生导数存在风险点",
            "gap_detail": boundary_note,
            "needs_review": 1
        })
        result["anomalies"] += 1
        result["anomaly_list"].append({
            "wrong_answer_id": row["wrong_answer_id"],
            "student_code": row["student_code"],
            "question_code": row["question_code"],
            "type": "除零边界违规"
        })

    for a in anomalies_to_create:
        c.execute("""
            INSERT INTO anomalies (batch_record_id, anomaly_type, severity, description, gap_detail, needs_review)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (br_id, a["anomaly_type"], a["severity"], a["description"], a["gap_detail"], a["needs_review"]))


def add_review_decision(anomaly_id: int, reviewer: str, decision: str,
                        handling_opinion: str = None, supplemental_data: str = None) -> dict:
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO review_decisions (anomaly_id, reviewer, decision, handling_opinion, supplemental_data)
            VALUES (?, ?, ?, ?, ?)
        """, (anomaly_id, reviewer, decision, handling_opinion, supplemental_data))
        c.execute("UPDATE anomalies SET reviewed = 1 WHERE id = ?", (anomaly_id,))
        conn.commit()
        return {"anomaly_id": anomaly_id, "reviewed": True}


def trace_anomaly(anomaly_id: int) -> dict:
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT a.id, a.anomaly_type, a.severity, a.description, a.gap_detail, a.reviewed,
                   br.id AS batch_record_id, br.batch_id, br.wrong_answer_id,
                   br.process_status, br.zero_division_boundary, br.boundary_valid,
                   pb.batch_code, pb.batch_name,
                   wa.student_answer, wa.student_derivative, wa.student_work,
                   wa.historical_score, wa.historical_score_missing,
                   s.student_code, s.student_name, s.class_name,
                   q.question_code, q.question_text, q.correct_answer, q.correct_derivative
            FROM anomalies a
            JOIN batch_records br ON br.id = a.batch_record_id
            JOIN processing_batches pb ON pb.id = br.batch_id
            JOIN wrong_answers wa ON wa.id = br.wrong_answer_id
            JOIN students s ON s.id = wa.student_id
            JOIN questions q ON q.id = wa.question_id
            WHERE a.id = ?
        """, (anomaly_id,))
        row = c.fetchone()
        if not row:
            return None
        trace = dict(row)

        c.execute("SELECT * FROM constraint_checks WHERE batch_record_id = ?", (trace["batch_record_id"],))
        trace["constraint_checks"] = [dict(r) for r in c.fetchall()]

        c.execute("SELECT * FROM error_analyses WHERE batch_record_id = ?", (trace["batch_record_id"],))
        trace["error_analyses"] = [dict(r) for r in c.fetchall()]

        c.execute("SELECT * FROM review_decisions WHERE anomaly_id = ?", (anomaly_id,))
        trace["review_decisions"] = [dict(r) for r in c.fetchall()]

        return trace
