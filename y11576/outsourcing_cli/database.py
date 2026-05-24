import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict

DB_FILENAME = "outsourcing_audit.db"


@dataclass
class SourceFile:
    id: Optional[int]
    batch_id: str
    file_type: str
    file_name: str
    file_hash: str
    imported_at: str
    imported_by: str
    status: str
    row_count: int


@dataclass
class RawRecord:
    id: Optional[int]
    source_file_id: int
    batch_id: str
    file_type: str
    original_row_number: int
    raw_data: str
    parsed_data: str
    status: str
    check_result: Optional[str]
    created_at: str
    updated_at: str


@dataclass
class ReconciliationRecord:
    id: Optional[int]
    batch_id: str
    product_code: str
    product_name: str
    delivery_quantity: Optional[float]
    repair_quantity: Optional[float]
    deduction_amount: Optional[float]
    final_settlement: Optional[float]
    status: str
    is_frozen: int
    is_manual_override: int
    override_reason: Optional[str]
    created_at: str
    updated_at: str


@dataclass
class AuditLog:
    id: Optional[int]
    batch_id: str
    action: str
    record_id: Optional[int]
    old_value: Optional[str]
    new_value: Optional[str]
    operator: str
    reason: Optional[str]
    timestamp: str


class Database:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = Path.cwd() / DB_FILENAME
        self.db_path = db_path
        self.conn = None

    def connect(self):
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row
        return self.conn

    def close(self):
        if self.conn:
            self.conn.close()

    def init_db(self):
        with self.connect() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS source_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    batch_id TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    file_hash TEXT NOT NULL,
                    imported_at TEXT NOT NULL,
                    imported_by TEXT NOT NULL,
                    status TEXT NOT NULL,
                    row_count INTEGER NOT NULL,
                    UNIQUE(batch_id, file_type, file_hash)
                )
            ''')

            cursor.execute('''
                CREATE TABLE IF NOT EXISTS raw_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_file_id INTEGER NOT NULL,
                    batch_id TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    original_row_number INTEGER NOT NULL,
                    raw_data TEXT NOT NULL,
                    parsed_data TEXT NOT NULL,
                    status TEXT NOT NULL,
                    check_result TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (source_file_id) REFERENCES source_files(id),
                    UNIQUE(source_file_id, original_row_number)
                )
            ''')

            cursor.execute('''
                CREATE TABLE IF NOT EXISTS reconciliation_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    batch_id TEXT NOT NULL,
                    product_code TEXT NOT NULL,
                    product_name TEXT NOT NULL,
                    delivery_quantity REAL,
                    repair_quantity REAL,
                    deduction_amount REAL,
                    final_settlement REAL,
                    status TEXT NOT NULL,
                    is_frozen INTEGER DEFAULT 0,
                    is_manual_override INTEGER DEFAULT 0,
                    override_reason TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(batch_id, product_code)
                )
            ''')

            cursor.execute('''
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    batch_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    record_id INTEGER,
                    old_value TEXT,
                    new_value TEXT,
                    operator TEXT NOT NULL,
                    reason TEXT,
                    timestamp TEXT NOT NULL
                )
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_raw_records_batch 
                ON raw_records(batch_id, file_type)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_reconciliation_batch 
                ON reconciliation_records(batch_id)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_audit_logs_batch 
                ON audit_logs(batch_id, timestamp)
            ''')

            conn.commit()

    def log_action(self, batch_id: str, action: str, operator: str,
                   record_id: int = None, old_value: Any = None,
                   new_value: Any = None, reason: str = None):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO audit_logs 
                (batch_id, action, record_id, old_value, new_value, operator, reason, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                batch_id, action, record_id,
                json.dumps(old_value, ensure_ascii=False) if old_value else None,
                json.dumps(new_value, ensure_ascii=False) if new_value else None,
                operator, reason, datetime.now().isoformat()
            ))
            conn.commit()

    def insert_source_file(self, source_file: SourceFile) -> int:
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO source_files 
                (batch_id, file_type, file_name, file_hash, imported_at, imported_by, status, row_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                source_file.batch_id, source_file.file_type, source_file.file_name,
                source_file.file_hash, source_file.imported_at, source_file.imported_by,
                source_file.status, source_file.row_count
            ))
            conn.commit()
            return cursor.lastrowid

    def insert_raw_record(self, record: RawRecord) -> int:
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO raw_records 
                (source_file_id, batch_id, file_type, original_row_number, 
                 raw_data, parsed_data, status, check_result, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record.source_file_id, record.batch_id, record.file_type,
                record.original_row_number, record.raw_data, record.parsed_data,
                record.status, record.check_result, record.created_at, record.updated_at
            ))
            conn.commit()
            return cursor.lastrowid

    def upsert_reconciliation(self, record: ReconciliationRecord) -> int:
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id FROM reconciliation_records 
                WHERE batch_id = ? AND product_code = ?
            ''', (record.batch_id, record.product_code))
            existing = cursor.fetchone()

            if existing:
                cursor.execute('''
                    UPDATE reconciliation_records SET
                        delivery_quantity = COALESCE(?, delivery_quantity),
                        repair_quantity = COALESCE(?, repair_quantity),
                        deduction_amount = COALESCE(?, deduction_amount),
                        final_settlement = ?,
                        status = ?,
                        updated_at = ?
                    WHERE id = ?
                ''', (
                    record.delivery_quantity, record.repair_quantity,
                    record.deduction_amount, record.final_settlement,
                    record.status, record.updated_at, existing['id']
                ))
                return existing['id']
            else:
                cursor.execute('''
                    INSERT INTO reconciliation_records 
                    (batch_id, product_code, product_name, delivery_quantity, 
                     repair_quantity, deduction_amount, final_settlement, 
                     status, is_frozen, is_manual_override, override_reason,
                     created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    record.batch_id, record.product_code, record.product_name,
                    record.delivery_quantity, record.repair_quantity,
                    record.deduction_amount, record.final_settlement,
                    record.status, record.is_frozen, record.is_manual_override,
                    record.override_reason, record.created_at, record.updated_at
                ))
                conn.commit()
                return cursor.lastrowid

    def check_duplicate_file(self, batch_id: str, file_type: str, file_hash: str) -> bool:
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT COUNT(*) as cnt FROM source_files 
                WHERE batch_id = ? AND file_type = ? AND file_hash = ?
            ''', (batch_id, file_type, file_hash))
            return cursor.fetchone()['cnt'] > 0

    def get_failed_records(self, batch_id: str) -> List[sqlite3.Row]:
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT r.*, s.file_name, s.file_type
                FROM raw_records r
                JOIN source_files s ON r.source_file_id = s.id
                WHERE r.batch_id = ? AND r.status != 'success'
                ORDER BY r.file_type, r.original_row_number
            ''', (batch_id,))
            return cursor.fetchall()

    def get_reconciliation_records(self, batch_id: str, include_frozen: bool = True) -> List[sqlite3.Row]:
        with self.connect() as conn:
            cursor = conn.cursor()
            if include_frozen:
                cursor.execute('''
                    SELECT * FROM reconciliation_records 
                    WHERE batch_id = ? ORDER BY product_code
                ''', (batch_id,))
            else:
                cursor.execute('''
                    SELECT * FROM reconciliation_records 
                    WHERE batch_id = ? AND is_frozen = 0 ORDER BY product_code
                ''', (batch_id,))
            return cursor.fetchall()

    def get_audit_history(self, batch_id: str, limit: int = 100) -> List[sqlite3.Row]:
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM audit_logs 
                WHERE batch_id = ? ORDER BY timestamp DESC LIMIT ?
            ''', (batch_id, limit))
            return cursor.fetchall()

    def get_all_batches(self) -> List[str]:
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT DISTINCT batch_id FROM source_files 
                UNION 
                SELECT DISTINCT batch_id FROM audit_logs
                ORDER BY batch_id
            ''')
            return [row[0] for row in cursor.fetchall()]

    def freeze_batch(self, batch_id: str, operator: str) -> int:
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE reconciliation_records 
                SET is_frozen = 1, updated_at = ?
                WHERE batch_id = ? AND is_frozen = 0
            ''', (datetime.now().isoformat(), batch_id))
            count = cursor.rowcount
            conn.commit()
            if count > 0:
                self.log_action(batch_id, 'freeze', operator, reason=f'冻结 {count} 条对账记录')
            return count

    def manual_override(self, batch_id: str, product_code: str, 
                        new_settlement: float, reason: str, operator: str) -> bool:
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, final_settlement, is_frozen FROM reconciliation_records
                WHERE batch_id = ? AND product_code = ?
            ''', (batch_id, product_code))
            record = cursor.fetchone()
            
            if not record:
                raise ValueError(f"未找到记录: {product_code}")
            if record['is_frozen']:
                raise ValueError(f"记录已冻结，无法修改")

            old_value = record['final_settlement']
            cursor.execute('''
                UPDATE reconciliation_records SET
                    final_settlement = ?,
                    is_manual_override = 1,
                    override_reason = ?,
                    status = 'manual_override',
                    updated_at = ?
                WHERE id = ?
            ''', (new_settlement, reason, datetime.now().isoformat(), record['id']))
            conn.commit()
            
            self.log_action(
                batch_id, 'manual_override', operator,
                record_id=record['id'],
                old_value={'final_settlement': old_value},
                new_value={'final_settlement': new_settlement},
                reason=reason
            )
            return True

    def withdraw_import(self, batch_id: str, file_type: str, operator: str) -> int:
        with self.connect() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, file_name FROM source_files 
                WHERE batch_id = ? AND file_type = ?
            ''', (batch_id, file_type))
            files = cursor.fetchall()
            
            if not files:
                return 0

            for sf in files:
                cursor.execute('DELETE FROM raw_records WHERE source_file_id = ?', (sf['id'],))
            
            cursor.execute('DELETE FROM source_files WHERE batch_id = ? AND file_type = ?', 
                         (batch_id, file_type))
            
            conn.commit()
            
            self.log_action(
                batch_id, 'withdraw', operator,
                old_value={'file_type': file_type, 'files': [f['file_name'] for f in files]},
                reason=f'撤回 {file_type} 类型导入'
            )
            
            return len(files)
