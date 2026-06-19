"""数据存储层 - 基于 SQLite"""

import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Type, TypeVar

from .models import (
    IndexSuggestion,
    PermissionAuditRecord,
    SlowQueryRecord,
    MigrationScript,
    BackupRecord,
    AuditReport,
    SourceReference,
    IndexType,
    PermissionLevel,
    AuditStatus,
    RecordSource,
)

T = TypeVar("T")


class AuditStorage:
    """审计数据存储"""

    def __init__(self, db_path: str = "audit.db"):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """初始化数据库表"""
        conn = self._get_conn()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS index_suggestions (
                    id TEXT PRIMARY KEY,
                    table_name TEXT NOT NULL,
                    column_names TEXT NOT NULL,
                    index_type TEXT NOT NULL,
                    suggestion_reason TEXT NOT NULL,
                    expected_improvement REAL NOT NULL,
                    current_index_count INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    sources TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    reviewed_by TEXT,
                    data_batch_id TEXT
                );

                CREATE TABLE IF NOT EXISTS permission_audits (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    table_name TEXT NOT NULL,
                    permission_level TEXT NOT NULL,
                    granted_at TEXT NOT NULL,
                    grantor TEXT,
                    status TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    risk_reason TEXT,
                    sources TEXT NOT NULL,
                    reviewed_by TEXT,
                    data_batch_id TEXT
                );

                CREATE TABLE IF NOT EXISTS slow_queries (
                    id TEXT PRIMARY KEY,
                    query_sql TEXT NOT NULL,
                    execution_time_ms REAL NOT NULL,
                    rows_examined INTEGER NOT NULL,
                    rows_sent INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    table_name TEXT,
                    attribution TEXT,
                    attribution_details TEXT,
                    sources TEXT NOT NULL,
                    related_index_suggestion_id TEXT,
                    data_batch_id TEXT
                );

                CREATE TABLE IF NOT EXISTS migration_scripts (
                    id TEXT PRIMARY KEY,
                    version TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    page_number INTEGER NOT NULL,
                    total_pages INTEGER NOT NULL,
                    applied_at TEXT,
                    is_applied INTEGER NOT NULL DEFAULT 0,
                    checksum TEXT,
                    has_field_drift INTEGER NOT NULL DEFAULT 0,
                    drift_details TEXT
                );

                CREATE TABLE IF NOT EXISTS backup_records (
                    id TEXT PRIMARY KEY,
                    backup_name TEXT NOT NULL,
                    backup_time TEXT NOT NULL,
                    backup_size_bytes INTEGER NOT NULL,
                    source_db TEXT NOT NULL,
                    status TEXT NOT NULL,
                    can_use_directly INTEGER NOT NULL DEFAULT 0,
                    review_reason TEXT,
                    integrity_verified INTEGER NOT NULL DEFAULT 0,
                    sources TEXT NOT NULL,
                    data_batch_id TEXT
                );

                CREATE TABLE IF NOT EXISTS audit_reports (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    generated_at TEXT NOT NULL,
                    data_batch_id TEXT NOT NULL,
                    index_suggestion_count INTEGER NOT NULL DEFAULT 0,
                    index_suggestion_passed INTEGER NOT NULL DEFAULT 0,
                    permission_audit_count INTEGER NOT NULL DEFAULT 0,
                    permission_audit_needs_review INTEGER NOT NULL DEFAULT 0,
                    slow_query_count INTEGER NOT NULL DEFAULT 0,
                    backup_count INTEGER NOT NULL DEFAULT 0,
                    backup_can_use_directly INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS data_batches (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    description TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_suggestions_batch ON index_suggestions(data_batch_id);
                CREATE INDEX IF NOT EXISTS idx_permission_batch ON permission_audits(data_batch_id);
                CREATE INDEX IF NOT EXISTS idx_slow_query_batch ON slow_queries(data_batch_id);
                CREATE INDEX IF NOT EXISTS idx_backup_batch ON backup_records(data_batch_id);
            """)
            conn.commit()
        finally:
            conn.close()

    def create_batch(self, name: str, description: str = "") -> str:
        """创建数据批次，返回 batch_id"""
        batch_id = str(uuid.uuid4())
        conn = self._get_conn()
        try:
            conn.execute(
                "INSERT INTO data_batches (id, name, created_at, description) VALUES (?, ?, ?, ?)",
                (batch_id, name, datetime.now().isoformat(), description),
            )
            conn.commit()
            return batch_id
        finally:
            conn.close()

    def _serialize_sources(self, sources: List[SourceReference]) -> str:
        return json.dumps([s.to_dict() for s in sources])

    def _deserialize_sources(self, sources_json: str) -> List[SourceReference]:
        items = json.loads(sources_json)
        return [
            SourceReference(
                source_type=RecordSource(item["source_type"]),
                source_id=item["source_id"],
                source_path=item["source_path"],
                line_number=item.get("line_number"),
                details=item.get("details"),
            )
            for item in items
        ]

    def add_index_suggestion(self, suggestion: IndexSuggestion, batch_id: Optional[str] = None):
        conn = self._get_conn()
        try:
            conn.execute(
                """INSERT INTO index_suggestions
                   (id, table_name, column_names, index_type, suggestion_reason,
                    expected_improvement, current_index_count, status, sources,
                    created_at, reviewed_by, data_batch_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    suggestion.id,
                    suggestion.table_name,
                    json.dumps(suggestion.column_names),
                    suggestion.index_type.value,
                    suggestion.suggestion_reason,
                    suggestion.expected_improvement,
                    suggestion.current_index_count,
                    suggestion.status.value,
                    self._serialize_sources(suggestion.sources),
                    suggestion.created_at.isoformat(),
                    suggestion.reviewed_by,
                    batch_id,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def add_permission_audit(self, record: PermissionAuditRecord, batch_id: Optional[str] = None):
        conn = self._get_conn()
        try:
            conn.execute(
                """INSERT INTO permission_audits
                   (id, user_id, user_name, table_name, permission_level,
                    granted_at, grantor, status, risk_level, risk_reason,
                    sources, reviewed_by, data_batch_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    record.id,
                    record.user_id,
                    record.user_name,
                    record.table_name,
                    record.permission_level.value,
                    record.granted_at.isoformat(),
                    record.grantor,
                    record.status.value,
                    record.risk_level,
                    record.risk_reason,
                    self._serialize_sources(record.sources),
                    record.reviewed_by,
                    batch_id,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def add_slow_query(self, record: SlowQueryRecord, batch_id: Optional[str] = None):
        conn = self._get_conn()
        try:
            conn.execute(
                """INSERT INTO slow_queries
                   (id, query_sql, execution_time_ms, rows_examined, rows_sent,
                    timestamp, table_name, attribution, attribution_details,
                    sources, related_index_suggestion_id, data_batch_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    record.id,
                    record.query_sql,
                    record.execution_time_ms,
                    record.rows_examined,
                    record.rows_sent,
                    record.timestamp.isoformat(),
                    record.table_name,
                    record.attribution,
                    record.attribution_details,
                    self._serialize_sources(record.sources),
                    record.related_index_suggestion_id,
                    batch_id,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def add_migration_script(self, script: MigrationScript):
        conn = self._get_conn()
        try:
            conn.execute(
                """INSERT INTO migration_scripts
                   (id, version, file_path, page_number, total_pages,
                    applied_at, is_applied, checksum, has_field_drift, drift_details)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    script.id,
                    script.version,
                    script.file_path,
                    script.page_number,
                    script.total_pages,
                    script.applied_at.isoformat() if script.applied_at else None,
                    1 if script.is_applied else 0,
                    script.checksum,
                    1 if script.has_field_drift else 0,
                    script.drift_details,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def add_backup_record(self, record: BackupRecord, batch_id: Optional[str] = None):
        conn = self._get_conn()
        try:
            conn.execute(
                """INSERT INTO backup_records
                   (id, backup_name, backup_time, backup_size_bytes, source_db,
                    status, can_use_directly, review_reason, integrity_verified,
                    sources, data_batch_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    record.id,
                    record.backup_name,
                    record.backup_time.isoformat(),
                    record.backup_size_bytes,
                    record.source_db,
                    record.status.value,
                    1 if record.can_use_directly else 0,
                    record.review_reason,
                    1 if record.integrity_verified else 0,
                    self._serialize_sources(record.sources),
                    batch_id,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def add_report(self, report: AuditReport):
        conn = self._get_conn()
        try:
            conn.execute(
                """INSERT INTO audit_reports
                   (id, name, generated_at, data_batch_id,
                    index_suggestion_count, index_suggestion_passed,
                    permission_audit_count, permission_audit_needs_review,
                    slow_query_count, backup_count, backup_can_use_directly)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    report.id,
                    report.name,
                    report.generated_at.isoformat(),
                    report.data_batch_id,
                    report.index_suggestion_count,
                    report.index_suggestion_passed,
                    report.permission_audit_count,
                    report.permission_audit_needs_review,
                    report.slow_query_count,
                    report.backup_count,
                    report.backup_can_use_directly,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def get_index_suggestions(self, batch_id: Optional[str] = None) -> List[IndexSuggestion]:
        conn = self._get_conn()
        try:
            if batch_id:
                rows = conn.execute(
                    "SELECT * FROM index_suggestions WHERE data_batch_id = ? ORDER BY created_at DESC",
                    (batch_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM index_suggestions ORDER BY created_at DESC"
                ).fetchall()

            return [
                IndexSuggestion(
                    id=row["id"],
                    table_name=row["table_name"],
                    column_names=json.loads(row["column_names"]),
                    index_type=IndexType(row["index_type"]),
                    suggestion_reason=row["suggestion_reason"],
                    expected_improvement=row["expected_improvement"],
                    current_index_count=row["current_index_count"],
                    status=AuditStatus(row["status"]),
                    sources=self._deserialize_sources(row["sources"]),
                    created_at=datetime.fromisoformat(row["created_at"]),
                    reviewed_by=row["reviewed_by"],
                )
                for row in rows
            ]
        finally:
            conn.close()

    def get_permission_audits(self, batch_id: Optional[str] = None) -> List[PermissionAuditRecord]:
        conn = self._get_conn()
        try:
            if batch_id:
                rows = conn.execute(
                    "SELECT * FROM permission_audits WHERE data_batch_id = ? ORDER BY granted_at DESC",
                    (batch_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM permission_audits ORDER BY granted_at DESC"
                ).fetchall()

            return [
                PermissionAuditRecord(
                    id=row["id"],
                    user_id=row["user_id"],
                    user_name=row["user_name"],
                    table_name=row["table_name"],
                    permission_level=PermissionLevel(row["permission_level"]),
                    granted_at=datetime.fromisoformat(row["granted_at"]),
                    grantor=row["grantor"],
                    status=AuditStatus(row["status"]),
                    risk_level=row["risk_level"],
                    risk_reason=row["risk_reason"],
                    sources=self._deserialize_sources(row["sources"]),
                    reviewed_by=row["reviewed_by"],
                )
                for row in rows
            ]
        finally:
            conn.close()

    def get_slow_queries(self, batch_id: Optional[str] = None) -> List[SlowQueryRecord]:
        conn = self._get_conn()
        try:
            if batch_id:
                rows = conn.execute(
                    "SELECT * FROM slow_queries WHERE data_batch_id = ? ORDER BY timestamp DESC",
                    (batch_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM slow_queries ORDER BY timestamp DESC"
                ).fetchall()

            return [
                SlowQueryRecord(
                    id=row["id"],
                    query_sql=row["query_sql"],
                    execution_time_ms=row["execution_time_ms"],
                    rows_examined=row["rows_examined"],
                    rows_sent=row["rows_sent"],
                    timestamp=datetime.fromisoformat(row["timestamp"]),
                    table_name=row["table_name"],
                    attribution=row["attribution"],
                    attribution_details=row["attribution_details"],
                    sources=self._deserialize_sources(row["sources"]),
                    related_index_suggestion_id=row["related_index_suggestion_id"],
                )
                for row in rows
            ]
        finally:
            conn.close()

    def get_migration_scripts(self) -> List[MigrationScript]:
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM migration_scripts ORDER BY version, page_number"
            ).fetchall()

            return [
                MigrationScript(
                    id=row["id"],
                    version=row["version"],
                    file_path=row["file_path"],
                    page_number=row["page_number"],
                    total_pages=row["total_pages"],
                    applied_at=datetime.fromisoformat(row["applied_at"]) if row["applied_at"] else None,
                    is_applied=bool(row["is_applied"]),
                    checksum=row["checksum"],
                    has_field_drift=bool(row["has_field_drift"]),
                    drift_details=row["drift_details"],
                )
                for row in rows
            ]
        finally:
            conn.close()

    def get_backup_records(self, batch_id: Optional[str] = None) -> List[BackupRecord]:
        conn = self._get_conn()
        try:
            if batch_id:
                rows = conn.execute(
                    "SELECT * FROM backup_records WHERE data_batch_id = ? ORDER BY backup_time DESC",
                    (batch_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM backup_records ORDER BY backup_time DESC"
                ).fetchall()

            return [
                BackupRecord(
                    id=row["id"],
                    backup_name=row["backup_name"],
                    backup_time=datetime.fromisoformat(row["backup_time"]),
                    backup_size_bytes=row["backup_size_bytes"],
                    source_db=row["source_db"],
                    status=AuditStatus(row["status"]),
                    can_use_directly=bool(row["can_use_directly"]),
                    review_reason=row["review_reason"],
                    integrity_verified=bool(row["integrity_verified"]),
                    sources=self._deserialize_sources(row["sources"]),
                )
                for row in rows
            ]
        finally:
            conn.close()

    def get_reports(self) -> List[AuditReport]:
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM audit_reports ORDER BY generated_at DESC"
            ).fetchall()

            return [
                AuditReport(
                    id=row["id"],
                    name=row["name"],
                    generated_at=datetime.fromisoformat(row["generated_at"]),
                    data_batch_id=row["data_batch_id"],
                    index_suggestion_count=row["index_suggestion_count"],
                    index_suggestion_passed=row["index_suggestion_passed"],
                    permission_audit_count=row["permission_audit_count"],
                    permission_audit_needs_review=row["permission_audit_needs_review"],
                    slow_query_count=row["slow_query_count"],
                    backup_count=row["backup_count"],
                    backup_can_use_directly=row["backup_can_use_directly"],
                )
                for row in rows
            ]
        finally:
            conn.close()

    def get_batch_batches(self) -> List[dict]:
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM data_batches ORDER BY created_at DESC"
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    def clear_all(self):
        """清空所有数据 - 用于测试"""
        conn = self._get_conn()
        try:
            conn.executescript("""
                DELETE FROM index_suggestions;
                DELETE FROM permission_audits;
                DELETE FROM slow_queries;
                DELETE FROM migration_scripts;
                DELETE FROM backup_records;
                DELETE FROM audit_reports;
                DELETE FROM data_batches;
            """)
            conn.commit()
        finally:
            conn.close()
