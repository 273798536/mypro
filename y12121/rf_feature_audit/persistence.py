import sqlite3
import json
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any


class AuditStore:
    def __init__(self, db_path: str = "audit_history.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_runs (
                    audit_id TEXT PRIMARY KEY,
                    model_version TEXT NOT NULL,
                    data_source TEXT NOT NULL,
                    feature_list TEXT NOT NULL,
                    group_column TEXT,
                    created_at TEXT NOT NULL,
                    fingerprint TEXT NOT NULL,
                    importance_result TEXT,
                    group_result TEXT,
                    leakage_result TEXT
                )
            """)
            conn.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_fingerprint
                ON audit_runs(fingerprint)
            """)

    @staticmethod
    def _make_fingerprint(model_version: str, data_source: str,
                          feature_list: List[str], group_column: Optional[str]) -> str:
        canonical = json.dumps({
            "mv": model_version,
            "ds": data_source,
            "fl": sorted(feature_list),
            "gc": group_column,
        }, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def save(self, model_version: str, data_source: str,
             feature_list: List[str], group_column: Optional[str],
             importance_result: Dict, group_result: Optional[Dict],
             leakage_result: Dict) -> str:
        fingerprint = self._make_fingerprint(model_version, data_source,
                                             feature_list, group_column)
        with sqlite3.connect(self.db_path) as conn:
            existing = conn.execute(
                "SELECT audit_id FROM audit_runs WHERE fingerprint = ?",
                (fingerprint,)
            ).fetchone()
            if existing:
                return existing[0]

            audit_id = f"AUDIT_{datetime.now().strftime('%Y%m%d%H%M%S')}_{fingerprint[:8]}"
            conn.execute("""
                INSERT INTO audit_runs
                    (audit_id, model_version, data_source, feature_list,
                     group_column, created_at, fingerprint,
                     importance_result, group_result, leakage_result)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                audit_id, model_version, data_source,
                json.dumps(feature_list, ensure_ascii=False),
                group_column,
                datetime.now().isoformat(),
                fingerprint,
                json.dumps(importance_result, ensure_ascii=False),
                json.dumps(group_result, ensure_ascii=False) if group_result else None,
                json.dumps(leakage_result, ensure_ascii=False),
            ))
        return audit_id

    def load(self, audit_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT * FROM audit_runs WHERE audit_id = ?", (audit_id,)
            ).fetchone()
        if row is None:
            return None
        keys = ["audit_id", "model_version", "data_source", "feature_list",
                "group_column", "created_at", "fingerprint",
                "importance_result", "group_result", "leakage_result"]
        rec = dict(zip(keys, row))
        for k in ("feature_list", "importance_result", "group_result", "leakage_result"):
            if rec[k] is not None:
                rec[k] = json.loads(rec[k])
        return rec

    def list_runs(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT audit_id, model_version, data_source, created_at, fingerprint "
                "FROM audit_runs ORDER BY created_at DESC"
            ).fetchall()
        return [
            {"audit_id": r[0], "model_version": r[1],
             "data_source": r[2], "created_at": r[3], "fingerprint": r[4]}
            for r in rows
        ]
