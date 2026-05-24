import sqlite3
import threading
from contextlib import contextmanager
from typing import Optional

DATABASE_PATH = "data/cs_ticket_system.db"
_db_lock = threading.Lock()


@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_database():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS import_sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_file_name TEXT NOT NULL,
                source_file_hash TEXT NOT NULL,
                source_file_size INTEGER,
                import_status TEXT NOT NULL DEFAULT 'pending',
                imported_by TEXT,
                imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_rows INTEGER DEFAULT 0,
                success_rows INTEGER DEFAULT 0,
                failed_rows INTEGER DEFAULT 0,
                remark TEXT,
                UNIQUE(source_file_hash)
            );
            
            CREATE TABLE IF NOT EXISTS import_raw_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                import_source_id INTEGER NOT NULL,
                source_line_number INTEGER NOT NULL,
                raw_content TEXT NOT NULL,
                parse_status TEXT DEFAULT 'pending',
                parsed_result TEXT,
                parse_error TEXT,
                parsed_at TIMESTAMP,
                FOREIGN KEY (import_source_id) REFERENCES import_sources(id),
                UNIQUE(import_source_id, source_line_number)
            );
            
            CREATE TABLE IF NOT EXISTS sla_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_code TEXT NOT NULL UNIQUE,
                rule_name TEXT NOT NULL,
                ticket_type TEXT NOT NULL,
                priority_level TEXT NOT NULL,
                first_response_timeout INTEGER NOT NULL,
                resolution_timeout INTEGER NOT NULL,
                escalation_timeout INTEGER,
                compensation_coefficient REAL DEFAULT 1.0,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                remark TEXT
            );
            
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_no TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                ticket_type TEXT NOT NULL,
                priority_level TEXT DEFAULT 'normal',
                status TEXT DEFAULT 'open',
                customer_id TEXT,
                customer_name TEXT,
                current_handler TEXT,
                sla_rule_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                closed_at TIMESTAMP,
                first_response_at TIMESTAMP,
                import_source_id INTEGER,
                import_raw_id INTEGER,
                FOREIGN KEY (sla_rule_id) REFERENCES sla_rules(id),
                FOREIGN KEY (import_source_id) REFERENCES import_sources(id),
                FOREIGN KEY (import_raw_id) REFERENCES import_raw_data(id)
            );
            
            CREATE TABLE IF NOT EXISTS ticket_transfer_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                from_handler TEXT NOT NULL,
                to_handler TEXT NOT NULL,
                transfer_reason TEXT,
                transfer_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                transfer_note TEXT,
                operator TEXT,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id)
            );
            
            CREATE TABLE IF NOT EXISTS session_summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                summary_content TEXT NOT NULL,
                summary_type TEXT DEFAULT 'auto',
                key_points TEXT,
                customer_emotion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                version INTEGER DEFAULT 1,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id)
            );
            
            CREATE TABLE IF NOT EXISTS compensation_approvals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                compensation_type TEXT NOT NULL,
                requested_amount REAL NOT NULL,
                approved_amount REAL,
                approval_status TEXT DEFAULT 'pending',
                sla_rule_id INTEGER,
                calculation_basis TEXT,
                applicant TEXT,
                approver TEXT,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_at TIMESTAMP,
                approval_note TEXT,
                version INTEGER DEFAULT 1,
                is_revised INTEGER DEFAULT 0,
                original_approval_id INTEGER,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id),
                FOREIGN KEY (sla_rule_id) REFERENCES sla_rules(id),
                FOREIGN KEY (original_approval_id) REFERENCES compensation_approvals(id)
            );
            
            CREATE TABLE IF NOT EXISTS temporary_supplements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                supplement_type TEXT NOT NULL,
                supplement_content TEXT NOT NULL,
                supplement_reason TEXT,
                operator TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                remark TEXT,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id)
            );
            
            CREATE TABLE IF NOT EXISTS async_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_type TEXT NOT NULL,
                task_params TEXT,
                task_status TEXT NOT NULL DEFAULT 'pending',
                priority INTEGER DEFAULT 5,
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                last_error TEXT,
                last_retry_at TIMESTAMP,
                next_retry_at TIMESTAMP,
                handler TEXT,
                progress REAL DEFAULT 0,
                result_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                ticket_id INTEGER,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id)
            );
            
            CREATE TABLE IF NOT EXISTS playback_exceptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                exception_type TEXT NOT NULL,
                exception_code TEXT,
                exception_message TEXT NOT NULL,
                playback_step TEXT,
                context_data TEXT,
                resolution_status TEXT DEFAULT 'open',
                assignee TEXT,
                detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                resolution_note TEXT,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id)
            );
            
            CREATE TABLE IF NOT EXISTS operation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation_type TEXT NOT NULL,
                operation_module TEXT NOT NULL,
                operator TEXT,
                ip_address TEXT,
                request_path TEXT,
                request_method TEXT,
                request_params TEXT,
                response_status TEXT,
                response_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ticket_id INTEGER,
                user_agent TEXT,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id)
            );
            
            CREATE TABLE IF NOT EXISTS reconciliation_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reconciliation_date TEXT NOT NULL,
                ticket_count INTEGER DEFAULT 0,
                compensation_total REAL DEFAULT 0,
                sla_violation_count INTEGER DEFAULT 0,
                exception_count INTEGER DEFAULT 0,
                reconciliation_status TEXT DEFAULT 'pending',
                reconciled_by TEXT,
                reconciled_at TIMESTAMP,
                remark TEXT
            );
            
            CREATE TABLE IF NOT EXISTS history_archives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                archive_date TEXT NOT NULL,
                archive_type TEXT NOT NULL,
                archive_path TEXT NOT NULL,
                file_size INTEGER,
                record_count INTEGER,
                archived_by TEXT,
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                checksum TEXT,
                remark TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_tickets_ticket_no ON tickets(ticket_no);
            CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
            CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
            CREATE INDEX IF NOT EXISTS idx_async_tasks_status ON async_tasks(task_status);
            CREATE INDEX IF NOT EXISTS idx_async_tasks_next_retry ON async_tasks(next_retry_at);
            CREATE INDEX IF NOT EXISTS idx_playback_exceptions_ticket ON playback_exceptions(ticket_id);
            CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_import_sources_hash ON import_sources(source_file_hash);
        """)
        
        conn.commit()


if __name__ == "__main__":
    init_database()
    print("Database initialized successfully!")
