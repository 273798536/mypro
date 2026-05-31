import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbDir = path.resolve(process.cwd(), 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.resolve(dbDir, 'vat.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS country_rates (
    country TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    vat_rate REAL NOT NULL,
    effective_from TEXT NOT NULL,
    effective_to TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_id TEXT UNIQUE NOT NULL,
    country TEXT NOT NULL,
    period TEXT NOT NULL,
    gross_amount REAL NOT NULL,
    vat_rate REAL NOT NULL,
    vat_amount REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'import',
    status TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    return_id TEXT UNIQUE NOT NULL,
    original_order_id TEXT,
    country TEXT NOT NULL,
    period TEXT NOT NULL,
    gross_amount REAL NOT NULL,
    vat_rate REAL NOT NULL,
    vat_amount REAL NOT NULL,
    is_late_arrival INTEGER NOT NULL DEFAULT 0,
    original_period TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_bills (
    id TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    period TEXT NOT NULL,
    billed_vat REAL NOT NULL,
    billed_gross REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'import',
    created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_country_period ON platform_bills(country, period);

CREATE TABLE IF NOT EXISTS vat_accruals (
    id TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    period TEXT NOT NULL,
    order_vat REAL NOT NULL DEFAULT 0,
    return_vat REAL NOT NULL DEFAULT 0,
    net_vat REAL NOT NULL DEFAULT 0,
    billed_vat REAL NOT NULL DEFAULT 0,
    difference REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending_bill',
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accruals_country_period ON vat_accruals(country, period);

CREATE TABLE IF NOT EXISTS exceptions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    reference_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    country TEXT NOT NULL,
    period TEXT NOT NULL,
    description TEXT NOT NULL,
    impact REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    resolution TEXT,
    resolved_by TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field TEXT NOT NULL,
    old_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    changed_by TEXT NOT NULL DEFAULT 'operator',
    impact_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
`)

db.exec(`
INSERT OR IGNORE INTO country_rates (country, country_name, vat_rate, effective_from) VALUES
    ('DE', '德国', 19.0, '2024-01-01'),
    ('FR', '法国', 20.0, '2024-01-01'),
    ('IT', '意大利', 22.0, '2024-01-01'),
    ('ES', '西班牙', 21.0, '2024-01-01'),
    ('NL', '荷兰', 21.0, '2024-01-01'),
    ('BE', '比利时', 21.0, '2024-01-01'),
    ('AT', '奥地利', 20.0, '2024-01-01'),
    ('PL', '波兰', 23.0, '2024-01-01'),
    ('SE', '瑞典', 25.0, '2024-01-01'),
    ('PT', '葡萄牙', 23.0, '2024-01-01'),
    ('IE', '爱尔兰', 23.0, '2024-01-01'),
    ('DK', '丹麦', 25.0, '2024-01-01'),
    ('FI', '芬兰', 24.0, '2024-01-01'),
    ('CZ', '捷克', 21.0, '2024-01-01'),
    ('HU', '匈牙利', 27.0, '2024-01-01');
`)

export default db
