import sqlite3
import json
from datetime import datetime
from drum_beat_align.config import DB_PATH


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS batch (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS screenshot (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        sender TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        is_late_attachment INTEGER NOT NULL DEFAULT 0,
        parsed_text TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (batch_id) REFERENCES batch(id)
    );

    CREATE TABLE IF NOT EXISTS legacy_master (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        label TEXT NOT NULL,
        screenshot_id TEXT,
        screenshot_original_statement TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (screenshot_id) REFERENCES screenshot(id)
    );

    CREATE TABLE IF NOT EXISTS drum_beat (
        id TEXT PRIMARY KEY,
        screenshot_id TEXT NOT NULL,
        beat_index INTEGER NOT NULL,
        beat_type TEXT NOT NULL,
        expected_count REAL NOT NULL,
        actual_count REAL,
        beat_label TEXT,
        legacy_master_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (screenshot_id) REFERENCES screenshot(id),
        FOREIGN KEY (legacy_master_id) REFERENCES legacy_master(id)
    );

    CREATE TABLE IF NOT EXISTS allocation (
        id TEXT PRIMARY KEY,
        beat_id TEXT NOT NULL,
        performer TEXT NOT NULL,
        allocated_count REAL NOT NULL,
        allocation_source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (beat_id) REFERENCES drum_beat(id)
    );

    CREATE TABLE IF NOT EXISTS alignment_result (
        id TEXT PRIMARY KEY,
        beat_id TEXT NOT NULL,
        allocation_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        deviation REAL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (beat_id) REFERENCES drum_beat(id),
        FOREIGN KEY (allocation_id) REFERENCES allocation(id)
    );

    CREATE TABLE IF NOT EXISTS exception_item (
        id TEXT PRIMARY KEY,
        alignment_result_id TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        exception_type TEXT NOT NULL,
        reason TEXT NOT NULL,
        screenshot_id TEXT,
        screenshot_statement TEXT,
        legacy_master_version TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        confirmed_by TEXT,
        confirmed_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (alignment_result_id) REFERENCES alignment_result(id),
        FOREIGN KEY (batch_id) REFERENCES batch(id),
        FOREIGN KEY (screenshot_id) REFERENCES screenshot(id)
    );

    CREATE TABLE IF NOT EXISTS confirmation_history (
        id TEXT PRIMARY KEY,
        exception_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        operator TEXT NOT NULL,
        confirmed_at TEXT NOT NULL,
        note TEXT,
        FOREIGN KEY (exception_id) REFERENCES exception_item(id)
    );
    """)
    conn.commit()
    conn.close()


def _gen_id(prefix):
    return f"{prefix}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"


def create_batch(batch_id=None):
    conn = get_conn()
    bid = batch_id or _gen_id("batch")
    conn.execute(
        "INSERT INTO batch (id, started_at, status) VALUES (?, ?, ?)",
        (bid, datetime.now().isoformat(), "running"),
    )
    conn.commit()
    conn.close()
    return bid


def complete_batch(batch_id):
    conn = get_conn()
    conn.execute(
        "UPDATE batch SET status=?, completed_at=? WHERE id=?",
        ("completed", datetime.now().isoformat(), batch_id),
    )
    conn.commit()
    conn.close()


def insert_screenshot(batch_id, file_name, sender, sent_at, is_late=False, parsed_text=None, sid=None):
    conn = get_conn()
    sid = sid or _gen_id("ss")
    conn.execute(
        "INSERT INTO screenshot (id, batch_id, file_name, sender, sent_at, is_late_attachment, parsed_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (sid, batch_id, file_name, sender, sent_at, int(is_late), parsed_text, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return sid


def insert_legacy_master(version, label, screenshot_id=None, screenshot_original_statement=None, mid=None):
    conn = get_conn()
    mid = mid or _gen_id("lm")
    conn.execute(
        "INSERT INTO legacy_master (id, version, label, screenshot_id, screenshot_original_statement, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (mid, version, label, screenshot_id, screenshot_original_statement, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return mid


def insert_drum_beat(screenshot_id, beat_index, beat_type, expected_count, actual_count=None, beat_label=None, legacy_master_id=None, bid=None):
    conn = get_conn()
    bid = bid or _gen_id("beat")
    conn.execute(
        "INSERT INTO drum_beat (id, screenshot_id, beat_index, beat_type, expected_count, actual_count, beat_label, legacy_master_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (bid, screenshot_id, beat_index, beat_type, expected_count, actual_count, beat_label, legacy_master_id, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return bid


def insert_allocation(beat_id, performer, allocated_count, allocation_source, aid=None):
    conn = get_conn()
    aid = aid or _gen_id("alloc")
    conn.execute(
        "INSERT INTO allocation (id, beat_id, performer, allocated_count, allocation_source, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (aid, beat_id, performer, allocated_count, allocation_source, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return aid


def insert_alignment_result(beat_id, allocation_id, status, deviation=None, rid=None):
    conn = get_conn()
    rid = rid or _gen_id("ar")
    conn.execute(
        "INSERT INTO alignment_result (id, beat_id, allocation_id, status, deviation, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (rid, beat_id, allocation_id, status, deviation, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return rid


def insert_exception(alignment_result_id, batch_id, exception_type, reason, screenshot_id=None, screenshot_statement=None, legacy_master_version=None, eid=None):
    conn = get_conn()
    eid = eid or _gen_id("exc")
    conn.execute(
        "INSERT INTO exception_item (id, alignment_result_id, batch_id, exception_type, reason, screenshot_id, screenshot_statement, legacy_master_version, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (eid, alignment_result_id, batch_id, exception_type, reason, screenshot_id, screenshot_statement, legacy_master_version, "open", datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return eid


def insert_confirmation_history(exception_id, field_name, old_value, new_value, operator, note=None, hid=None):
    conn = get_conn()
    hid = hid or _gen_id("hist")
    conn.execute(
        "INSERT INTO confirmation_history (id, exception_id, field_name, old_value, new_value, operator, confirmed_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (hid, exception_id, field_name, old_value, new_value, operator, datetime.now().isoformat(), note),
    )
    conn.commit()
    conn.close()
    return hid


def query_exceptions(batch_id=None, status=None):
    conn = get_conn()
    sql = """
        SELECT e.*, s.file_name AS screenshot_file, s.sender AS screenshot_sender,
               s.is_late_attachment, ar.status AS alignment_status, ar.deviation
        FROM exception_item e
        LEFT JOIN screenshot s ON e.screenshot_id = s.id
        LEFT JOIN alignment_result ar ON e.alignment_result_id = ar.id
        WHERE 1=1
    """
    params = []
    if batch_id:
        sql += " AND e.batch_id=?"
        params.append(batch_id)
    if status:
        sql += " AND e.status=?"
        params.append(status)
    sql += " ORDER BY e.created_at"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def query_exception_details(exception_id):
    conn = get_conn()
    row = conn.execute(
        """
        SELECT e.*, s.file_name AS screenshot_file, s.sender AS screenshot_sender,
               s.sent_at AS screenshot_sent_at, s.is_late_attachment, s.parsed_text,
               ar.status AS alignment_status, ar.deviation,
               b.beat_type, b.expected_count, b.actual_count, b.beat_label,
               a.performer, a.allocated_count, a.allocation_source,
               lm.version AS legacy_master_version_label, lm.screenshot_original_statement
        FROM exception_item e
        LEFT JOIN screenshot s ON e.screenshot_id = s.id
        LEFT JOIN alignment_result ar ON e.alignment_result_id = ar.id
        LEFT JOIN drum_beat b ON ar.beat_id = b.id
        LEFT JOIN allocation a ON ar.allocation_id = a.id
        LEFT JOIN legacy_master lm ON b.legacy_master_id = lm.id
        WHERE e.id=?
        """,
        (exception_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def query_confirmation_history(exception_id):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM confirmation_history WHERE exception_id=? ORDER BY confirmed_at",
        (exception_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def confirm_exception(exception_id, operator, new_status, note=None):
    conn = get_conn()
    old = conn.execute("SELECT status FROM exception_item WHERE id=?", (exception_id,)).fetchone()
    if not old:
        conn.close()
        return None
    old_status = old["status"]
    conn.execute(
        "UPDATE exception_item SET status=?, confirmed_by=?, confirmed_at=? WHERE id=?",
        (new_status, operator, datetime.now().isoformat(), exception_id),
    )
    hid = _gen_id("hist")
    conn.execute(
        "INSERT INTO confirmation_history (id, exception_id, field_name, old_value, new_value, operator, confirmed_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (hid, exception_id, "status", old_status, new_status, operator, datetime.now().isoformat(), note),
    )
    conn.commit()
    conn.close()
    return {"old_status": old_status, "new_status": new_status}


def query_alignment_details(alignment_result_id):
    conn = get_conn()
    row = conn.execute(
        """
        SELECT ar.*, b.beat_type, b.expected_count, b.actual_count, b.beat_label,
               a.performer, a.allocated_count, a.allocation_source,
               s.file_name AS screenshot_file, s.sender AS screenshot_sender,
               lm.version AS legacy_master_version, lm.label AS legacy_master_label,
               lm.screenshot_original_statement
        FROM alignment_result ar
        LEFT JOIN drum_beat b ON ar.beat_id = b.id
        LEFT JOIN allocation a ON ar.allocation_id = a.id
        LEFT JOIN screenshot s ON b.screenshot_id = s.id
        LEFT JOIN legacy_master lm ON b.legacy_master_id = lm.id
        WHERE ar.id=?
        """,
        (alignment_result_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def query_latest_batch():
    conn = get_conn()
    row = conn.execute("SELECT * FROM batch ORDER BY started_at DESC LIMIT 1").fetchone()
    conn.close()
    return dict(row) if row else None


def clear_all_data():
    conn = get_conn()
    conn.executescript("""
        DELETE FROM confirmation_history;
        DELETE FROM exception_item;
        DELETE FROM alignment_result;
        DELETE FROM allocation;
        DELETE FROM drum_beat;
        DELETE FROM legacy_master;
        DELETE FROM screenshot;
        DELETE FROM batch;
    """)
    conn.commit()
    conn.close()
