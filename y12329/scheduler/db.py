import sqlite3
import json
import hashlib
import uuid
from datetime import datetime, timezone

DB_PATH = "queue_scheduler.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS tickets (
    ticket_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_level TEXT NOT NULL,
    skill_group TEXT NOT NULL,
    create_time TEXT NOT NULL,
    assigned_time TEXT,
    resolve_time TEXT,
    status TEXT NOT NULL,
    source TEXT NOT NULL,
    imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_levels (
    level_name TEXT PRIMARY KEY,
    priority_weight REAL NOT NULL,
    max_concurrent INTEGER,
    source TEXT NOT NULL,
    imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timeout_rules (
    rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_group TEXT NOT NULL,
    level TEXT NOT NULL,
    max_wait_minutes INTEGER NOT NULL,
    escalation_action TEXT,
    source TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    UNIQUE(skill_group, level)
);

CREATE TABLE IF NOT EXISTS handling_durations (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    agent_id TEXT,
    skill_group TEXT NOT NULL,
    duration_minutes REAL NOT NULL,
    source TEXT NOT NULL,
    imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduling_records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    action TEXT NOT NULL,
    from_queue TEXT,
    to_queue TEXT,
    timestamp TEXT NOT NULL,
    reason TEXT,
    source TEXT NOT NULL,
    imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fairness_issues (
    issue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_type TEXT NOT NULL,
    issue_hash TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    affected_ticket_ids TEXT NOT NULL,
    source_records TEXT NOT NULL,
    severity TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    run_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
    report_id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    vip_issues INTEGER DEFAULT 0,
    skill_issues INTEGER DEFAULT 0,
    timeout_issues INTEGER DEFAULT 0,
    total_issues INTEGER DEFAULT 0,
    content TEXT NOT NULL,
    exported_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_skill_group ON tickets(skill_group);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_level ON tickets(customer_level);
CREATE INDEX IF NOT EXISTS idx_issues_type ON fairness_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_issues_run_id ON fairness_issues(run_id);
CREATE INDEX IF NOT EXISTS idx_issues_hash ON fairness_issues(issue_hash);
CREATE INDEX IF NOT EXISTS idx_durations_ticket ON handling_durations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_sched_ticket ON scheduling_records(ticket_id);
"""


def get_connection(db_path=None):
    path = db_path or DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(db_path=None):
    conn = get_connection(db_path)
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_run_id():
    return str(uuid.uuid4())


def start_run(conn):
    run_id = new_run_id()
    ts = now_iso()
    conn.execute(
        "INSERT INTO runs (run_id, started_at, status) VALUES (?, ?, ?)",
        (run_id, ts, "running"),
    )
    conn.commit()
    return run_id


def complete_run(conn, run_id):
    ts = now_iso()
    conn.execute(
        "UPDATE runs SET completed_at = ?, status = ? WHERE run_id = ?",
        (ts, "completed", run_id),
    )
    conn.commit()


def compute_issue_hash(issue_type, affected_ticket_ids, description_core):
    raw = f"{issue_type}|{','.join(sorted(affected_ticket_ids))}|{description_core}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def issue_exists(conn, issue_hash):
    row = conn.execute(
        "SELECT 1 FROM fairness_issues WHERE issue_hash = ?", (issue_hash,)
    ).fetchone()
    return row is not None


def insert_issue(conn, issue_type, issue_hash, description, affected_ticket_ids,
                 source_records, severity, run_id):
    if issue_exists(conn, issue_hash):
        return None
    ts = now_iso()
    conn.execute(
        """INSERT INTO fairness_issues
           (issue_type, issue_hash, description, affected_ticket_ids,
            source_records, severity, detected_at, run_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            issue_type,
            issue_hash,
            description,
            json.dumps(affected_ticket_ids, ensure_ascii=False),
            json.dumps(source_records, ensure_ascii=False),
            severity,
            ts,
            run_id,
        ),
    )
    conn.commit()
    return issue_hash


def get_all_issues(conn):
    rows = conn.execute(
        "SELECT * FROM fairness_issues ORDER BY detected_at"
    ).fetchall()
    return [dict(r) for r in rows]


def get_issues_by_type(conn, issue_type):
    rows = conn.execute(
        "SELECT * FROM fairness_issues WHERE issue_type = ? ORDER BY detected_at",
        (issue_type,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_run_history(conn):
    rows = conn.execute(
        "SELECT * FROM runs ORDER BY started_at DESC"
    ).fetchall()
    return [dict(r) for r in rows]


def save_report(conn, run_id, content, vip_count, skill_count, timeout_count, exported_path=None):
    ts = now_iso()
    conn.execute(
        """INSERT INTO reports
           (run_id, generated_at, vip_issues, skill_issues, timeout_issues,
            total_issues, content, exported_path)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (run_id, ts, vip_count, skill_count, timeout_count,
         vip_count + skill_count + timeout_count,
         json.dumps(content, ensure_ascii=False), exported_path),
    )
    conn.commit()
