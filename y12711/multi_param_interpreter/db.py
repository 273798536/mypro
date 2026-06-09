import sqlite3
import os
import json
from contextlib import contextmanager
from typing import List, Optional, Dict, Any, Iterator
from .models import (
    QuestionRecord, ImportBatch, CalculationRecord,
    ReviewRecord, DataSource, JudgmentStatus, ReviewAction
)


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS import_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_records INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    skipped_details TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    source TEXT NOT NULL,
    raw_data TEXT NOT NULL,
    difficulty REAL,
    discrimination REAL,
    guess_rate REAL,
    correct_count INTEGER,
    total_count INTEGER,
    mistake_count INTEGER,
    answer_text TEXT,
    import_batch_id TEXT,
    UNIQUE(question_id, source, import_batch_id)
);

CREATE TABLE IF NOT EXISTS calculation_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    raw_value REAL,
    adjusted_value REAL,
    formula_before TEXT NOT NULL,
    formula_after TEXT NOT NULL,
    explanation_before TEXT NOT NULL,
    explanation_after TEXT NOT NULL,
    judgment_before TEXT NOT NULL,
    judgment_after TEXT NOT NULL,
    is_edge_case INTEGER DEFAULT 0,
    edge_type TEXT,
    edge_detail TEXT,
    source_material TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calculation_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    reviewer_note TEXT NOT NULL,
    parameter_adjustment TEXT,
    supplementary_data TEXT,
    reviewed_at TEXT NOT NULL,
    reviewed_by TEXT NOT NULL,
    FOREIGN KEY (calculation_id) REFERENCES calculation_records(id)
);

CREATE INDEX IF NOT EXISTS idx_calc_qid ON calculation_records(question_id);
CREATE INDEX IF NOT EXISTS idx_calc_edge ON calculation_records(is_edge_case);
CREATE INDEX IF NOT EXISTS idx_review_cid ON review_records(calculation_id);
"""


class Database:
    def __init__(self, db_path: str = "interpreter.db"):
        self.db_path = db_path
        self._init_db()

    @contextmanager
    def _conn(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._conn() as conn:
            conn.executescript(SCHEMA_SQL)

    def reset(self) -> None:
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self._init_db()

    # --- ImportBatch ---
    def insert_batch(self, batch: ImportBatch) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT INTO import_batches
                   (batch_id, source, file_name, total_records,
                    success_count, skipped_count, error_count,
                    skipped_details, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (batch.batch_id, batch.source.value, batch.file_name,
                 batch.total_records, batch.success_count,
                 batch.skipped_count, batch.error_count,
                 json.dumps(batch.skipped_details, ensure_ascii=False),
                 batch.created_at)
            )
            return cur.lastrowid

    def get_batch(self, batch_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM import_batches WHERE batch_id = ?",
                (batch_id,)
            ).fetchone()
            return dict(row) if row else None

    def list_batches(self) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM import_batches ORDER BY created_at DESC"
            ).fetchall()
            return [dict(r) for r in rows]

    # --- QuestionRecord ---
    def insert_question(self, q: QuestionRecord) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT OR REPLACE INTO question_records
                   (question_id, source, raw_data, difficulty, discrimination,
                    guess_rate, correct_count, total_count, mistake_count,
                    answer_text, import_batch_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (q.question_id, q.source.value,
                 json.dumps(q.raw_data, ensure_ascii=False),
                 q.difficulty, q.discrimination, q.guess_rate,
                 q.correct_count, q.total_count, q.mistake_count,
                 q.answer_text, q.import_batch_id)
            )
            return cur.lastrowid

    def get_questions(self, batch_id: Optional[str] = None,
                      source: Optional[DataSource] = None,
                      question_id: Optional[str] = None) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM question_records WHERE 1=1"
        params: List[Any] = []
        if batch_id:
            sql += " AND import_batch_id = ?"
            params.append(batch_id)
        if source:
            sql += " AND source = ?"
            params.append(source.value)
        if question_id:
            sql += " AND question_id = ?"
            params.append(question_id)
        sql += " ORDER BY id ASC"
        with self._conn() as conn:
            rows = conn.execute(sql, params).fetchall()
            return [dict(r) for r in rows]

    def get_question(self, question_id: str,
                     source: Optional[DataSource] = None) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM question_records WHERE question_id = ?"
        params: List[Any] = [question_id]
        if source:
            sql += " AND source = ?"
            params.append(source.value)
        with self._conn() as conn:
            row = conn.execute(sql, params).fetchone()
            return dict(row) if row else None

    # --- CalculationRecord ---
    def insert_calculation(self, c: CalculationRecord) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT INTO calculation_records
                   (question_id, batch_id, parameter_name, raw_value,
                    adjusted_value, formula_before, formula_after,
                    explanation_before, explanation_after,
                    judgment_before, judgment_after,
                    is_edge_case, edge_type, edge_detail,
                    source_material, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (c.question_id, c.batch_id, c.parameter_name,
                 c.raw_value, c.adjusted_value,
                 c.formula_before, c.formula_after,
                 c.explanation_before, c.explanation_after,
                 c.judgment_before.value, c.judgment_after.value,
                 1 if c.is_edge_case else 0,
                 c.edge_type, c.edge_detail, c.source_material,
                 c.created_at)
            )
            return cur.lastrowid

    def get_calculations(self, question_id: Optional[str] = None,
                         edge_only: bool = False) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM calculation_records WHERE 1=1"
        params: List[Any] = []
        if question_id:
            sql += " AND question_id = ?"
            params.append(question_id)
        if edge_only:
            sql += " AND is_edge_case = 1"
        sql += " ORDER BY created_at DESC"
        with self._conn() as conn:
            rows = conn.execute(sql, params).fetchall()
            return [dict(r) for r in rows]

    def get_calculation(self, calc_id: int) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM calculation_records WHERE id = ?",
                (calc_id,)
            ).fetchone()
            return dict(row) if row else None

    def update_calculation(self, calc_id: int,
                           updates: Dict[str, Any]) -> None:
        if not updates:
            return
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        params = list(updates.values()) + [calc_id]
        with self._conn() as conn:
            conn.execute(
                f"UPDATE calculation_records SET {set_clause} WHERE id = ?",
                params
            )

    # --- ReviewRecord ---
    def insert_review(self, r: ReviewRecord) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT INTO review_records
                   (calculation_id, action, reviewer_note,
                    parameter_adjustment, supplementary_data,
                    reviewed_at, reviewed_by)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (r.calculation_id, r.action.value, r.reviewer_note,
                 json.dumps(r.parameter_adjustment, ensure_ascii=False)
                 if r.parameter_adjustment else None,
                 json.dumps(r.supplementary_data, ensure_ascii=False)
                 if r.supplementary_data else None,
                 r.reviewed_at, r.reviewed_by)
            )
            return cur.lastrowid

    def get_reviews(self, calculation_id: int) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """SELECT * FROM review_records
                   WHERE calculation_id = ? ORDER BY reviewed_at DESC""",
                (calculation_id,)
            ).fetchall()
            result = []
            for r in rows:
                d = dict(r)
                for k in ("parameter_adjustment", "supplementary_data"):
                    if d.get(k):
                        try:
                            d[k] = json.loads(d[k])
                        except (json.JSONDecodeError, TypeError):
                            pass
                result.append(d)
            return result

    def list_edge_cases(self) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """SELECT cr.*, ib.file_name as source_file, ib.source as batch_source
                   FROM calculation_records cr
                   LEFT JOIN import_batches ib ON cr.batch_id = ib.batch_id
                   WHERE cr.is_edge_case = 1
                   ORDER BY cr.created_at DESC"""
            ).fetchall()
            return [dict(r) for r in rows]

    def get_formula_trace(self, question_id: str) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """SELECT cr.id, cr.parameter_name, cr.raw_value, cr.adjusted_value,
                          cr.formula_before, cr.formula_after,
                          cr.explanation_before, cr.explanation_after,
                          cr.judgment_before, cr.judgment_after,
                          cr.is_edge_case, cr.edge_type, cr.edge_detail,
                          cr.source_material, cr.created_at,
                          rr.action as review_action, rr.reviewer_note
                   FROM calculation_records cr
                   LEFT JOIN review_records rr ON rr.calculation_id = cr.id
                   WHERE cr.question_id = ?
                   ORDER BY cr.created_at DESC, rr.reviewed_at DESC""",
                (question_id,)
            ).fetchall()
            return [dict(r) for r in rows]