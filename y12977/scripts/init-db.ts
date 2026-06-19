import { getDb, PATHS } from "@/lib/db";
import fs from "fs";

function run() {
  if (!fs.existsSync(PATHS.DATA_DIR)) {
    fs.mkdirSync(PATHS.DATA_DIR, { recursive: true });
  }

  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT NOT NULL UNIQUE,
      scan_mode TEXT NOT NULL CHECK(scan_mode IN ('full','incremental')),
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      total_rows INTEGER NOT NULL DEFAULT 0,
      dirty_rows INTEGER NOT NULL DEFAULT 0,
      slow_queries INTEGER NOT NULL DEFAULT 0,
      operator TEXT NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS backup_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      source_table TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      checksum TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (batch_id) REFERENCES scan_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dirty_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      backup_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('high','medium','low')),
      source_table TEXT NOT NULL,
      source_pk TEXT NOT NULL,
      row_data_json TEXT NOT NULL,
      business_explanation TEXT NOT NULL,
      tech_detail TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','escalated')),
      detected_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_note TEXT,
      FOREIGN KEY (batch_id) REFERENCES scan_batches(id) ON DELETE CASCADE,
      FOREIGN KEY (backup_id) REFERENCES backup_records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dirty_row_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('approve','reject','escalate','reopen','comment')),
      old_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      operator TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (dirty_row_id) REFERENCES dirty_rows(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES scan_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS slow_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      query_signature TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      attribution TEXT NOT NULL,
      table_involved TEXT NOT NULL,
      sample_sql TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      captured_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (batch_id) REFERENCES scan_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS export_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      export_type TEXT NOT NULL CHECK(export_type IN ('dirty_rows','slow_queries','batch_report','compare')),
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      exported_by TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (batch_id) REFERENCES scan_batches(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_dirty_batch ON dirty_rows(batch_id);
    CREATE INDEX IF NOT EXISTS idx_dirty_status ON dirty_rows(status);
    CREATE INDEX IF NOT EXISTS idx_dirty_category ON dirty_rows(category);
    CREATE INDEX IF NOT EXISTS idx_review_row ON review_logs(dirty_row_id);
    CREATE INDEX IF NOT EXISTS idx_slow_batch ON slow_queries(batch_id);
    CREATE INDEX IF NOT EXISTS idx_backup_batch ON backup_records(batch_id);
    CREATE INDEX IF NOT EXISTS idx_export_batch ON export_logs(batch_id);
  `);

  console.log(`✅ 数据库已初始化: ${PATHS.DB_PATH}`);
  console.log("   建表完成：scan_batches / backup_records / dirty_rows / review_logs / slow_queries / export_logs");
}

run();
