"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditTrail = logAuditTrail;
exports.getAuditTrailsByRecord = getAuditTrailsByRecord;
exports.getAllAuditTrails = getAllAuditTrails;
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../database"));
function logAuditTrail(input) {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        const trail = {
            id: (0, uuid_1.v4)(),
            record_id: input.recordId,
            record_type: input.recordType,
            action: input.action,
            old_status: input.oldStatus,
            new_status: input.newStatus,
            operator_id: input.operatorId,
            operator_name: input.operatorName,
            operator_role: input.operatorRole,
            change_reason: input.changeReason,
            changed_fields: input.changedFields ? JSON.stringify(input.changedFields) : null,
            created_at: now
        };
        database_1.default.run(`INSERT INTO audit_trails (id, record_id, record_type, action, old_status, new_status, 
        operator_id, operator_name, operator_role, change_reason, changed_fields, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            trail.id, trail.record_id, trail.record_type, trail.action, trail.old_status,
            trail.new_status, trail.operator_id, trail.operator_name, trail.operator_role,
            trail.change_reason, trail.changed_fields, trail.created_at
        ], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
function getAuditTrailsByRecord(recordId, recordType) {
    return new Promise((resolve, reject) => {
        database_1.default.all(`SELECT * FROM audit_trails WHERE record_id = ? AND record_type = ? ORDER BY created_at DESC`, [recordId, recordType], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
function getAllAuditTrails(options) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM audit_trails WHERE 1=1`;
        const params = [];
        if (options?.startTime) {
            sql += ` AND created_at >= ?`;
            params.push(options.startTime);
        }
        if (options?.endTime) {
            sql += ` AND created_at <= ?`;
            params.push(options.endTime);
        }
        if (options?.operatorRole) {
            sql += ` AND operator_role = ?`;
            params.push(options.operatorRole);
        }
        sql += ` ORDER BY created_at DESC`;
        database_1.default.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
