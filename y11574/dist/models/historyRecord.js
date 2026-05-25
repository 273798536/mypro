"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyRecordModel = void 0;
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
function rowToHistory(row) {
    return {
        id: row.id,
        recordId: row.record_id,
        operation: row.operation,
        operationType: row.operation_type,
        operatorId: row.operator_id,
        operatorName: row.operator_name,
        operatorRole: row.operator_role,
        previousValues: row.previous_values ? JSON.parse(row.previous_values) : undefined,
        newValues: row.new_values ? JSON.parse(row.new_values) : undefined,
        changedFields: row.changed_fields ? JSON.parse(row.changed_fields) : [],
        changeReason: row.change_reason,
        duplicateStrategy: row.duplicate_strategy,
        sensitiveFieldsHandled: row.sensitive_fields_handled ? JSON.parse(row.sensitive_fields_handled) : undefined,
        timestamp: row.timestamp,
        ipAddress: row.ip_address
    };
}
exports.historyRecordModel = {
    async create(dto) {
        const now = new Date().toISOString();
        const id = (0, uuid_1.v4)();
        return new Promise((resolve, reject) => {
            const stmt = database_1.default.prepare(`
        INSERT INTO history_records (
          id, record_id, operation, operation_type, operator_id, operator_name,
          operator_role, previous_values, new_values, changed_fields,
          change_reason, duplicate_strategy, sensitive_fields_handled,
          timestamp, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(id, dto.recordId, dto.operation, dto.operationType, dto.operatorId, dto.operatorName, dto.operatorRole, dto.previousValues ? JSON.stringify(dto.previousValues) : null, dto.newValues ? JSON.stringify(dto.newValues) : null, JSON.stringify(dto.changedFields), dto.changeReason || null, dto.duplicateStrategy || null, dto.sensitiveFieldsHandled ? JSON.stringify(dto.sensitiveFieldsHandled) : null, now, dto.ipAddress || null, (err) => {
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
            database_1.default.get('SELECT * FROM history_records WHERE id = ?', [id], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row ? rowToHistory(row) : null);
            });
        });
    },
    async findByRecordId(recordId) {
        return new Promise((resolve, reject) => {
            database_1.default.all('SELECT * FROM history_records WHERE record_id = ? ORDER BY timestamp DESC', [recordId], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map(rowToHistory));
            });
        });
    },
    async list(filters = {}) {
        let sql = 'SELECT * FROM history_records WHERE 1=1';
        const params = [];
        if (filters.operatorId) {
            sql += ' AND operator_id = ?';
            params.push(filters.operatorId);
        }
        if (filters.operationType) {
            sql += ' AND operation_type = ?';
            params.push(filters.operationType);
        }
        if (filters.startDate) {
            sql += ' AND timestamp >= ?';
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            sql += ' AND timestamp <= ?';
            params.push(filters.endDate);
        }
        sql += ' ORDER BY timestamp DESC';
        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(filters.limit);
        }
        return new Promise((resolve, reject) => {
            database_1.default.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map(rowToHistory));
            });
        });
    },
    async getChangeReasons() {
        return new Promise((resolve, reject) => {
            database_1.default.all(`SELECT change_reason as reason, COUNT(*) as count 
         FROM history_records 
         WHERE change_reason IS NOT NULL 
         GROUP BY change_reason 
         ORDER BY count DESC`, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map((r) => ({ reason: r.reason, count: r.count })));
            });
        });
    }
};
