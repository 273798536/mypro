"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportLogModel = void 0;
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
function rowToExportLog(row) {
    return {
        id: row.id,
        exportedBy: row.exported_by,
        exportedByName: row.exported_by_name,
        exportType: row.export_type,
        recordCount: row.record_count,
        totalAmount: row.total_amount,
        isMasked: row.is_masked === 1,
        maskedFields: row.masked_fields ? JSON.parse(row.masked_fields) : [],
        filters: row.filters ? JSON.parse(row.filters) : {},
        exportedAt: row.exported_at,
        checksum: row.checksum
    };
}
exports.exportLogModel = {
    async create(dto) {
        const now = new Date().toISOString();
        const id = (0, uuid_1.v4)();
        return new Promise((resolve, reject) => {
            const stmt = database_1.default.prepare(`
        INSERT INTO export_logs (
          id, exported_by, exported_by_name, export_type, record_count,
          total_amount, is_masked, masked_fields, filters, exported_at, checksum
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(id, dto.exportedBy, dto.exportedByName, dto.exportType, dto.recordCount, dto.totalAmount, dto.isMasked ? 1 : 0, JSON.stringify(dto.maskedFields), JSON.stringify(dto.filters), now, dto.checksum, (err) => {
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
            database_1.default.get('SELECT * FROM export_logs WHERE id = ?', [id], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row ? rowToExportLog(row) : null);
            });
        });
    },
    async list(limit = 100) {
        return new Promise((resolve, reject) => {
            database_1.default.all('SELECT * FROM export_logs ORDER BY exported_at DESC LIMIT ?', [limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map(rowToExportLog));
            });
        });
    },
    async getRecentByUser(userId, limit = 10) {
        return new Promise((resolve, reject) => {
            database_1.default.all('SELECT * FROM export_logs WHERE exported_by = ? ORDER BY exported_at DESC LIMIT ?', [userId, limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map(rowToExportLog));
            });
        });
    }
};
