"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findExistingRecord = findExistingRecord;
exports.findByRequestId = findByRequestId;
exports.createRecord = createRecord;
exports.updateRecord = updateRecord;
exports.updateRecordStatus = updateRecordStatus;
exports.getRecordById = getRecordById;
exports.getRecordsByStatus = getRecordsByStatus;
exports.getAllRecords = getAllRecords;
exports.getRecordHistory = getRecordHistory;
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const database_1 = require("../db/database");
const userService_1 = require("./userService");
async function findExistingRecord(material_id, platform, record_date, source) {
    return (0, database_1.get)(`SELECT * FROM material_records 
     WHERE material_id = ? AND platform = ? AND record_date = ? AND source = ?`, [material_id, platform, record_date, source]);
}
async function findByRequestId(request_id) {
    return (0, database_1.all)('SELECT * FROM material_records WHERE request_id = ?', [request_id]);
}
async function createRecord(data, source, sourceLine, requestId) {
    const user = await (0, userService_1.getCurrentUser)();
    const id = (0, uuid_1.v4)();
    const now = (0, dayjs_1.default)().toISOString();
    await (0, database_1.run)(`INSERT INTO material_records (
      id, source, source_line, material_id, material_name, platform, record_date,
      impressions, clicks, cost, audit_status, audit_reason, status,
      created_by, created_at, updated_at, request_id, raw_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        source,
        sourceLine ?? null,
        data.material_id,
        data.material_name,
        data.platform,
        data.record_date,
        data.impressions ?? null,
        data.clicks ?? null,
        data.cost ?? null,
        data.audit_status ?? null,
        data.audit_reason ?? null,
        'pending',
        user.id,
        now,
        now,
        requestId ?? null,
        JSON.stringify(data)
    ]);
    return getRecordById(id);
}
async function updateRecord(id, updates, reason) {
    const user = await (0, userService_1.getCurrentUser)();
    const record = await getRecordById(id);
    if (!record) {
        throw new Error(`记录不存在: ${id}`);
    }
    const now = (0, dayjs_1.default)().toISOString();
    const updateFields = [];
    const updateValues = [];
    for (const [key, value] of Object.entries(updates)) {
        if (key in record && record[key] !== value) {
            updateFields.push(`${key} = ?`);
            updateValues.push(value);
            const oldVal = String(record[key] ?? '');
            const newVal = String(value ?? '');
            await (0, database_1.run)(`INSERT INTO change_history (id, record_id, field_name, old_value, new_value, changed_by, changed_at, change_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), id, key, oldVal, newVal, user.id, now, reason]);
        }
    }
    if (updateFields.length > 0) {
        updateFields.push('updated_at = ?');
        updateValues.push(now);
        updateValues.push(id);
        await (0, database_1.run)(`UPDATE material_records SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
    }
    return getRecordById(id);
}
async function updateRecordStatus(id, status, reason) {
    const user = await (0, userService_1.getCurrentUser)();
    const now = (0, dayjs_1.default)().toISOString();
    const record = await getRecordById(id);
    if (record) {
        await (0, database_1.run)(`INSERT INTO change_history (id, record_id, field_name, old_value, new_value, changed_by, changed_at, change_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), id, 'status', record.status, status, user.id, now, reason]);
    }
    await (0, database_1.run)('UPDATE material_records SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);
}
async function getRecordById(id) {
    return (0, database_1.get)('SELECT * FROM material_records WHERE id = ?', [id]);
}
async function getRecordsByStatus(status) {
    return (0, database_1.all)('SELECT * FROM material_records WHERE status = ? ORDER BY created_at DESC', [status]);
}
async function getAllRecords(limit = 100) {
    return (0, database_1.all)('SELECT * FROM material_records ORDER BY created_at DESC LIMIT ?', [limit]);
}
async function getRecordHistory(recordId) {
    return (0, database_1.all)('SELECT * FROM change_history WHERE record_id = ? ORDER BY changed_at DESC', [recordId]);
}
//# sourceMappingURL=recordService.js.map