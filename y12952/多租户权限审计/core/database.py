import sqlite3
import json
import os
from typing import Optional, List, Any, Dict
from contextlib import contextmanager

from .models import (
    Tenant,
    MigrationScript,
    PermissionRule,
    ProcessingRecord,
    AuditFinding,
    ReviewHistory,
)


DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "audit.db")


def _dict_factory(cursor, row):
    fields = [column[0] for column in cursor.description]
    return dict(zip(fields, row))


class Database:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or DEFAULT_DB_PATH
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._conn = None
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path)
            self._conn.row_factory = _dict_factory
            self._conn.execute("PRAGMA foreign_keys = ON")
        return self._conn

    def close(self):
        if self._conn:
            self._conn.close()
            self._conn = None

    @contextmanager
    def transaction(self):
        conn = self._connect()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    def _init_db(self):
        schema_sql = """
        CREATE TABLE IF NOT EXISTS tenants (
            tenant_id TEXT PRIMARY KEY,
            tenant_name TEXT NOT NULL,
            environment TEXT NOT NULL,
            created_at TEXT NOT NULL,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS migration_scripts (
            script_id TEXT PRIMARY KEY,
            version TEXT NOT NULL,
            name TEXT NOT NULL,
            filepath TEXT NOT NULL,
            content TEXT NOT NULL,
            applied_at TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING',
            error_message TEXT,
            applied_by TEXT
        );

        CREATE TABLE IF NOT EXISTS permission_rules (
            rule_id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            role_name TEXT NOT NULL,
            resource TEXT NOT NULL,
            action TEXT NOT NULL,
            granted_by TEXT,
            granted_at TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            comment TEXT,
            FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
        );

        CREATE TABLE IF NOT EXISTS processing_records (
            record_id TEXT PRIMARY KEY,
            batch_no TEXT NOT NULL,
            record_type TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            migration_script_id TEXT,
            permission_rule_id TEXT,
            source_table TEXT,
            source_pk TEXT,
            target_table TEXT,
            target_pk TEXT,
            processed_at TEXT NOT NULL,
            processed_by TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING',
            raw_payload TEXT,
            comment TEXT,
            FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
            FOREIGN KEY (migration_script_id) REFERENCES migration_scripts(script_id),
            FOREIGN KEY (permission_rule_id) REFERENCES permission_rules(rule_id)
        );

        CREATE TABLE IF NOT EXISTS audit_findings (
            finding_id TEXT PRIMARY KEY,
            finding_type TEXT NOT NULL,
            risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            processing_record_id TEXT,
            tenant_id TEXT,
            migration_script_id TEXT,
            permission_rule_id TEXT,
            source_tables TEXT,
            affected_rows INTEGER NOT NULL DEFAULT 0,
            evidence TEXT,
            detected_at TEXT NOT NULL,
            review_status TEXT NOT NULL DEFAULT 'PENDING',
            handler_opinion TEXT,
            FOREIGN KEY (processing_record_id) REFERENCES processing_records(record_id),
            FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
            FOREIGN KEY (migration_script_id) REFERENCES migration_scripts(script_id),
            FOREIGN KEY (permission_rule_id) REFERENCES permission_rules(rule_id)
        );

        CREATE TABLE IF NOT EXISTS review_histories (
            review_id TEXT PRIMARY KEY,
            finding_id TEXT NOT NULL,
            action TEXT NOT NULL,
            reviewer TEXT NOT NULL,
            reviewed_at TEXT NOT NULL,
            old_status TEXT NOT NULL,
            new_status TEXT NOT NULL,
            comment TEXT NOT NULL DEFAULT '',
            FOREIGN KEY (finding_id) REFERENCES audit_findings(finding_id)
        );

        CREATE INDEX IF NOT EXISTS idx_proc_batch ON processing_records(batch_no);
        CREATE INDEX IF NOT EXISTS idx_proc_tenant ON processing_records(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_finding_type ON audit_findings(finding_type);
        CREATE INDEX IF NOT EXISTS idx_finding_status ON audit_findings(review_status);
        CREATE INDEX IF NOT EXISTS idx_finding_record ON audit_findings(processing_record_id);
        CREATE INDEX IF NOT EXISTS idx_review_finding ON review_histories(finding_id);
        """
        with self.transaction() as conn:
            conn.executescript(schema_sql)

    def is_empty(self) -> bool:
        conn = self._connect()
        cur = conn.execute("SELECT COUNT(*) as cnt FROM tenants")
        return cur.fetchone()["cnt"] == 0

    def reset_all(self):
        with self.transaction() as conn:
            conn.execute("PRAGMA foreign_keys = OFF")
            for table in [
                "review_histories",
                "audit_findings",
                "processing_records",
                "permission_rules",
                "migration_scripts",
                "tenants",
            ]:
                conn.execute(f"DELETE FROM {table}")
            conn.execute("PRAGMA foreign_keys = ON")

    # ----- tenants -----
    def insert_tenant(self, t: Tenant):
        with self.transaction() as conn:
            conn.execute(
                "INSERT INTO tenants VALUES (?,?,?,?,?)",
                (t.tenant_id, t.tenant_name, t.environment, t.created_at, t.description),
            )

    def list_tenants(self) -> List[Dict[str, Any]]:
        conn = self._connect()
        return conn.execute("SELECT * FROM tenants ORDER BY tenant_name").fetchall()

    def get_tenant(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        row = conn.execute(
            "SELECT * FROM tenants WHERE tenant_id=?", (tenant_id,)
        ).fetchone()
        return row

    # ----- migration_scripts -----
    def insert_migration_script(self, m: MigrationScript):
        with self.transaction() as conn:
            conn.execute(
                "INSERT INTO migration_scripts VALUES (?,?,?,?,?,?,?,?,?)",
                (
                    m.script_id,
                    m.version,
                    m.name,
                    m.filepath,
                    m.content,
                    m.applied_at,
                    m.status,
                    m.error_message,
                    m.applied_by,
                ),
            )

    def list_migration_scripts(self) -> List[Dict[str, Any]]:
        conn = self._connect()
        return conn.execute(
            "SELECT * FROM migration_scripts ORDER BY version"
        ).fetchall()

    def get_migration_script(self, script_id: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        return conn.execute(
            "SELECT * FROM migration_scripts WHERE script_id=?", (script_id,)
        ).fetchone()

    # ----- permission_rules -----
    def insert_permission_rule(self, p: PermissionRule):
        with self.transaction() as conn:
            conn.execute(
                "INSERT INTO permission_rules VALUES (?,?,?,?,?,?,?,?,?)",
                (
                    p.rule_id,
                    p.tenant_id,
                    p.role_name,
                    p.resource,
                    p.action,
                    p.granted_by,
                    p.granted_at,
                    1 if p.is_active else 0,
                    p.comment,
                ),
            )

    def list_permission_rules(self, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = self._connect()
        if tenant_id:
            return conn.execute(
                "SELECT * FROM permission_rules WHERE tenant_id=? ORDER BY role_name, resource",
                (tenant_id,),
            ).fetchall()
        return conn.execute(
            "SELECT * FROM permission_rules ORDER BY tenant_id, role_name, resource"
        ).fetchall()

    # ----- processing_records -----
    def insert_processing_record(self, r: ProcessingRecord):
        with self.transaction() as conn:
            conn.execute(
                "INSERT INTO processing_records VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    r.record_id,
                    r.batch_no,
                    r.record_type,
                    r.tenant_id,
                    r.migration_script_id,
                    r.permission_rule_id,
                    r.source_table,
                    r.source_pk,
                    r.target_table,
                    r.target_pk,
                    r.processed_at,
                    r.processed_by,
                    r.status,
                    r.raw_payload,
                    r.comment,
                ),
            )

    def list_processing_records(
        self, batch_no: Optional[str] = None, tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        conn = self._connect()
        sql = "SELECT * FROM processing_records WHERE 1=1"
        params = []
        if batch_no:
            sql += " AND batch_no=?"
            params.append(batch_no)
        if tenant_id:
            sql += " AND tenant_id=?"
            params.append(tenant_id)
        sql += " ORDER BY processed_at DESC"
        return conn.execute(sql, params).fetchall()

    def get_processing_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        return conn.execute(
            "SELECT * FROM processing_records WHERE record_id=?", (record_id,)
        ).fetchone()

    def list_batch_nos(self) -> List[str]:
        conn = self._connect()
        rows = conn.execute(
            "SELECT DISTINCT batch_no FROM processing_records ORDER BY batch_no"
        ).fetchall()
        return [r["batch_no"] for r in rows]

    # ----- audit_findings -----
    def insert_audit_finding(self, f: AuditFinding):
        with self.transaction() as conn:
            conn.execute(
                "INSERT INTO audit_findings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    f.finding_id,
                    f.finding_type,
                    f.risk_level,
                    f.title,
                    f.description,
                    f.processing_record_id,
                    f.tenant_id,
                    f.migration_script_id,
                    f.permission_rule_id,
                    json.dumps(f.source_tables, ensure_ascii=False),
                    f.affected_rows,
                    f.evidence,
                    f.detected_at,
                    f.review_status,
                    f.handler_opinion,
                ),
            )

    def list_audit_findings(
        self,
        finding_type: Optional[str] = None,
        review_status: Optional[str] = None,
        tenant_id: Optional[str] = None,
        risk_level: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        conn = self._connect()
        sql = "SELECT * FROM audit_findings WHERE 1=1"
        params = []
        if finding_type:
            sql += " AND finding_type=?"
            params.append(finding_type)
        if review_status:
            sql += " AND review_status=?"
            params.append(review_status)
        if tenant_id:
            sql += " AND tenant_id=?"
            params.append(tenant_id)
        if risk_level:
            sql += " AND risk_level=?"
            params.append(risk_level)
        sql += " ORDER BY detected_at DESC"
        rows = conn.execute(sql, params).fetchall()
        for r in rows:
            if r["source_tables"]:
                r["source_tables"] = json.loads(r["source_tables"])
            else:
                r["source_tables"] = []
        return rows

    def get_audit_finding(self, finding_id: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        r = conn.execute(
            "SELECT * FROM audit_findings WHERE finding_id=?", (finding_id,)
        ).fetchone()
        if r and r["source_tables"]:
            r["source_tables"] = json.loads(r["source_tables"])
        elif r:
            r["source_tables"] = []
        return r

    def update_audit_finding_status(
        self, finding_id: str, new_status: str, handler_opinion: Optional[str] = None
    ):
        conn = self._connect()
        current = conn.execute(
            "SELECT review_status FROM audit_findings WHERE finding_id=?",
            (finding_id,),
        ).fetchone()
        if not current:
            raise ValueError(f"Finding {finding_id} not found")
        with self.transaction() as c:
            if handler_opinion:
                c.execute(
                    "UPDATE audit_findings SET review_status=?, handler_opinion=? WHERE finding_id=?",
                    (new_status, handler_opinion, finding_id),
                )
            else:
                c.execute(
                    "UPDATE audit_findings SET review_status=? WHERE finding_id=?",
                    (new_status, finding_id),
                )
        return current["review_status"]

    # ----- review_histories -----
    def insert_review_history(self, h: ReviewHistory):
        with self.transaction() as conn:
            conn.execute(
                "INSERT INTO review_histories VALUES (?,?,?,?,?,?,?,?)",
                (
                    h.review_id,
                    h.finding_id,
                    h.action,
                    h.reviewer,
                    h.reviewed_at,
                    h.old_status,
                    h.new_status,
                    h.comment,
                ),
            )

    def list_review_histories(self, finding_id: str) -> List[Dict[str, Any]]:
        conn = self._connect()
        return conn.execute(
            "SELECT * FROM review_histories WHERE finding_id=? ORDER BY reviewed_at ASC",
            (finding_id,),
        ).fetchall()


_db_instance: Optional[Database] = None


def get_db(db_path: Optional[str] = None) -> Database:
    global _db_instance
    if _db_instance is None:
        _db_instance = Database(db_path)
    return _db_instance
