#!/usr/bin/env python3
"""微积分极值讲解器 - 端到端跑通脚本 (Python版)

从零开始：建库 -> 导入学生/题目/错题 -> 建批 -> 处理 -> 看异常 -> 复核 -> 导出
可直接运行，无需启动 Flask (直连本地 SQLite)。
"""
import os
import sys
import json
import csv
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import init_db, get_db, DB_PATH
from app import batch_service

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sample_data.json")
EXPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "exports")
os.makedirs(EXPORT_DIR, exist_ok=True)


def load_sample():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def step(msg):
    print(f"\n{'=' * 60}")
    print(f" {msg}")
    print(f"{'=' * 60}")


def main():
    sample = load_sample()

    step("1/8 初始化数据库")
    init_db()
    print(f"数据库文件: {DB_PATH}")

    step("2/8 导入学生")
    with get_db() as conn:
        c = conn.cursor()
        for s in sample["students"]:
            c.execute(
                "INSERT OR IGNORE INTO students (student_code, student_name, class_name) VALUES (?, ?, ?)",
                (s["student_code"], s.get("student_name"), s.get("class_name"))
            )
        conn.commit()
        c.execute("SELECT COUNT(*) AS n FROM students")
        print(f"学生总数: {c.fetchone()['n']}")

    step("3/8 导入题目")
    with get_db() as conn:
        c = conn.cursor()
        for q in sample["questions"]:
            c.execute("""
                INSERT OR IGNORE INTO questions
                (question_code, question_text, correct_answer, correct_derivative, critical_points, has_zero_division_risk)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (q["question_code"], q.get("question_text", ""),
                  q.get("correct_answer"), q.get("correct_derivative"),
                  q.get("critical_points"), q.get("has_zero_division_risk", 0)))
        conn.commit()
        c.execute("SELECT COUNT(*) AS n FROM questions")
        print(f"题目总数: {c.fetchone()['n']}")

    step("4/8 导入学生错题 (含历史评分缺失的记录)")
    wa_ids = []
    with get_db() as conn:
        c = conn.cursor()
        for wa in sample["wrong_answers"]:
            c.execute("SELECT id FROM students WHERE student_code = ?", (wa["student_code"],))
            s = c.fetchone()
            c.execute("SELECT id FROM questions WHERE question_code = ?", (wa["question_code"],))
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
                wa.get("student_answer"), wa.get("student_derivative"), wa.get("student_work"),
                wa.get("historical_score"),
                1 if wa.get("historical_score") is None or wa.get("historical_score_missing") else 0,
                wa.get("answered_at", datetime.now().isoformat())
            ))
            c.execute("SELECT id FROM wrong_answers WHERE student_id = ? AND question_id = ?", (s["id"], q["id"]))
            wa_ids.append(c.fetchone()["id"])
        conn.commit()
        with get_db() as c2:
            c2 = c2.cursor()
            c2.execute("SELECT COUNT(*) AS n FROM wrong_answers")
            print(f"错题总数: {c2.fetchone()['n']}, 本次挂接IDs: {wa_ids}")

    step("5/8 创建处理批次并挂接错题")
    batch_code = f"BATCH_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    batch = batch_service.create_batch(batch_code, "演示批次_学生错题极值分析")
    attached = batch_service.attach_wrong_answers_to_batch(batch["id"], wa_ids)
    print(f"批次ID={batch['id']}, code={batch_code}, 挂接{attached}条错题")

    step("6/8 执行批次处理 (约束校验 + 误差分析 共用同一批记录)")
    result = batch_service.process_batch(batch["id"])
    print(json.dumps(result, ensure_ascii=False, indent=2))

    step("7/8 查看异常列表 (含历史评分缺失缺口 和 除零边界违规)")
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT a.id, a.anomaly_type, a.severity, a.description, a.reviewed,
                   pb.batch_code, s.student_code, s.student_name, q.question_code
            FROM anomalies a
            JOIN batch_records br ON br.id = a.batch_record_id
            JOIN processing_batches pb ON pb.id = br.batch_id
            JOIN wrong_answers wa ON wa.id = br.wrong_answer_id
            JOIN students s ON s.id = wa.student_id
            JOIN questions q ON q.id = wa.question_id
            ORDER BY a.id
        """)
        anomalies = [dict(r) for r in c.fetchall()]
    print(json.dumps(anomalies, ensure_ascii=False, indent=2))

    if anomalies:
        first = anomalies[0]
        step(f"8/8 【复核入口】风控分析师对异常 ID={first['id']} 给出处理意见")
        decision = batch_service.add_review_decision(
            anomaly_id=first["id"],
            reviewer="风控分析师_老王",
            decision="补充历史评分后重新处理",
            handling_opinion=f"已联系教学组补录{first['student_code']}同学{first['question_code']}的历史评分(4.2分)，可重新跑批",
            supplemental_data="historical_score=4.2"
        )
        print(json.dumps(decision, ensure_ascii=False, indent=2))

        step(f"【异常回溯】顺着异常 ID={first['id']} 反查到学生错题和处理意见")
        trace = batch_service.trace_anomaly(first["id"])
        print(json.dumps(trace, ensure_ascii=False, indent=2, default=str))

    step("【导出结果】批次结果导出为 CSV 和 JSON")
    export_batch(batch["id"], "csv")
    export_batch(batch["id"], "json")

    step("流程完成 - 总结")
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) AS n FROM anomalies")
        total_a = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) AS n FROM anomalies WHERE anomaly_type='historical_score_missing' AND reviewed=0")
        pending_gaps = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) AS n FROM review_decisions")
        reviewed = c.fetchone()["n"]
    print(f"异常总数: {total_a}")
    print(f"待补缺口(历史评分缺失): {pending_gaps}")
    print(f"已复核处理: {reviewed}")
    print(f"\n提示: 启动 Web 服务:  python run.py")
    print(f"      然后浏览器/curl 访问 http://127.0.0.1:5000/anomalies 查看异常")


def export_batch(batch_id: int, fmt: str):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT batch_code FROM processing_batches WHERE id = ?", (batch_id,))
        bc = c.fetchone()["batch_code"]
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

    fname = f"batch_{bc}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{fmt}"
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
    print(f"已导出: {fpath}")


if __name__ == "__main__":
    main()
