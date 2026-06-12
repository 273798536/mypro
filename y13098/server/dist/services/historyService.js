"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistoryByRecordId = getHistoryByRecordId;
exports.getHistoryById = getHistoryById;
exports.createHistoryChange = createHistoryChange;
exports.getHistoryByDateRange = getHistoryByDateRange;
exports.getWeeklyReviewData = getWeeklyReviewData;
const database_1 = require("../database");
const utils_1 = require("@shared/utils");
const toHistoryChange = (row) => ({
    id: row.id,
    recordId: row.record_id,
    fieldName: row.field_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    changeType: row.change_type,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
    remark: row.remark
});
async function getHistoryByRecordId(recordId) {
    const rows = await (0, database_1.runQuery)('SELECT * FROM history_changes WHERE record_id = ? ORDER BY changed_at DESC', [recordId]);
    return rows.map(toHistoryChange);
}
async function getHistoryById(id) {
    const row = await (0, database_1.runQueryOne)('SELECT * FROM history_changes WHERE id = ?', [id]);
    return row ? toHistoryChange(row) : undefined;
}
async function createHistoryChange(data) {
    const id = (0, utils_1.generateId)();
    const now = new Date().toISOString();
    await (0, database_1.runExecute)(`INSERT INTO history_changes 
     (id, record_id, field_name, old_value, new_value, change_type, changed_by, changed_at, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.recordId, data.fieldName, data.oldValue, data.newValue,
        data.changeType, data.changedBy, now, data.remark]);
    const history = await getHistoryById(id);
    if (!history)
        throw new Error('Failed to create history change');
    return history;
}
async function getHistoryByDateRange(startDate, endDate) {
    const rows = await (0, database_1.runQuery)('SELECT * FROM history_changes WHERE changed_at >= ? AND changed_at <= ? ORDER BY changed_at DESC', [startDate, endDate]);
    return rows.map(toHistoryChange);
}
async function getWeeklyReviewData() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const records = await getHistoryByDateRange(weekAgo.toISOString(), now.toISOString());
    return {
        totalChanges: records.length,
        confirmations: records.filter(r => r.changeType === 'confirm').length,
        modifications: records.filter(r => r.changeType === 'update' || r.changeType === 'status_change').length,
        records
    };
}
