"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
class DatabaseManager {
    constructor(workspacePath) {
        this.dbPath = path_1.default.join(workspacePath, '.wwi', 'facts.db');
    }
    async init() {
        this.ensureDirectoryExists();
        this.db = await (0, sqlite_1.open)({
            filename: this.dbPath,
            driver: sqlite3_1.default.Database,
        });
        await this.initTables();
    }
    ensureDirectoryExists() {
        const dir = path_1.default.dirname(this.dbPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    async initTables() {
        await this.db.exec(`
      CREATE TABLE IF NOT EXISTS fact_records (
        id TEXT PRIMARY KEY,
        fact_key TEXT NOT NULL UNIQUE,
        source_type TEXT NOT NULL,
        wave_no TEXT NOT NULL,
        order_no TEXT NOT NULL,
        sku_code TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        original_row_number INTEGER NOT NULL,
        source_file TEXT NOT NULL,
        import_batch_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_fact_wave ON fact_records(wave_no);
      CREATE INDEX IF NOT EXISTS idx_fact_order ON fact_records(order_no);
      CREATE INDEX IF NOT EXISTS idx_fact_sku ON fact_records(sku_code);
      CREATE INDEX IF NOT EXISTS idx_fact_source ON fact_records(source_type);
      CREATE INDEX IF NOT EXISTS idx_fact_status ON fact_records(status);

      CREATE TABLE IF NOT EXISTS validation_errors (
        id TEXT PRIMARY KEY,
        fact_id TEXT NOT NULL,
        fact_key TEXT NOT NULL,
        source_type TEXT NOT NULL,
        original_row_number INTEGER NOT NULL,
        error_code TEXT NOT NULL,
        error_message TEXT NOT NULL,
        field TEXT,
        value TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (fact_id) REFERENCES fact_records(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_error_fact ON validation_errors(fact_id);

      CREATE TABLE IF NOT EXISTS fix_records (
        id TEXT PRIMARY KEY,
        fact_id TEXT NOT NULL,
        fact_key TEXT NOT NULL,
        fix_type TEXT NOT NULL,
        old_data TEXT NOT NULL,
        new_data TEXT NOT NULL,
        operator TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (fact_id) REFERENCES fact_records(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_fix_fact ON fix_records(fact_id);

      CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        total_records INTEGER NOT NULL,
        success_count INTEGER NOT NULL,
        update_count INTEGER NOT NULL,
        fail_count INTEGER NOT NULL,
        imported_at TEXT NOT NULL,
        operator TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_batch_source ON import_batches(source_type);
      CREATE INDEX IF NOT EXISTS idx_batch_time ON import_batches(imported_at);
    `);
    }
    generateFactKey(sourceType, waveNo, orderNo, skuCode) {
        return `${sourceType}:${waveNo}:${orderNo}:${skuCode}`;
    }
    async upsertFactRecord(sourceType, waveNo, orderNo, skuCode, data, originalRowNumber, sourceFile, importBatchId) {
        const factKey = this.generateFactKey(sourceType, waveNo, orderNo, skuCode);
        const now = new Date().toISOString();
        const existing = await this.db.get('SELECT * FROM fact_records WHERE fact_key = ?', factKey);
        if (existing) {
            const mergedData = { ...JSON.parse(existing.data), ...data };
            await this.db.run(`UPDATE fact_records 
         SET data = ?, status = 'pending', source_file = ?, import_batch_id = ?, updated_at = ?
         WHERE fact_key = ?`, JSON.stringify(mergedData), sourceFile, importBatchId, now, factKey);
            const updated = await this.db.get('SELECT * FROM fact_records WHERE fact_key = ?', factKey);
            return {
                isNew: false,
                record: this.hydrateFactRecord(updated),
            };
        }
        const id = (0, uuid_1.v4)();
        await this.db.run(`INSERT INTO fact_records 
       (id, fact_key, source_type, wave_no, order_no, sku_code, data, status, 
        original_row_number, source_file, import_batch_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, factKey, sourceType, waveNo, orderNo, skuCode, JSON.stringify(data), 'pending', originalRowNumber, sourceFile, importBatchId, now, now);
        const record = await this.db.get('SELECT * FROM fact_records WHERE id = ?', id);
        return {
            isNew: true,
            record: this.hydrateFactRecord(record),
        };
    }
    async getFactRecord(factKey) {
        const row = await this.db.get('SELECT * FROM fact_records WHERE fact_key = ?', factKey);
        return row ? this.hydrateFactRecord(row) : null;
    }
    async getFactRecordsByWave(waveNo) {
        const rows = await this.db.all('SELECT * FROM fact_records WHERE wave_no = ?', waveNo);
        return rows.map((r) => this.hydrateFactRecord(r));
    }
    async getFactRecordsBySource(sourceType) {
        const rows = await this.db.all('SELECT * FROM fact_records WHERE source_type = ?', sourceType);
        return rows.map((r) => this.hydrateFactRecord(r));
    }
    async getAllFactRecords(status) {
        let sql = 'SELECT * FROM fact_records';
        const params = [];
        if (status) {
            sql += ' WHERE status = ?';
            params.push(status);
        }
        const rows = await this.db.all(sql, ...params);
        return rows.map((r) => this.hydrateFactRecord(r));
    }
    async updateFactStatus(factId, status) {
        await this.db.run('UPDATE fact_records SET status = ?, updated_at = ? WHERE id = ?', status, new Date().toISOString(), factId);
    }
    async updateFactData(factId, data) {
        await this.db.run('UPDATE fact_records SET data = ?, updated_at = ? WHERE id = ?', JSON.stringify(data), new Date().toISOString(), factId);
    }
    async addValidationError(error) {
        const id = (0, uuid_1.v4)();
        await this.db.run(`INSERT INTO validation_errors 
       (id, fact_id, fact_key, source_type, original_row_number, error_code, error_message, field, value, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, error.factId, error.factKey, error.sourceType, error.originalRowNumber, error.errorCode, error.errorMessage, error.field, error.value ? JSON.stringify(error.value) : null, new Date().toISOString());
    }
    async clearValidationErrors(factId) {
        await this.db.run('DELETE FROM validation_errors WHERE fact_id = ?', factId);
    }
    async getValidationErrors(factId) {
        let sql = 'SELECT * FROM validation_errors';
        const params = [];
        if (factId) {
            sql += ' WHERE fact_id = ?';
            params.push(factId);
        }
        sql += ' ORDER BY created_at DESC';
        const rows = await this.db.all(sql, ...params);
        return rows.map((r) => ({
            id: r.id,
            factId: r.fact_id,
            factKey: r.fact_key,
            sourceType: r.source_type,
            originalRowNumber: r.original_row_number,
            errorCode: r.error_code,
            errorMessage: r.error_message,
            field: r.field,
            value: r.value ? JSON.parse(r.value) : undefined,
            createdAt: r.created_at,
        }));
    }
    async addFixRecord(factId, factKey, fixType, oldData, newData, operator, reason) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await this.db.run(`INSERT INTO fix_records 
       (id, fact_id, fact_key, fix_type, old_data, new_data, operator, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, factId, factKey, fixType, JSON.stringify(oldData), JSON.stringify(newData), operator, reason, now);
        return {
            id,
            factId,
            factKey,
            fixType,
            oldData,
            newData,
            operator,
            reason,
            createdAt: now,
        };
    }
    async getFixRecords(factId) {
        let sql = 'SELECT * FROM fix_records';
        const params = [];
        if (factId) {
            sql += ' WHERE fact_id = ?';
            params.push(factId);
        }
        sql += ' ORDER BY created_at DESC';
        const rows = await this.db.all(sql, ...params);
        return rows.map((r) => ({
            id: r.id,
            factId: r.fact_id,
            factKey: r.fact_key,
            fixType: r.fix_type,
            oldData: JSON.parse(r.old_data),
            newData: JSON.parse(r.new_data),
            operator: r.operator,
            reason: r.reason,
            createdAt: r.created_at,
        }));
    }
    async createImportBatch(sourceType, fileName, totalRecords, successCount, updateCount, failCount, operator) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await this.db.run(`INSERT INTO import_batches 
       (id, source_type, file_name, total_records, success_count, update_count, fail_count, imported_at, operator)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, sourceType, fileName, totalRecords, successCount, updateCount, failCount, now, operator || null);
        return {
            id,
            sourceType,
            fileName,
            totalRecords,
            successCount,
            updateCount,
            failCount,
            importedAt: now,
            operator,
        };
    }
    async getImportBatches(limit = 50) {
        const rows = await this.db.all('SELECT * FROM import_batches ORDER BY imported_at DESC LIMIT ?', limit);
        return rows.map((r) => ({
            id: r.id,
            sourceType: r.source_type,
            fileName: r.file_name,
            totalRecords: r.total_records,
            successCount: r.success_count,
            updateCount: r.update_count,
            failCount: r.fail_count,
            importedAt: r.imported_at,
            operator: r.operator,
        }));
    }
    async getDistinctWaveNos() {
        const rows = await this.db.all('SELECT DISTINCT wave_no FROM fact_records ORDER BY wave_no');
        return rows.map((r) => r.wave_no);
    }
    async close() {
        await this.db.close();
    }
    hydrateFactRecord(row) {
        return {
            id: row.id,
            factKey: row.fact_key,
            sourceType: row.source_type,
            waveNo: row.wave_no,
            orderNo: row.order_no,
            skuCode: row.sku_code,
            data: JSON.parse(row.data),
            status: row.status,
            originalRowNumber: row.original_row_number,
            sourceFile: row.source_file,
            importBatchId: row.import_batch_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
exports.DatabaseManager = DatabaseManager;
