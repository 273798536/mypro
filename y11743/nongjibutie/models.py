import sqlite3
import os
import hashlib
from datetime import datetime
from typing import Optional, Dict, List, Any, Tuple


DB_FILENAME = 'subsidy.db'


class Database:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), DB_FILENAME)
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        self._init_schema()

    def _init_schema(self):
        cur = self.conn.cursor()
        cur.executescript('''
            CREATE TABLE IF NOT EXISTS farmer_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                farmer_name TEXT NOT NULL,
                id_card TEXT NOT NULL,
                qualification_type TEXT NOT NULL,
                qualification_start DATE NOT NULL,
                qualification_end DATE NOT NULL,
                village TEXT,
                contact TEXT,
                source_file TEXT NOT NULL,
                import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                version INTEGER DEFAULT 1,
                is_active INTEGER DEFAULT 1,
                UNIQUE(id_card, is_active)
            );

            CREATE TABLE IF NOT EXISTS purchase_invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number TEXT NOT NULL,
                invoice_date DATE NOT NULL,
                machine_model TEXT NOT NULL,
                machine_name TEXT NOT NULL,
                amount REAL NOT NULL,
                farmer_id INTEGER NOT NULL,
                dealer TEXT,
                source_file TEXT NOT NULL,
                import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                version INTEGER DEFAULT 1,
                is_active INTEGER DEFAULT 1,
                dedup_status TEXT DEFAULT 'new',
                FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(id),
                UNIQUE(invoice_number, is_active)
            );

            CREATE TABLE IF NOT EXISTS inspection_photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                photo_hash TEXT NOT NULL,
                farmer_id INTEGER NOT NULL,
                invoice_id INTEGER,
                machine_model TEXT NOT NULL,
                photo_date DATE NOT NULL,
                inspector TEXT,
                source_file TEXT NOT NULL,
                import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                version INTEGER DEFAULT 1,
                is_active INTEGER DEFAULT 1,
                match_status TEXT DEFAULT 'pending',
                FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(id),
                FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id)
            );

            CREATE TABLE IF NOT EXISTS subsidy_standards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_model TEXT NOT NULL,
                standard_amount REAL NOT NULL,
                effective_date DATE NOT NULL,
                expire_date DATE,
                source_file TEXT NOT NULL,
                import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                version INTEGER DEFAULT 1,
                is_active INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS disbursement_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_name TEXT NOT NULL,
                batch_date DATE NOT NULL,
                status TEXT DEFAULT 'draft',
                source_file TEXT NOT NULL,
                import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                version INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS disbursement_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                farmer_id INTEGER NOT NULL,
                invoice_id INTEGER NOT NULL,
                subsidy_amount REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                issue_flags TEXT DEFAULT '',
                remark TEXT DEFAULT '',
                source_file TEXT NOT NULL,
                import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                version INTEGER DEFAULT 1,
                FOREIGN KEY (batch_id) REFERENCES disbursement_batches(id),
                FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(id),
                FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id)
            );

            CREATE TABLE IF NOT EXISTS audit_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                report_date DATE NOT NULL,
                auditor TEXT NOT NULL,
                issues_found INTEGER DEFAULT 0,
                total_amount REAL DEFAULT 0,
                report_file TEXT,
                source_file TEXT NOT NULL,
                import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (batch_id) REFERENCES disbursement_batches(id)
            );

            CREATE TABLE IF NOT EXISTS correction_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                record_id INTEGER NOT NULL,
                field_name TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                corrected_by TEXT DEFAULT 'system',
                corrected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reason TEXT
            );

            CREATE TABLE IF NOT EXISTS issues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER,
                farmer_id INTEGER,
                invoice_id INTEGER,
                photo_id INTEGER,
                issue_type TEXT NOT NULL,
                issue_detail TEXT NOT NULL,
                severity TEXT DEFAULT 'warning',
                status TEXT DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                resolved_by TEXT,
                FOREIGN KEY (batch_id) REFERENCES disbursement_batches(id),
                FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(id),
                FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id),
                FOREIGN KEY (photo_id) REFERENCES inspection_photos(id)
            );

            CREATE INDEX IF NOT EXISTS idx_invoices_farmer ON purchase_invoices(farmer_id);
            CREATE INDEX IF NOT EXISTS idx_photos_farmer ON inspection_photos(farmer_id);
            CREATE INDEX IF NOT EXISTS idx_photos_invoice ON inspection_photos(invoice_id);
            CREATE INDEX IF NOT EXISTS idx_records_batch ON disbursement_records(batch_id);
            CREATE INDEX IF NOT EXISTS idx_records_farmer ON disbursement_records(farmer_id);
            CREATE INDEX IF NOT EXISTS idx_issues_batch ON issues(batch_id);
            CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
            CREATE INDEX IF NOT EXISTS idx_standards_model ON subsidy_standards(machine_model);
        ''')
        self.conn.commit()

    def close(self):
        self.conn.close()

    @staticmethod
    def compute_hash(data: str) -> str:
        return hashlib.sha256(data.encode('utf-8')).hexdigest()[:16]

    def execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        cur = self.conn.cursor()
        cur.execute(sql, params)
        return cur

    def query(self, sql: str, params: tuple = ()) -> List[sqlite3.Row]:
        cur = self.conn.cursor()
        cur.execute(sql, params)
        return cur.fetchall()

    def query_one(self, sql: str, params: tuple = ()) -> Optional[sqlite3.Row]:
        cur = self.conn.cursor()
        cur.execute(sql, params)
        return cur.fetchone()

    def insert(self, table: str, data: Dict[str, Any]) -> int:
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['?' for _ in data])
        sql = f'INSERT INTO {table} ({columns}) VALUES ({placeholders})'
        cur = self.conn.cursor()
        cur.execute(sql, tuple(data.values()))
        self.conn.commit()
        return cur.lastrowid

    def update(self, table: str, record_id: int, data: Dict[str, Any], old_values: Optional[Dict] = None, corrected_by: str = 'system', reason: str = ''):
        if old_values is None:
            old_row = self.query_one(f'SELECT * FROM {table} WHERE id = ?', (record_id,))
            if old_row is None:
                return
            old_values = dict(old_row)
        for field, new_val in data.items():
            old_val = str(old_values.get(field, ''))
            new_val_str = str(new_val)
            if old_val != new_val_str:
                self.insert('correction_logs', {
                    'table_name': table,
                    'record_id': record_id,
                    'field_name': field,
                    'old_value': old_val,
                    'new_value': new_val_str,
                    'corrected_by': corrected_by,
                    'reason': reason
                })
        data['version'] = old_values.get('version', 1) + 1
        columns = ', '.join([f'{k} = ?' for k in data.keys()])
        sql = f'UPDATE {table} SET {columns} WHERE id = ?'
        self.conn.execute(sql, tuple(data.values()) + (record_id,))
        self.conn.commit()

    def soft_delete(self, table: str, record_id: int, corrected_by: str = 'system', reason: str = ''):
        self.update(table, record_id, {'is_active': 0}, corrected_by=corrected_by, reason=reason)

    def log_issue(self, issue_type: str, issue_detail: str, severity: str = 'warning',
                  batch_id: Optional[int] = None, farmer_id: Optional[int] = None,
                  invoice_id: Optional[int] = None, photo_id: Optional[int] = None) -> int:
        return self.insert('issues', {
            'batch_id': batch_id,
            'farmer_id': farmer_id,
            'invoice_id': invoice_id,
            'photo_id': photo_id,
            'issue_type': issue_type,
            'issue_detail': issue_detail,
            'severity': severity,
            'status': 'open'
        })

    def resolve_issue(self, issue_id: int, resolved_by: str = 'system'):
        self.conn.execute(
            'UPDATE issues SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?',
            ('resolved', datetime.now().isoformat(), resolved_by, issue_id)
        )
        self.conn.commit()