"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dataDir = path_1.default.join(__dirname, '..', 'data');
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path_1.default.join(dataDir, 'app.db');
exports.db = new better_sqlite3_1.default(dbPath);
exports.db.pragma('journal_mode = WAL');
exports.db.pragma('foreign_keys = ON');
exports.db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_name TEXT NOT NULL,
    import_time TEXT NOT NULL,
    filename TEXT NOT NULL,
    total_records INTEGER DEFAULT 0,
    anomaly_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing'
  );

  CREATE TABLE IF NOT EXISTS report_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    report_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    column_count INTEGER DEFAULT 0,
    row_count INTEGER DEFAULT 0,
    original_size_mb REAL DEFAULT 0,
    compressed_size_mb REAL DEFAULT 0,
    compression_ratio REAL DEFAULT 0,
    source_system TEXT DEFAULT '',
    owner TEXT DEFAULT '',
    backup_exists INTEGER DEFAULT 0,
    migration_status TEXT DEFAULT 'not_started',
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS anomalies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    anomaly_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    next_action TEXT DEFAULT '待确认',
    source_details TEXT DEFAULT '',
    handling_opinion TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES report_records(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    permission_name TEXT NOT NULL,
    grantee TEXT DEFAULT '',
    granted_by TEXT DEFAULT '',
    granted_at TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    FOREIGN KEY (record_id) REFERENCES report_records(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_records_run_id ON report_records(run_id);
  CREATE INDEX IF NOT EXISTS idx_anomalies_record_id ON anomalies(record_id);
  CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(anomaly_type);
  CREATE INDEX IF NOT EXISTS idx_permissions_record_id ON permissions(record_id);
`);
