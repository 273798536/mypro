import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any, Iterator

from .models import LoanRecord, RecordSource, RecordStatus, ChangeRecord, ReportSummary


class DataStore:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._init_db()

    @contextmanager
    def _get_conn(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS loan_records (
                    id TEXT PRIMARY KEY,
                    source TEXT NOT NULL,
                    original_row INTEGER NOT NULL,
                    original_file TEXT NOT NULL,
                    book_title TEXT NOT NULL,
                    borrower_name TEXT NOT NULL,
                    borrower_id TEXT NOT NULL,
                    library_from TEXT NOT NULL,
                    library_to TEXT NOT NULL,
                    apply_date TEXT,
                    receive_date TEXT,
                    due_date TEXT,
                    return_date TEXT,
                    express_fee REAL DEFAULT 0,
                    compensation_fee REAL DEFAULT 0,
                    overdue_fee REAL DEFAULT 0,
                    damage_fee REAL DEFAULT 0,
                    total_fee REAL DEFAULT 0,
                    status TEXT NOT NULL,
                    is_overdue INTEGER DEFAULT 0,
                    is_damaged INTEGER DEFAULT 0,
                    renew_count INTEGER DEFAULT 0,
                    customer_notes TEXT DEFAULT '',
                    issues TEXT DEFAULT '[]',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS change_history (
                    id TEXT PRIMARY KEY,
                    record_id TEXT NOT NULL,
                    field_name TEXT NOT NULL,
                    old_value TEXT,
                    new_value TEXT,
                    operator TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (record_id) REFERENCES loan_records (id)
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS check_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    record_id TEXT NOT NULL,
                    check_name TEXT NOT NULL,
                    passed INTEGER NOT NULL,
                    message TEXT NOT NULL,
                    details TEXT DEFAULT '{}',
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (record_id) REFERENCES loan_records (id)
                )
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_loan_records_source ON loan_records(source)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_loan_records_status ON loan_records(status)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_change_history_record_id ON change_history(record_id)
            """)

    def add_record(self, record: LoanRecord) -> None:
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO loan_records (
                    id, source, original_row, original_file, book_title, borrower_name,
                    borrower_id, library_from, library_to, apply_date, receive_date,
                    due_date, return_date, express_fee, compensation_fee, overdue_fee,
                    damage_fee, total_fee, status, is_overdue, is_damaged, renew_count,
                    customer_notes, issues, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.id, record.source.value, record.original_row, record.original_file,
                record.book_title, record.borrower_name, record.borrower_id,
                record.library_from, record.library_to,
                record.apply_date.isoformat() if record.apply_date else None,
                record.receive_date.isoformat() if record.receive_date else None,
                record.due_date.isoformat() if record.due_date else None,
                record.return_date.isoformat() if record.return_date else None,
                record.express_fee, record.compensation_fee, record.overdue_fee,
                record.damage_fee, record.total_fee, record.status.value,
                1 if record.is_overdue else 0, 1 if record.is_damaged else 0,
                record.renew_count, record.customer_notes, json.dumps(record.issues),
                record.created_at.isoformat(), record.updated_at.isoformat()
            ))

    def update_record(self, record: LoanRecord, operator: str, reason: str) -> None:
        old_record = self.get_record(record.id)
        if not old_record:
            return

        old_dict = old_record.to_dict()
        new_dict = record.to_dict()

        with self._get_conn() as conn:
            for key in new_dict:
                if key in ['id', 'created_at', 'updated_at']:
                    continue
                old_val = old_dict.get(key)
                new_val = new_dict.get(key)
                if old_val != new_val:
                    change = ChangeRecord.create(
                        record_id=record.id,
                        field_name=key,
                        old_value=old_val,
                        new_value=new_val,
                        operator=operator,
                        reason=reason
                    )
                    conn.execute("""
                        INSERT INTO change_history (
                            id, record_id, field_name, old_value, new_value,
                            operator, reason, timestamp
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        change.id, change.record_id, change.field_name,
                        str(change.old_value), str(change.new_value),
                        change.operator, change.reason, change.timestamp.isoformat()
                    ))

            conn.execute("""
                UPDATE loan_records SET
                    source = ?, original_row = ?, original_file = ?,
                    book_title = ?, borrower_name = ?, borrower_id = ?,
                    library_from = ?, library_to = ?, apply_date = ?,
                    receive_date = ?, due_date = ?, return_date = ?,
                    express_fee = ?, compensation_fee = ?, overdue_fee = ?,
                    damage_fee = ?, total_fee = ?, status = ?,
                    is_overdue = ?, is_damaged = ?, renew_count = ?,
                    customer_notes = ?, issues = ?, updated_at = ?
                WHERE id = ?
            """, (
                record.source.value, record.original_row, record.original_file,
                record.book_title, record.borrower_name, record.borrower_id,
                record.library_from, record.library_to,
                record.apply_date.isoformat() if record.apply_date else None,
                record.receive_date.isoformat() if record.receive_date else None,
                record.due_date.isoformat() if record.due_date else None,
                record.return_date.isoformat() if record.return_date else None,
                record.express_fee, record.compensation_fee, record.overdue_fee,
                record.damage_fee, record.total_fee, record.status.value,
                1 if record.is_overdue else 0, 1 if record.is_damaged else 0,
                record.renew_count, record.customer_notes, json.dumps(record.issues),
                datetime.now().isoformat(), record.id
            ))

    def get_record(self, record_id: str) -> Optional[LoanRecord]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM loan_records WHERE id = ?", (record_id,)).fetchone()
            return self._row_to_record(dict(row)) if row else None

    def find_record_by_short_id(self, short_id: str) -> Optional[LoanRecord]:
        with self._get_conn() as conn:
            rows = conn.execute("SELECT * FROM loan_records WHERE id LIKE ?", (short_id + '%',)).fetchall()
            if len(rows) == 1:
                return self._row_to_record(dict(rows[0]))
            elif len(rows) > 1:
                raise ValueError(f"找到多条匹配记录: {len(rows)} 条，请使用更完整的 ID")
            else:
                return None

    def _row_to_record(self, row: Dict[str, Any]) -> LoanRecord:
        return LoanRecord(
            id=row['id'],
            source=RecordSource(row['source']),
            original_row=row['original_row'],
            original_file=row['original_file'],
            book_title=row['book_title'],
            borrower_name=row['borrower_name'],
            borrower_id=row['borrower_id'],
            library_from=row['library_from'],
            library_to=row['library_to'],
            apply_date=datetime.fromisoformat(row['apply_date']) if row['apply_date'] else None,
            receive_date=datetime.fromisoformat(row['receive_date']) if row['receive_date'] else None,
            due_date=datetime.fromisoformat(row['due_date']) if row['due_date'] else None,
            return_date=datetime.fromisoformat(row['return_date']) if row['return_date'] else None,
            express_fee=row['express_fee'],
            compensation_fee=row['compensation_fee'],
            overdue_fee=row['overdue_fee'],
            damage_fee=row['damage_fee'],
            total_fee=row['total_fee'],
            status=RecordStatus(row['status']),
            is_overdue=bool(row['is_overdue']),
            is_damaged=bool(row['is_damaged']),
            renew_count=row['renew_count'],
            customer_notes=row['customer_notes'],
            issues=json.loads(row['issues']),
            created_at=datetime.fromisoformat(row['created_at']),
            updated_at=datetime.fromisoformat(row['updated_at'])
        )

    def get_all_records(self, status: Optional[RecordStatus] = None,
                        source: Optional[RecordSource] = None) -> List[LoanRecord]:
        query = "SELECT * FROM loan_records WHERE 1=1"
        params = []

        if status:
            query += " AND status = ?"
            params.append(status.value)
        if source:
            query += " AND source = ?"
            params.append(source.value)

        query += " ORDER BY created_at DESC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [self._row_to_record(dict(row)) for row in rows]

    def get_change_history(self, record_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM change_history"
        params = []

        if record_id:
            query += " WHERE record_id = ?"
            params.append(record_id)

        query += " ORDER BY timestamp DESC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]

    def save_check_result(self, record_id: str, check_name: str, passed: bool,
                          message: str, details: Dict[str, Any]) -> None:
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO check_results (
                    record_id, check_name, passed, message, details, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                record_id, check_name, 1 if passed else 0,
                message, json.dumps(details), datetime.now().isoformat()
            ))

    def get_check_results(self, record_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM check_results"
        params = []

        if record_id:
            query += " WHERE record_id = ?"
            params.append(record_id)

        query += " ORDER BY timestamp DESC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            results = []
            for row in rows:
                d = dict(row)
                d['details'] = json.loads(d['details'])
                d['passed'] = bool(d['passed'])
                results.append(d)
            return results

    def get_summary(self) -> ReportSummary:
        summary = ReportSummary()

        with self._get_conn() as conn:
            VALID_STATUS_FILTER = "status IN ('校验通过', '已修正', '已重算', '已导出', '已合并')"

            row = conn.execute(f"""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN {VALID_STATUS_FILTER} THEN 1 ELSE 0 END) as valid,
                    SUM(CASE WHEN status = '校验失败' THEN 1 ELSE 0 END) as invalid,
                    SUM(CASE WHEN {VALID_STATUS_FILTER} THEN express_fee ELSE 0 END) as total_express,
                    SUM(CASE WHEN {VALID_STATUS_FILTER} THEN compensation_fee ELSE 0 END) as total_compensation,
                    SUM(CASE WHEN {VALID_STATUS_FILTER} THEN overdue_fee ELSE 0 END) as total_overdue,
                    SUM(CASE WHEN {VALID_STATUS_FILTER} THEN damage_fee ELSE 0 END) as total_damage,
                    SUM(CASE WHEN {VALID_STATUS_FILTER} THEN total_fee ELSE 0 END) as total_sum
                FROM loan_records
            """).fetchone()

            summary.total_records = row['total']
            summary.valid_records = row['valid']
            summary.invalid_records = row['invalid']
            summary.total_express_fee = row['total_express'] or 0
            summary.total_compensation_fee = row['total_compensation'] or 0
            summary.total_overdue_fee = row['total_overdue'] or 0
            summary.total_damage_fee = row['total_damage'] or 0
            summary.total_fee = row['total_sum'] or 0

            source_rows = conn.execute("""
                SELECT source, COUNT(*) as cnt FROM loan_records GROUP BY source
            """).fetchall()
            for sr in source_rows:
                summary.by_source[sr['source']] = sr['cnt']

            status_rows = conn.execute("""
                SELECT status, COUNT(*) as cnt FROM loan_records GROUP BY status
            """).fetchall()
            for sr in status_rows:
                summary.by_status[sr['status']] = sr['cnt']

            issue_rows = conn.execute("""
                SELECT issues FROM loan_records WHERE issues != '[]'
            """).fetchall()
            for ir in issue_rows:
                issues = json.loads(ir['issues'])
                for issue in issues:
                    summary.issue_counts[issue] = summary.issue_counts.get(issue, 0) + 1

        return summary

    def delete_record(self, record_id: str) -> None:
        with self._get_conn() as conn:
            conn.execute("DELETE FROM change_history WHERE record_id = ?", (record_id,))
            conn.execute("DELETE FROM check_results WHERE record_id = ?", (record_id,))
            conn.execute("DELETE FROM loan_records WHERE id = ?", (record_id,))

    def find_duplicates(self) -> List[List[LoanRecord]]:
        with self._get_conn() as conn:
            rows = conn.execute("""
                SELECT borrower_id, book_title, library_from, library_to,
                       GROUP_CONCAT(id) as ids
                FROM loan_records
                GROUP BY borrower_id, book_title, library_from, library_to
                HAVING COUNT(*) > 1
            """).fetchall()

            duplicates = []
            for row in rows:
                ids = row['ids'].split(',')
                dup_records = [self.get_record(id) for id in ids]
                duplicates.append([r for r in dup_records if r])
            return duplicates
