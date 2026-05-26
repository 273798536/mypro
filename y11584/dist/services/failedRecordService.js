"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFailedRecord = saveFailedRecord;
exports.getFailedRecords = getFailedRecords;
exports.getFailedRecordStats = getFailedRecordStats;
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../database"));
function saveFailedRecord(input) {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        database_1.default.run(`INSERT INTO failed_records (id, record_type, raw_data, error_message, error_type, received_at)
       VALUES (?, ?, ?, ?, ?, ?)`, [
            (0, uuid_1.v4)(),
            input.recordType,
            JSON.stringify(input.rawData),
            input.errorMessage,
            input.errorType,
            now
        ], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
function getFailedRecords(options) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM failed_records WHERE 1=1`;
        const params = [];
        if (options?.recordType) {
            sql += ` AND record_type = ?`;
            params.push(options.recordType);
        }
        if (options?.errorType) {
            sql += ` AND error_type = ?`;
            params.push(options.errorType);
        }
        sql += ` ORDER BY received_at DESC`;
        if (options?.limit) {
            sql += ` LIMIT ?`;
            params.push(options.limit);
        }
        database_1.default.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows.map(row => ({
                    ...row,
                    raw_data: JSON.parse(row.raw_data)
                })));
        });
    });
}
function getFailedRecordStats() {
    return new Promise((resolve, reject) => {
        database_1.default.all(`SELECT record_type, error_type, COUNT(*) as count 
       FROM failed_records 
       GROUP BY record_type, error_type 
       ORDER BY count DESC`, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
