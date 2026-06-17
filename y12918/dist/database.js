"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.saveDb = saveDb;
exports.getDb = getDb;
exports.run = run;
exports.get = get;
exports.all = all;
exports.exec = exec;
exports.transaction = transaction;
const sql_js_1 = __importDefault(require("sql.js"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let SQL;
let db;
const DB_PATH = path_1.default.join(process.cwd(), 'data', 'coverage_report.db');
const DB_DIR = path_1.default.dirname(DB_PATH);
async function initDatabase() {
    SQL = await (0, sql_js_1.default)();
    if (!fs_1.default.existsSync(DB_DIR)) {
        fs_1.default.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs_1.default.existsSync(DB_PATH)) {
        const fileBuffer = fs_1.default.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    }
    else {
        db = new SQL.Database();
    }
    createTables();
    saveDatabase();
    return db;
}
let saveTimeout = null;
function scheduleSave() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
        saveDatabase();
        saveTimeout = null;
    }, 100);
}
function saveDatabase() {
    if (!db)
        return;
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs_1.default.writeFileSync(DB_PATH, buffer);
    }
    catch (e) {
        console.error('保存数据库失败:', e);
    }
}
function saveDb() {
    saveDatabase();
}
function createTables() {
    const statements = [
        `CREATE TABLE IF NOT EXISTS evaluation_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      source TEXT,
      total_questions INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
        `CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evaluation_set_id INTEGER NOT NULL,
      question_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      domain_tags TEXT,
      annotation_status TEXT NOT NULL DEFAULT 'none',
      annotation_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(evaluation_set_id, question_id)
    )`,
        `CREATE TABLE IF NOT EXISTS domain_vocabularies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      total_terms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(name, domain)
    )`,
        `CREATE TABLE IF NOT EXISTS vocabulary_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vocabulary_id INTEGER NOT NULL,
      term TEXT NOT NULL,
      category TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(vocabulary_id, term)
    )`,
        `CREATE TABLE IF NOT EXISTS coverage_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      evaluation_set_id INTEGER NOT NULL,
      vocabulary_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_questions INTEGER NOT NULL DEFAULT 0,
      covered_questions INTEGER NOT NULL DEFAULT 0,
      coverage_rate REAL NOT NULL DEFAULT 0,
      total_terms INTEGER NOT NULL DEFAULT 0,
      hit_terms INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      exported_at TEXT
    )`,
        `CREATE TABLE IF NOT EXISTS report_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      question_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      is_covered INTEGER NOT NULL DEFAULT 0,
      hit_terms TEXT NOT NULL DEFAULT '[]',
      annotation_status TEXT NOT NULL DEFAULT 'none',
      annotation_note TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
        `CREATE TABLE IF NOT EXISTS review_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      report_item_id INTEGER NOT NULL,
      reviewer TEXT NOT NULL,
      action TEXT NOT NULL,
      comment TEXT,
      annotation_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
        `CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    ];
    statements.forEach((sql) => {
        try {
            db.run(sql);
        }
        catch (e) {
            console.warn('建表警告:', e.message);
        }
    });
    try {
        db.run('CREATE INDEX IF NOT EXISTS idx_report_items_report_id ON report_items(report_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_report_items_is_covered ON report_items(is_covered)');
        db.run('CREATE INDEX IF NOT EXISTS idx_report_items_annotation_status ON report_items(annotation_status)');
        db.run('CREATE INDEX IF NOT EXISTS idx_review_records_report_id ON review_records(report_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_questions_evaluation_set_id ON questions(evaluation_set_id)');
    }
    catch (e) {
        // ignore
    }
}
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}
function run(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    const changes = db.getRowsModified();
    const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
    const lastInsertRowid = lastIdResult[0]?.values?.[0]?.[0] || 0;
    scheduleSave();
    return {
        changes,
        lastInsertRowid: Number(lastInsertRowid),
    };
}
function get(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let result;
    if (stmt.step()) {
        result = stmt.getAsObject();
    }
    stmt.free();
    return result;
}
function all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}
function exec(sql) {
    db.run(sql);
    scheduleSave();
}
function transaction(fn) {
    db.run('BEGIN TRANSACTION');
    try {
        const result = fn();
        db.run('COMMIT');
        scheduleSave();
        return result;
    }
    catch (e) {
        db.run('ROLLBACK');
        throw e;
    }
}
//# sourceMappingURL=database.js.map