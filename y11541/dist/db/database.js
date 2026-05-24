"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.closeDb = closeDb;
exports.run = run;
exports.get = get;
exports.all = all;
exports.initDatabase = initDatabase;
exports.resetDatabase = resetDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
let db = null;
function getDb() {
    if (!db) {
        const dbPath = process.env.AD_INSPECT_DB || path_1.default.join(process.cwd(), 'ad-inspect.db');
        db = new sqlite3_1.default.Database(dbPath);
    }
    return db;
}
function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve(this);
        });
    });
}
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row || null);
        });
    });
}
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
async function initDatabase() {
    const database = getDb();
    const exec = (sql) => new Promise((resolve, reject) => {
        database.exec(sql, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
    await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('entry', 'review', 'manager', 'readonly')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS material_records (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('material_id', 'audit_result', 'cost_daily', 'history_zip', 'supplement')),
      source_line INTEGER,
      material_id TEXT NOT NULL,
      material_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      record_date TEXT NOT NULL,
      impressions INTEGER,
      clicks INTEGER,
      cost REAL,
      audit_status TEXT,
      audit_reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dirty', 'fixed', 'approved', 'rejected', 'imported')),
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      request_id TEXT,
      raw_data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dirty_records (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      dirty_type TEXT NOT NULL CHECK (dirty_type IN ('missing_field', 'cross_day', 'name_change', 'amount_conflict', 'quantity_conflict', 'duplicate')),
      field_name TEXT,
      expected_value TEXT,
      actual_value TEXT,
      suggestion TEXT NOT NULL,
      fixed INTEGER NOT NULL DEFAULT 0,
      fixed_by TEXT,
      fixed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS change_history (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      change_reason TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS material_aliases (
      id TEXT PRIMARY KEY,
      canonical_id TEXT NOT NULL,
      alias_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(canonical_id, alias_name, platform)
    );
  `);
    await exec(`
    CREATE INDEX IF NOT EXISTS idx_material_records_id ON material_records(material_id);
    CREATE INDEX IF NOT EXISTS idx_material_records_date ON material_records(record_date);
    CREATE INDEX IF NOT EXISTS idx_material_records_status ON material_records(status);
    CREATE INDEX IF NOT EXISTS idx_dirty_records_record ON dirty_records(record_id);
    CREATE INDEX IF NOT EXISTS idx_change_history_record ON change_history(record_id);
  `);
    const managerCount = await get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['manager']);
    if (!managerCount || managerCount.count === 0) {
        await run('INSERT INTO users (id, username, role, created_at) VALUES (?, ?, ?, ?)', [(0, uuid_1.v4)(), 'admin', 'manager', (0, dayjs_1.default)().toISOString()]);
        console.log('已创建默认管理员用户: admin (role: manager)');
    }
}
async function resetDatabase() {
    const dbPath = process.env.AD_INSPECT_DB || path_1.default.join(process.cwd(), 'ad-inspect.db');
    if (fs_1.default.existsSync(dbPath)) {
        fs_1.default.unlinkSync(dbPath);
    }
    closeDb();
    await initDatabase();
}
//# sourceMappingURL=database.js.map