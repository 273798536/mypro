"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.failedRecordService = exports.FailedRecordService = void 0;
const database_1 = require("../database");
class FailedRecordService {
    constructor(db) {
        this.db = db || (0, database_1.getDatabase)();
    }
    async getFailedRecords(recordType, page = 1, pageSize = 50) {
        let sql = 'SELECT * FROM failed_records';
        let countSql = 'SELECT COUNT(*) as count FROM failed_records';
        const params = [];
        if (recordType) {
            sql += ' WHERE recordType = ?';
            countSql += ' WHERE recordType = ?';
            params.push(recordType);
        }
        sql += ' ORDER BY failedAt DESC LIMIT ? OFFSET ?';
        params.push(pageSize, (page - 1) * pageSize);
        const [items, countResult] = await Promise.all([
            this.db.all(sql, params),
            this.db.get(countSql, recordType ? [recordType] : [])
        ]);
        return {
            items: items.map(item => ({
                ...item,
                originalData: JSON.parse(item.originalData)
            })),
            total: countResult?.count || 0,
            page,
            pageSize
        };
    }
    async getFailedRecordStats() {
        const [totalResult, byTypeResult] = await Promise.all([
            this.db.get('SELECT COUNT(*) as count FROM failed_records'),
            this.db.all('SELECT recordType, COUNT(*) as count FROM failed_records GROUP BY recordType')
        ]);
        return {
            total: totalResult?.count || 0,
            byType: byTypeResult.map(r => ({ type: r.recordType, count: r.count }))
        };
    }
}
exports.FailedRecordService = FailedRecordService;
exports.failedRecordService = new FailedRecordService();
//# sourceMappingURL=failedRecordService.js.map