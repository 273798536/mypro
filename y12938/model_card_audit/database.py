import os
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Optional, List, Dict, Any, Iterator


class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_db()

    @contextmanager
    def _get_conn(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.executescript("""
                CREATE TABLE IF NOT EXISTS batches (
                    batch_id TEXT PRIMARY KEY,
                    batch_name TEXT NOT NULL,
                    batch_type TEXT NOT NULL CHECK(batch_type IN ('training', 'evaluation')),
                    material_count INTEGER NOT NULL DEFAULT 0,
                    content_hash TEXT NOT NULL,
                    source_dir TEXT NOT NULL,
                    imported_at TEXT NOT NULL,
                    superseded_by TEXT,
                    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'superseded', 'archived')),
                    FOREIGN KEY (superseded_by) REFERENCES batches(batch_id)
                );

                CREATE TABLE IF NOT EXISTS materials (
                    material_id TEXT PRIMARY KEY,
                    batch_id TEXT NOT NULL,
                    material_type TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    content_preview TEXT,
                    metadata_json TEXT,
                    imported_at TEXT NOT NULL,
                    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_materials_batch ON materials(batch_id);
                CREATE INDEX IF NOT EXISTS idx_materials_hash ON materials(content_hash);

                CREATE TABLE IF NOT EXISTS audit_runs (
                    run_id TEXT PRIMARY KEY,
                    training_batch_id TEXT NOT NULL,
                    evaluation_batch_id TEXT NOT NULL,
                    run_at TEXT NOT NULL,
                    input_dir TEXT NOT NULL,
                    output_dir TEXT NOT NULL,
                    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'partial')),
                    error_message TEXT,
                    content_hash TEXT NOT NULL,
                    superseded_by TEXT,
                    FOREIGN KEY (training_batch_id) REFERENCES batches(batch_id),
                    FOREIGN KEY (evaluation_batch_id) REFERENCES batches(batch_id),
                    FOREIGN KEY (superseded_by) REFERENCES audit_runs(run_id)
                );

                CREATE INDEX IF NOT EXISTS idx_audit_runs_batches ON audit_runs(training_batch_id, evaluation_batch_id);
                CREATE INDEX IF NOT EXISTS idx_audit_runs_hash ON audit_runs(content_hash);

                CREATE TABLE IF NOT EXISTS audit_conclusions (
                    conclusion_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    material_pair_key TEXT NOT NULL,
                    training_material_id TEXT,
                    evaluation_material_id TEXT,
                    conclusion_type TEXT NOT NULL CHECK(conclusion_type IN (
                        'pass', 'fail', 'pending_confirmation', 'missing_feedback',
                        'skewed_evaluation', 'conflict', 'duplicate'
                    )),
                    severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'error', 'critical')),
                    summary TEXT NOT NULL,
                    detail_json TEXT NOT NULL,
                    actionable_items_json TEXT,
                    created_at TEXT NOT NULL,
                    is_latest INTEGER NOT NULL DEFAULT 1,
                    superseded_by TEXT,
                    FOREIGN KEY (run_id) REFERENCES audit_runs(run_id) ON DELETE CASCADE,
                    FOREIGN KEY (training_material_id) REFERENCES materials(material_id),
                    FOREIGN KEY (evaluation_material_id) REFERENCES materials(material_id)
                );

                CREATE INDEX IF NOT EXISTS idx_conclusions_run ON audit_conclusions(run_id);
                CREATE INDEX IF NOT EXISTS idx_conclusions_pair ON audit_conclusions(material_pair_key);
                CREATE INDEX IF NOT EXISTS idx_conclusions_latest ON audit_conclusions(is_latest, material_pair_key);

                CREATE TABLE IF NOT EXISTS human_feedbacks (
                    feedback_id TEXT PRIMARY KEY,
                    batch_id TEXT NOT NULL,
                    material_id TEXT,
                    feedback_type TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    content_json TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    imported_at TEXT NOT NULL,
                    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
                    FOREIGN KEY (material_id) REFERENCES materials(material_id)
                );

                CREATE INDEX IF NOT EXISTS idx_feedbacks_batch ON human_feedbacks(batch_id);
                CREATE INDEX IF NOT EXISTS idx_feedbacks_material ON human_feedbacks(material_id);
            """)

    def compute_content_hash(self, obj: Any) -> str:
        import hashlib
        content = json.dumps(obj, ensure_ascii=False, sort_keys=True, default=str)
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def compute_batch_hash(self, materials_data: List[Dict[str, Any]]) -> str:
        sorted_data = sorted(
            [
                {
                    "file_name": m.get("file_name", ""),
                    "content_hash": m.get("content_hash", "")
                }
                for m in materials_data
            ],
            key=lambda x: x["file_name"]
        )
        return self.compute_content_hash(sorted_data)

    def compute_run_hash(self, training_batch_id: str, evaluation_batch_id: str,
                         feedback_ids: Optional[List[str]] = None) -> str:
        data = {
            "training": training_batch_id,
            "evaluation": evaluation_batch_id,
            "feedbacks": sorted(feedback_ids or [])
        }
        return self.compute_content_hash(data)
