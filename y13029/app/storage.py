import sqlite3
import os
from contextlib import contextmanager
from typing import List, Optional
from datetime import datetime
from .models import (
    CustodyReceipt, RiskWarning, WarningHistory,
    ConflictRecord, BadDataRecord, WarningStatus, ConfirmReason
)


DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "warning.db")


def _ensure_data_dir():
    data_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)


@contextmanager
def get_conn():
    _ensure_data_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    _ensure_data_dir()
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS custody_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id TEXT NOT NULL,
                source_file TEXT NOT NULL,
                row_number INTEGER NOT NULL,
                trade_date TEXT,
                fund_code TEXT,
                fund_name TEXT,
                investor_id TEXT,
                investor_name TEXT,
                amount REAL,
                currency TEXT,
                business_type TEXT,
                risk_level TEXT,
                investor_risk_level TEXT,
                calibre TEXT,
                raw_content TEXT,
                import_round INTEGER DEFAULT 1,
                source_sha1 TEXT,
                created_at TEXT NOT NULL
            )
        """)
        _ensure_column(c, "custody_receipts", "import_round", "INTEGER DEFAULT 1")
        _ensure_column(c, "custody_receipts", "source_sha1", "TEXT")
        c.execute("""
            CREATE TABLE IF NOT EXISTS risk_warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_id INTEGER NOT NULL,
                batch_id TEXT NOT NULL,
                warning_code TEXT,
                warning_type TEXT,
                description TEXT,
                status TEXT NOT NULL,
                confirm_reason TEXT,
                confirm_note TEXT,
                confirmed_by TEXT,
                confirmed_at TEXT,
                conclusion TEXT,
                late_attachment_ref TEXT,
                remark TEXT,
                import_round INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        _ensure_column(c, "risk_warnings", "import_round", "INTEGER DEFAULT 1")
        c.execute("""
            CREATE TABLE IF NOT EXISTS warning_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                warning_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                action_by TEXT,
                old_status TEXT,
                new_status TEXT,
                detail TEXT,
                created_at TEXT NOT NULL
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS conflict_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id TEXT NOT NULL,
                amount REAL,
                investor_id TEXT,
                investor_name TEXT,
                warning_ids TEXT,
                calibres TEXT,
                resolved INTEGER DEFAULT 0,
                resolution TEXT,
                import_round INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)
        _ensure_column(c, "conflict_records", "import_round", "INTEGER DEFAULT 1")
        c.execute("""
            CREATE TABLE IF NOT EXISTS bad_data_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_file TEXT NOT NULL,
                row_number INTEGER NOT NULL,
                field_name TEXT,
                raw_value TEXT,
                error_message TEXT,
                raw_content TEXT,
                import_round INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)
        _ensure_column(c, "bad_data_records", "import_round", "INTEGER DEFAULT 1")
        c.execute("""
            CREATE TABLE IF NOT EXISTS import_meta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id TEXT NOT NULL,
                source_file TEXT NOT NULL,
                import_round INTEGER NOT NULL,
                receipts_count INTEGER DEFAULT 0,
                warnings_count INTEGER DEFAULT 0,
                bad_data_count INTEGER DEFAULT 0,
                conflict_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)


def _ensure_column(c, table: str, column: str, definition: str):
    c.execute(f"PRAGMA table_info({table})")
    cols = {row[1] for row in c.fetchall()}
    if column not in cols:
        c.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def get_next_import_round(batch_id: str, source_file: str) -> int:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT COALESCE(MAX(import_round), 0) + 1
            FROM import_meta
            WHERE batch_id = ? AND source_file = ?
        """, (batch_id, os.path.basename(source_file)))
        return c.fetchone()[0] or 1


def record_import_meta(batch_id: str, source_file: str, import_round: int,
                       receipts: int, warnings: int, bad: int, conflicts: int):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO import_meta (batch_id, source_file, import_round,
                receipts_count, warnings_count, bad_data_count, conflict_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (batch_id, os.path.basename(source_file), import_round,
              receipts, warnings, bad, conflicts, datetime.now().isoformat()))


def find_receipt_by_sha1(batch_id: str, source_sha1: str):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT id FROM custody_receipts
            WHERE batch_id = ? AND source_sha1 = ?
            LIMIT 1
        """, (batch_id, source_sha1))
        r = c.fetchone()
        return r["id"] if r else None


def get_all_conflicts() -> List[ConflictRecord]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM conflict_records ORDER BY id")
        rows = c.fetchall()
        from .storage import _row_to_conflict
        return [_row_to_conflict(r) for r in rows]


def get_conflict_by_id(conflict_id: int) -> Optional[ConflictRecord]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM conflict_records WHERE id = ?", (conflict_id,))
        r = c.fetchone()
        if not r:
            return None
        from .storage import _row_to_conflict
        return _row_to_conflict(r)


def get_import_rounds(batch_id: str) -> dict:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT source_file, import_round, receipts_count, warnings_count,
                   bad_data_count, conflict_count, created_at
            FROM import_meta
            WHERE batch_id = ?
            ORDER BY import_round, source_file
        """, (batch_id,))
        rows = c.fetchall()
        return [dict(r) for r in rows]


def insert_receipt(receipt: CustodyReceipt) -> int:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO custody_receipts (batch_id, source_file, row_number, trade_date,
                fund_code, fund_name, investor_id, investor_name, amount, currency,
                business_type, risk_level, investor_risk_level, calibre, raw_content,
                import_round, source_sha1, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            receipt.batch_id, receipt.source_file, receipt.row_number, receipt.trade_date,
            receipt.fund_code, receipt.fund_name, receipt.investor_id, receipt.investor_name,
            receipt.amount, receipt.currency, receipt.business_type, receipt.risk_level,
            receipt.investor_risk_level, receipt.calibre, receipt.raw_content,
            receipt.import_round, receipt.source_sha1,
            receipt.created_at.isoformat()
        ))
        return c.lastrowid


def insert_warning(warning: RiskWarning) -> int:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO risk_warnings (receipt_id, batch_id, warning_code, warning_type,
                description, status, confirm_reason, confirm_note, confirmed_by, confirmed_at,
                conclusion, late_attachment_ref, remark, import_round, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            warning.receipt_id, warning.batch_id, warning.warning_code, warning.warning_type,
            warning.description, warning.status.value,
            warning.confirm_reason.value if warning.confirm_reason else None,
            warning.confirm_note, warning.confirmed_by,
            warning.confirmed_at.isoformat() if warning.confirmed_at else None,
            warning.conclusion, warning.late_attachment_ref, warning.remark,
            warning.import_round,
            warning.created_at.isoformat(), warning.updated_at.isoformat()
        ))
        return c.lastrowid


def insert_history(history: WarningHistory) -> int:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO warning_history (warning_id, action, action_by, old_status, new_status, detail, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            history.warning_id, history.action, history.action_by,
            history.old_status, history.new_status, history.detail,
            history.created_at.isoformat()
        ))
        return c.lastrowid


def insert_conflict(conflict: ConflictRecord) -> int:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO conflict_records (batch_id, amount, investor_id, investor_name,
                warning_ids, calibres, resolved, resolution, import_round, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            conflict.batch_id, conflict.amount, conflict.investor_id, conflict.investor_name,
            ",".join(str(w) for w in conflict.warning_ids),
            ",".join(conflict.calibres),
            1 if conflict.resolved else 0,
            conflict.resolution,
            conflict.import_round,
            conflict.created_at.isoformat()
        ))
        return c.lastrowid


def insert_bad_data(bad: BadDataRecord) -> int:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO bad_data_records (source_file, row_number, field_name, raw_value,
                error_message, raw_content, import_round, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            bad.source_file, bad.row_number, bad.field_name, bad.raw_value,
            bad.error_message, bad.raw_content, bad.import_round,
            bad.created_at.isoformat()
        ))
        return c.lastrowid


def get_warning_by_id(warning_id: int) -> Optional[RiskWarning]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM risk_warnings WHERE id = ?", (warning_id,))
        row = c.fetchone()
        if not row:
            return None
        return _row_to_warning(row)


def get_warnings_by_batch(batch_id: str) -> List[RiskWarning]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM risk_warnings WHERE batch_id = ? ORDER BY id", (batch_id,))
        rows = c.fetchall()
        return [_row_to_warning(r) for r in rows]


def get_warnings_by_status(status: WarningStatus) -> List[RiskWarning]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM risk_warnings WHERE status = ? ORDER BY id", (status.value,))
        rows = c.fetchall()
        return [_row_to_warning(r) for r in rows]


def get_all_warnings() -> List[RiskWarning]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM risk_warnings ORDER BY id")
        rows = c.fetchall()
        return [_row_to_warning(r) for r in rows]


def get_receipt_by_id(receipt_id: int) -> Optional[CustodyReceipt]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM custody_receipts WHERE id = ?", (receipt_id,))
        row = c.fetchone()
        if not row:
            return None
        return _row_to_receipt(row)


def get_history_by_warning(warning_id: int) -> List[WarningHistory]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM warning_history WHERE warning_id = ? ORDER BY id", (warning_id,))
        rows = c.fetchall()
        return [_row_to_history(r) for r in rows]


def get_conflicts_by_batch(batch_id: str) -> List[ConflictRecord]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM conflict_records WHERE batch_id = ? ORDER BY id", (batch_id,))
        rows = c.fetchall()
        return [_row_to_conflict(r) for r in rows]


def get_all_bad_data() -> List[BadDataRecord]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM bad_data_records ORDER BY id")
        rows = c.fetchall()
        return [_row_to_bad_data(r) for r in rows]


def get_bad_data_by_file(source_file: str) -> List[BadDataRecord]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM bad_data_records WHERE source_file = ? ORDER BY row_number", (source_file,))
        rows = c.fetchall()
        return [_row_to_bad_data(r) for r in rows]


def get_all_batches() -> List[str]:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT DISTINCT batch_id FROM risk_warnings ORDER BY batch_id DESC")
        rows = c.fetchall()
        return [r["batch_id"] for r in rows]


def update_warning_status(warning_id: int, status: WarningStatus, **kwargs):
    fields = ["status = ?", "updated_at = ?"]
    values = [status.value, datetime.now().isoformat()]
    for k, v in kwargs.items():
        fields.append(f"{k} = ?")
        values.append(v)
    values.append(warning_id)
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(f"UPDATE risk_warnings SET {', '.join(fields)} WHERE id = ?", values)


def update_warning_code(warning_id: int, code: str) -> None:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            "UPDATE risk_warnings SET warning_code = ? WHERE id = ?",
            (code, warning_id)
        )


def _row_to_warning(row: sqlite3.Row) -> RiskWarning:
    keys = set(row.keys())
    return RiskWarning(
        id=row["id"],
        receipt_id=row["receipt_id"],
        batch_id=row["batch_id"],
        warning_code=row["warning_code"] or "",
        warning_type=row["warning_type"] or "",
        description=row["description"] or "",
        status=WarningStatus(row["status"]),
        confirm_reason=ConfirmReason(row["confirm_reason"]) if row["confirm_reason"] else None,
        confirm_note=row["confirm_note"] or "",
        confirmed_by=row["confirmed_by"] or "",
        confirmed_at=datetime.fromisoformat(row["confirmed_at"]) if row["confirmed_at"] else None,
        conclusion=row["conclusion"] or "",
        late_attachment_ref=row["late_attachment_ref"] or "",
        remark=row["remark"] or "",
        import_round=row["import_round"] if "import_round" in keys and row["import_round"] is not None else 1,
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def _row_to_receipt(row: sqlite3.Row) -> CustodyReceipt:
    keys = set(row.keys())
    return CustodyReceipt(
        id=row["id"],
        batch_id=row["batch_id"],
        source_file=row["source_file"],
        row_number=row["row_number"],
        trade_date=row["trade_date"] or "",
        fund_code=row["fund_code"] or "",
        fund_name=row["fund_name"] or "",
        investor_id=row["investor_id"] or "",
        investor_name=row["investor_name"] or "",
        amount=row["amount"] or 0.0,
        currency=row["currency"] or "",
        business_type=row["business_type"] or "",
        risk_level=row["risk_level"] or "",
        investor_risk_level=row["investor_risk_level"] or "",
        calibre=row["calibre"] or "",
        raw_content=row["raw_content"] or "",
        import_round=row["import_round"] if "import_round" in keys and row["import_round"] is not None else 1,
        source_sha1=row["source_sha1"] if "source_sha1" in keys and row["source_sha1"] is not None else "",
        created_at=datetime.fromisoformat(row["created_at"]),
    )


def _row_to_history(row: sqlite3.Row) -> WarningHistory:
    return WarningHistory(
        id=row["id"],
        warning_id=row["warning_id"],
        action=row["action"],
        action_by=row["action_by"] or "",
        old_status=row["old_status"] or "",
        new_status=row["new_status"] or "",
        detail=row["detail"] or "",
        created_at=datetime.fromisoformat(row["created_at"]),
    )


def _row_to_conflict(row: sqlite3.Row) -> ConflictRecord:
    keys = set(row.keys())
    return ConflictRecord(
        id=row["id"],
        batch_id=row["batch_id"],
        amount=row["amount"] or 0.0,
        investor_id=row["investor_id"] or "",
        investor_name=row["investor_name"] or "",
        warning_ids=[int(x) for x in row["warning_ids"].split(",") if x] if row["warning_ids"] else [],
        calibres=row["calibres"].split(",") if row["calibres"] else [],
        resolved=bool(row["resolved"]),
        resolution=row["resolution"] or "",
        import_round=row["import_round"] if "import_round" in keys and row["import_round"] is not None else 1,
        created_at=datetime.fromisoformat(row["created_at"]),
    )


def _row_to_bad_data(row: sqlite3.Row) -> BadDataRecord:
    keys = set(row.keys())
    return BadDataRecord(
        id=row["id"],
        source_file=row["source_file"],
        row_number=row["row_number"],
        field_name=row["field_name"] or "",
        raw_value=row["raw_value"] or "",
        error_message=row["error_message"] or "",
        raw_content=row["raw_content"] or "",
        import_round=row["import_round"] if "import_round" in keys and row["import_round"] is not None else 1,
        created_at=datetime.fromisoformat(row["created_at"]),
    )
