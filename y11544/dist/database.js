"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
exports.getDatabase = getDatabase;
exports.resetDatabase = resetDatabase;
const sqlite3 = __importStar(require("sqlite3"));
class Database {
    constructor(dbPath = './database.sqlite') {
        this.db = new sqlite3.Database(dbPath);
    }
    async init() {
        await this.run(`
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        materialId TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        platform TEXT NOT NULL,
        originalName TEXT NOT NULL,
        status TEXT NOT NULL,
        createdBy TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      )
    `);
        await this.run(`
      CREATE TABLE IF NOT EXISTS audit_records (
        id TEXT PRIMARY KEY,
        materialId TEXT NOT NULL,
        auditResult TEXT NOT NULL,
        auditComment TEXT,
        auditedBy TEXT NOT NULL,
        auditedAt TEXT NOT NULL,
        FOREIGN KEY (materialId) REFERENCES materials(materialId)
      )
    `);
        await this.run(`
      CREATE TABLE IF NOT EXISTS daily_costs (
        id TEXT PRIMARY KEY,
        materialId TEXT NOT NULL,
        date TEXT NOT NULL,
        cost REAL NOT NULL,
        impressions INTEGER NOT NULL,
        clicks INTEGER NOT NULL,
        importedAt TEXT NOT NULL,
        isValid INTEGER NOT NULL DEFAULT 1,
        validationError TEXT,
        UNIQUE(materialId, date),
        FOREIGN KEY (materialId) REFERENCES materials(materialId)
      )
    `);
        await this.run(`
      CREATE TABLE IF NOT EXISTS manager_comments (
        id TEXT PRIMARY KEY,
        materialId TEXT NOT NULL,
        comment TEXT NOT NULL,
        evidence TEXT,
        commentedBy TEXT NOT NULL,
        commentedAt TEXT NOT NULL,
        FOREIGN KEY (materialId) REFERENCES materials(materialId)
      )
    `);
        await this.run(`
      CREATE TABLE IF NOT EXISTS status_change_logs (
        id TEXT PRIMARY KEY,
        materialId TEXT NOT NULL,
        fromStatus TEXT,
        toStatus TEXT NOT NULL,
        changedBy TEXT NOT NULL,
        changedAt TEXT NOT NULL,
        reason TEXT NOT NULL,
        FOREIGN KEY (materialId) REFERENCES materials(materialId)
      )
    `);
        await this.run(`
      CREATE TABLE IF NOT EXISTS failed_records (
        id TEXT PRIMARY KEY,
        recordType TEXT NOT NULL,
        originalData TEXT NOT NULL,
        errorReason TEXT NOT NULL,
        failedAt TEXT NOT NULL,
        source TEXT NOT NULL
      )
    `);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_costs_date ON daily_costs(date)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_logs_material ON status_change_logs(materialId)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_failed_records_type ON failed_records(recordType)`);
    }
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err)
                    reject(err);
                else
                    resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async beginTransaction() {
        await this.run('BEGIN TRANSACTION');
    }
    async commit() {
        await this.run('COMMIT');
    }
    async rollback() {
        await this.run('ROLLBACK');
    }
}
exports.Database = Database;
let dbInstance = null;
function getDatabase(dbPath) {
    if (!dbInstance) {
        dbInstance = new Database(dbPath);
    }
    return dbInstance;
}
function resetDatabase() {
    dbInstance = null;
}
//# sourceMappingURL=database.js.map