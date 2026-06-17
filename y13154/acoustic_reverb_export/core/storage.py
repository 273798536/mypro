import sqlite3
import json
import os
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


class Storage:
    """SQLite 持久化层，负责所有数据的存取和版本追踪。"""

    _thread_local = threading.local()
    _lock = threading.Lock()

    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "reverb_data.db",
            )
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        if not hasattr(self._thread_local, "conn") or self._thread_local.conn is None:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")
            self._thread_local.conn = conn
        return self._thread_local.conn

    def _init_db(self):
        conn = self._get_conn()
        with self._lock:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS param_versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version_tag TEXT UNIQUE NOT NULL,
                    params_json TEXT NOT NULL,
                    source TEXT,
                    operator TEXT,
                    remark TEXT,
                    created_at TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS photo_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    photo_id TEXT UNIQUE NOT NULL,
                    source_system TEXT,
                    original_fields_json TEXT NOT NULL,
                    normalized_fields_json TEXT NOT NULL,
                    raw_description TEXT,
                    file_path TEXT,
                    upload_time TEXT,
                    reviewer TEXT,
                    process_status TEXT DEFAULT 'pending',
                    linked_report_run_id INTEGER,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_photo_status ON photo_records(process_status);
                CREATE INDEX IF NOT EXISTS idx_photo_report ON photo_records(linked_report_run_id);

                CREATE TABLE IF NOT EXISTS sampling_gaps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    report_run_id INTEGER NOT NULL,
                    gap_type TEXT NOT NULL,
                    source_file TEXT,
                    source_row INTEGER,
                    start_time TEXT,
                    end_time TEXT,
                    frequency_range TEXT,
                    impact_scope TEXT NOT NULL,
                    description TEXT,
                    is_manual INTEGER DEFAULT 0,
                    detected_at TEXT NOT NULL,
                    FOREIGN KEY(report_run_id) REFERENCES report_runs(id)
                );

                CREATE TABLE IF NOT EXISTS report_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_tag TEXT UNIQUE NOT NULL,
                    param_version_id INTEGER NOT NULL,
                    status TEXT DEFAULT 'running',
                    failure_reason TEXT,
                    screenshot_path TEXT,
                    screenshot_description TEXT,
                    export_path TEXT,
                    historical_remark TEXT,
                    current_remark TEXT,
                    triggered_by TEXT,
                    started_at TEXT NOT NULL,
                    finished_at TEXT,
                    FOREIGN KEY(param_version_id) REFERENCES param_versions(id)
                );
                CREATE INDEX IF NOT EXISTS idx_run_status ON report_runs(status);
                CREATE INDEX IF NOT EXISTS idx_run_param ON report_runs(param_version_id);

                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_type TEXT NOT NULL,
                    entity_id INTEGER,
                    action TEXT NOT NULL,
                    before_json TEXT,
                    after_json TEXT,
                    operator TEXT,
                    remark TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
                """
            )
            conn.commit()
        self._migrate()

    def _migrate(self):
        """对已存在的旧库做增量迁移, 保证新增列存在。"""
        conn = self._get_conn()
        with self._lock:
            cursor = conn.execute("PRAGMA table_info(sampling_gaps)")
            existing_cols = {row["name"] for row in cursor.fetchall()}
            if "is_manual" not in existing_cols:
                conn.execute(
                    "ALTER TABLE sampling_gaps ADD COLUMN is_manual INTEGER DEFAULT 0"
                )
                conn.commit()

    @staticmethod
    def _now() -> str:
        return datetime.now().isoformat(timespec="seconds")

    def _log_audit(
        self,
        entity_type: str,
        entity_id: Optional[int],
        action: str,
        before: Any = None,
        after: Any = None,
        operator: str = "system",
        remark: str = "",
    ):
        conn = self._get_conn()
        conn.execute(
            "INSERT INTO audit_log (entity_type, entity_id, action, before_json, after_json, operator, remark, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                entity_type,
                entity_id,
                action,
                json.dumps(before, ensure_ascii=False) if before is not None else None,
                json.dumps(after, ensure_ascii=False) if after is not None else None,
                operator,
                remark,
                self._now(),
            ),
        )
        conn.commit()

    # ---------- param_versions ----------
    def create_param_version(
        self,
        params: Dict[str, Any],
        source: str = "",
        operator: str = "system",
        remark: str = "",
        version_tag: str = None,
    ) -> str:
        if version_tag is None:
            version_tag = "PV-" + datetime.now().strftime("%Y%m%d-%H%M%S-%f")[:-3]
        conn = self._get_conn()
        with self._lock:
            conn.execute(
                "UPDATE param_versions SET is_active = 0 WHERE is_active = 1"
            )
            conn.execute(
                "INSERT INTO param_versions (version_tag, params_json, source, operator, remark, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
                (
                    version_tag,
                    json.dumps(params, ensure_ascii=False),
                    source,
                    operator,
                    remark,
                    self._now(),
                ),
            )
            conn.commit()
            cursor = conn.execute(
                "SELECT id FROM param_versions WHERE version_tag = ?", (version_tag,)
            )
            row = cursor.fetchone()
            self._log_audit(
                "param_version",
                row["id"],
                "create",
                after={"version_tag": version_tag, "params": params, "source": source},
                operator=operator,
                remark=remark,
            )
        return version_tag

    def get_param_version(self, version_tag: str = None) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        if version_tag:
            cursor = conn.execute(
                "SELECT * FROM param_versions WHERE version_tag = ?", (version_tag,)
            )
        else:
            cursor = conn.execute(
                "SELECT * FROM param_versions WHERE is_active = 1 ORDER BY id DESC LIMIT 1"
            )
        row = cursor.fetchone()
        if not row:
            return None
        data = dict(row)
        data["params"] = json.loads(data["params_json"])
        return data

    def list_param_versions(self, limit: int = 20) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        cursor = conn.execute(
            "SELECT * FROM param_versions ORDER BY id DESC LIMIT ?", (limit,)
        )
        result = []
        for row in cursor.fetchall():
            d = dict(row)
            d["params"] = json.loads(d["params_json"])
            result.append(d)
        return result

    # ---------- photo_records ----------
    def upsert_photo(
        self,
        photo_id: str,
        original_fields: Dict[str, Any],
        normalized_fields: Dict[str, Any],
        source_system: str = "",
        raw_description: str = "",
        file_path: str = "",
        upload_time: str = "",
        reviewer: str = "",
        process_status: str = "pending",
    ) -> int:
        conn = self._get_conn()
        now = self._now()
        with self._lock:
            cursor = conn.execute(
                "SELECT id, original_fields_json, normalized_fields_json, process_status FROM photo_records WHERE photo_id = ?",
                (photo_id,),
            )
            existing = cursor.fetchone()
            if existing:
                before = {
                    "original": json.loads(existing["original_fields_json"]),
                    "normalized": json.loads(existing["normalized_fields_json"]),
                    "status": existing["process_status"],
                }
                conn.execute(
                    "UPDATE photo_records SET original_fields_json=?, normalized_fields_json=?, source_system=?, raw_description=?, file_path=?, upload_time=?, reviewer=?, process_status=?, updated_at=? WHERE id=?",
                    (
                        json.dumps(original_fields, ensure_ascii=False),
                        json.dumps(normalized_fields, ensure_ascii=False),
                        source_system,
                        raw_description,
                        file_path,
                        upload_time,
                        reviewer,
                        process_status,
                        now,
                        existing["id"],
                    ),
                )
                conn.commit()
                self._log_audit(
                    "photo",
                    existing["id"],
                    "update",
                    before=before,
                    after={
                        "original": original_fields,
                        "normalized": normalized_fields,
                        "status": process_status,
                    },
                    remark=f"photo_id={photo_id}",
                )
                return existing["id"]
            else:
                cursor = conn.execute(
                    "INSERT INTO photo_records (photo_id, source_system, original_fields_json, normalized_fields_json, raw_description, file_path, upload_time, reviewer, process_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        photo_id,
                        source_system,
                        json.dumps(original_fields, ensure_ascii=False),
                        json.dumps(normalized_fields, ensure_ascii=False),
                        raw_description,
                        file_path,
                        upload_time,
                        reviewer,
                        process_status,
                        now,
                        now,
                    ),
                )
                conn.commit()
                self._log_audit(
                    "photo",
                    cursor.lastrowid,
                    "create",
                    after={
                        "photo_id": photo_id,
                        "original": original_fields,
                        "status": process_status,
                    },
                    remark=f"source_system={source_system}",
                )
                return cursor.lastrowid

    def set_photo_status(
        self,
        photo_id: str,
        process_status: str,
        report_run_id: int = None,
        operator: str = "system",
    ):
        conn = self._get_conn()
        with self._lock:
            cursor = conn.execute(
                "SELECT id, process_status FROM photo_records WHERE photo_id = ?",
                (photo_id,),
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"photo_id {photo_id} not found")
            before = {"status": row["process_status"]}
            conn.execute(
                "UPDATE photo_records SET process_status=?, linked_report_run_id=?, updated_at=? WHERE id=?",
                (process_status, report_run_id, self._now(), row["id"]),
            )
            conn.commit()
            self._log_audit(
                "photo",
                row["id"],
                "status_change",
                before=before,
                after={"status": process_status, "report_run_id": report_run_id},
                operator=operator,
            )

    def list_photos(
        self,
        process_status: str = None,
        report_run_id: int = None,
        limit: int = 200,
    ) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        sql = "SELECT * FROM photo_records WHERE 1=1"
        args = []
        if process_status:
            sql += " AND process_status = ?"
            args.append(process_status)
        if report_run_id is not None:
            sql += " AND linked_report_run_id = ?"
            args.append(report_run_id)
        sql += " ORDER BY id DESC LIMIT ?"
        args.append(limit)
        cursor = conn.execute(sql, args)
        result = []
        for row in cursor.fetchall():
            d = dict(row)
            d["original_fields"] = json.loads(d["original_fields_json"])
            d["normalized_fields"] = json.loads(d["normalized_fields_json"])
            result.append(d)
        return result

    # ---------- report_runs ----------
    def create_report_run(
        self,
        param_version_id: int,
        triggered_by: str = "scheduled",
        run_tag: str = None,
        historical_remark: str = "",
    ) -> Tuple[int, str]:
        if run_tag is None:
            run_tag = "RR-" + datetime.now().strftime("%Y%m%d-%H%M%S-%f")[:-3]
        conn = self._get_conn()
        now = self._now()
        with self._lock:
            cursor = conn.execute(
                "INSERT INTO report_runs (run_tag, param_version_id, status, triggered_by, historical_remark, started_at) VALUES (?, ?, 'running', ?, ?, ?)",
                (run_tag, param_version_id, triggered_by, historical_remark, now),
            )
            conn.commit()
            self._log_audit(
                "report_run",
                cursor.lastrowid,
                "create",
                after={"run_tag": run_tag, "param_version_id": param_version_id},
                operator=triggered_by,
            )
        return cursor.lastrowid, run_tag

    def update_report_run(
        self,
        run_id: int,
        status: str = None,
        failure_reason: str = None,
        screenshot_path: str = None,
        screenshot_description: str = None,
        export_path: str = None,
        current_remark: str = None,
        historical_remark: str = None,
        operator: str = "system",
    ):
        conn = self._get_conn()
        with self._lock:
            cursor = conn.execute(
                "SELECT * FROM report_runs WHERE id = ?", (run_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"report_run {run_id} not found")
            before = dict(row)
            updates = {}
            if status is not None:
                updates["status"] = status
            if failure_reason is not None:
                updates["failure_reason"] = failure_reason
            if screenshot_path is not None:
                updates["screenshot_path"] = screenshot_path
            if screenshot_description is not None:
                updates["screenshot_description"] = screenshot_description
            if export_path is not None:
                updates["export_path"] = export_path
            if current_remark is not None:
                updates["current_remark"] = current_remark
            if historical_remark is not None:
                updates["historical_remark"] = historical_remark
            if status in ("success", "failed"):
                updates["finished_at"] = self._now()
            if not updates:
                return
            set_clause = ", ".join(f"{k}=?" for k in updates.keys())
            values = list(updates.values()) + [run_id]
            conn.execute(f"UPDATE report_runs SET {set_clause} WHERE id=?", values)
            conn.commit()
            self._log_audit(
                "report_run",
                run_id,
                "update",
                before=before,
                after=updates,
                operator=operator,
            )

    def get_report_run(self, run_id: int = None, run_tag: str = None) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        if run_id:
            cursor = conn.execute("SELECT * FROM report_runs WHERE id = ?", (run_id,))
        elif run_tag:
            cursor = conn.execute("SELECT * FROM report_runs WHERE run_tag = ?", (run_tag,))
        else:
            cursor = conn.execute("SELECT * FROM report_runs ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        return dict(row) if row else None

    def list_report_runs(self, limit: int = 50) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        cursor = conn.execute(
            "SELECT r.*, p.version_tag AS param_version_tag FROM report_runs r LEFT JOIN param_versions p ON r.param_version_id = p.id ORDER BY r.id DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in cursor.fetchall()]

    # ---------- sampling_gaps ----------
    def add_sampling_gap(
        self,
        report_run_id: int,
        gap_type: str,
        impact_scope: str,
        source_file: str = "",
        source_row: int = None,
        start_time: str = "",
        end_time: str = "",
        frequency_range: str = "",
        description: str = "",
        is_manual: bool = False,
    ) -> int:
        conn = self._get_conn()
        with self._lock:
            cursor = conn.execute(
                "INSERT INTO sampling_gaps (report_run_id, gap_type, source_file, source_row, start_time, end_time, frequency_range, impact_scope, description, is_manual, detected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    report_run_id,
                    gap_type,
                    source_file,
                    source_row,
                    start_time,
                    end_time,
                    frequency_range,
                    impact_scope,
                    description,
                    1 if is_manual else 0,
                    self._now(),
                ),
            )
            conn.commit()
            self._log_audit(
                "sampling_gap",
                cursor.lastrowid,
                "create",
                after={
                    "report_run_id": report_run_id,
                    "gap_type": gap_type,
                    "impact_scope": impact_scope,
                    "source_file": source_file,
                    "source_row": source_row,
                    "is_manual": is_manual,
                },
            )
            return cursor.lastrowid

    def list_gaps(self, report_run_id: int) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        cursor = conn.execute(
            "SELECT * FROM sampling_gaps WHERE report_run_id = ? ORDER BY id",
            (report_run_id,),
        )
        return [dict(row) for row in cursor.fetchall()]

    # ---------- audit ----------
    def list_audit_log(
        self, entity_type: str = None, entity_id: int = None, limit: int = 100
    ) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        sql = "SELECT * FROM audit_log WHERE 1=1"
        args = []
        if entity_type:
            sql += " AND entity_type = ?"
            args.append(entity_type)
        if entity_id is not None:
            sql += " AND entity_id = ?"
            args.append(entity_id)
        sql += " ORDER BY id DESC LIMIT ?"
        args.append(limit)
        cursor = conn.execute(sql, args)
        result = []
        for row in cursor.fetchall():
            d = dict(row)
            if d.get("before_json"):
                d["before"] = json.loads(d["before_json"])
            if d.get("after_json"):
                d["after"] = json.loads(d["after_json"])
            result.append(d)
        return result
