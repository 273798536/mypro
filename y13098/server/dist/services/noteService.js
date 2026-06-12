"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotesByRecordId = getNotesByRecordId;
exports.getNoteById = getNoteById;
exports.createNote = createNote;
exports.updateNote = updateNote;
exports.deleteNote = deleteNote;
const database_1 = require("../database");
const utils_1 = require("@shared/utils");
const historyService_1 = require("./historyService");
const toNote = (row) => ({
    id: row.id,
    recordId: row.record_id,
    content: row.content,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at
});
async function getNotesByRecordId(recordId) {
    const rows = await (0, database_1.runQuery)('SELECT * FROM manual_notes WHERE record_id = ? ORDER BY created_at DESC', [recordId]);
    return rows.map(toNote);
}
async function getNoteById(id) {
    const row = await (0, database_1.runQueryOne)('SELECT * FROM manual_notes WHERE id = ?', [id]);
    return row ? toNote(row) : undefined;
}
async function createNote(data, userId) {
    const id = (0, utils_1.generateId)();
    const now = new Date().toISOString();
    await (0, database_1.runExecute)(`INSERT INTO manual_notes 
     (id, record_id, content, created_at, created_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`, [id, data.recordId, data.content, now, userId, now]);
    await (0, historyService_1.createHistoryChange)({
        recordId: data.recordId,
        fieldName: 'manual_note',
        changeType: 'update',
        changedBy: userId,
        remark: '添加人工备注'
    });
    const note = await getNoteById(id);
    if (!note)
        throw new Error('Failed to create note');
    return note;
}
async function updateNote(id, content, userId) {
    const existing = await getNoteById(id);
    if (!existing)
        return undefined;
    await (0, database_1.runExecute)('UPDATE manual_notes SET content = ?, updated_at = ? WHERE id = ?', [content, new Date().toISOString(), id]);
    await (0, historyService_1.createHistoryChange)({
        recordId: existing.recordId,
        fieldName: 'manual_note',
        oldValue: existing.content,
        newValue: content,
        changeType: 'update',
        changedBy: userId,
        remark: '更新人工备注'
    });
    return getNoteById(id);
}
async function deleteNote(id) {
    const result = await (0, database_1.runExecute)('DELETE FROM manual_notes WHERE id = ?', [id]);
    return result.changes > 0;
}
