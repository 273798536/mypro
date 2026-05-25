"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dirtyRecordLogModel = void 0;
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
function rowToDirtyLog(row) {
    return {
        id: row.id,
        recordId: row.record_id,
        dirtyType: row.dirty_type,
        fieldName: row.field_name,
        expectedValue: row.expected_value,
        actualValue: row.actual_value,
        detectedAt: row.detected_at,
        resolvedAt: row.resolved_at,
        resolvedBy: row.resolved_by,
        resolution: row.resolution
    };
}
exports.dirtyRecordLogModel = {
    async create(dto) {
        const now = new Date().toISOString();
        const id = (0, uuid_1.v4)();
        return new Promise((resolve, reject) => {
            const stmt = database_1.default.prepare(`
        INSERT INTO dirty_record_logs (
          id, record_id, dirty_type, field_name, expected_value,
          actual_value, detected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(id, dto.recordId, dto.dirtyType, dto.fieldName || null, dto.expectedValue || null, dto.actualValue || null, now, (err) => {
                if (err)
                    reject(err);
                else
                    this.findById(id).then(record => resolve(record)).catch(reject);
            });
            stmt.finalize();
        });
    },
    async findById(id) {
        return new Promise((resolve, reject) => {
            database_1.default.get('SELECT * FROM dirty_record_logs WHERE id = ?', [id], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row ? rowToDirtyLog(row) : null);
            });
        });
    },
    async findByRecordId(recordId) {
        return new Promise((resolve, reject) => {
            database_1.default.all('SELECT * FROM dirty_record_logs WHERE record_id = ? ORDER BY detected_at DESC', [recordId], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map(rowToDirtyLog));
            });
        });
    },
    async resolve(id, resolvedBy, resolution) {
        const now = new Date().toISOString();
        return new Promise((resolve, reject) => {
            database_1.default.run(`UPDATE dirty_record_logs 
         SET resolved_at = ?, resolved_by = ?, resolution = ?
         WHERE id = ?`, [now, resolvedBy, resolution, id], (err) => {
                if (err)
                    reject(err);
                else
                    this.findById(id).then(resolve).catch(reject);
            });
        });
    },
    async listUnresolved() {
        return new Promise((resolve, reject) => {
            database_1.default.all('SELECT * FROM dirty_record_logs WHERE resolved_at IS NULL ORDER BY detected_at DESC', (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map(rowToDirtyLog));
            });
        });
    },
    async getStats() {
        return new Promise((resolve, reject) => {
            database_1.default.all(`SELECT dirty_type as type, 
               COUNT(*) as count,
               SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) as unresolved
         FROM dirty_record_logs 
         GROUP BY dirty_type`, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map((r) => ({
                        type: r.type,
                        count: r.count,
                        unresolved: r.unresolved
                    })));
            });
        });
    }
};
