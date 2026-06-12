"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaterialsByRecordId = getMaterialsByRecordId;
exports.getMaterialById = getMaterialById;
exports.createMaterial = createMaterial;
exports.updateMaterial = updateMaterial;
exports.deleteMaterial = deleteMaterial;
const database_1 = require("../database");
const utils_1 = require("@shared/utils");
const historyService_1 = require("./historyService");
const toMaterial = (row) => ({
    id: row.id,
    recordId: row.record_id,
    version: row.version,
    materialType: row.material_type,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    remark: row.remark,
    isCaliberModified: row.is_caliber_modified === 1,
    modifiedDescription: row.modified_description,
    createdAt: row.created_at,
    createdBy: row.created_by
});
async function getMaterialsByRecordId(recordId) {
    const rows = await (0, database_1.runQuery)('SELECT * FROM material_versions WHERE record_id = ? ORDER BY version DESC, created_at DESC', [recordId]);
    return rows.map(toMaterial);
}
async function getMaterialById(id) {
    const row = await (0, database_1.runQueryOne)('SELECT * FROM material_versions WHERE id = ?', [id]);
    return row ? toMaterial(row) : undefined;
}
async function createMaterial(data, userId) {
    const id = (0, utils_1.generateId)();
    const now = new Date().toISOString();
    const maxVersionRow = await (0, database_1.runQueryOne)('SELECT COALESCE(MAX(version), 0) as max_version FROM material_versions WHERE record_id = ? AND material_type = ?', [data.recordId, data.materialType]);
    const version = (maxVersionRow?.max_version || 0) + 1;
    await (0, database_1.runExecute)(`INSERT INTO material_versions 
     (id, record_id, version, material_type, file_name, file_url, file_size, 
      remark, is_caliber_modified, modified_description, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.recordId, version, data.materialType, data.fileName, data.fileUrl,
        data.fileSize, data.remark, data.isCaliberModified ? 1 : 0,
        data.modifiedDescription, now, userId]);
    if (data.isCaliberModified) {
        await (0, historyService_1.createHistoryChange)({
            recordId: data.recordId,
            fieldName: `material_${data.materialType}`,
            changeType: 'update',
            changedBy: userId,
            remark: `上传${data.materialType}材料，口径已修改：${data.modifiedDescription || data.remark || ''}`
        });
    }
    const material = await getMaterialById(id);
    if (!material)
        throw new Error('Failed to create material');
    return material;
}
async function updateMaterial(id, data, userId) {
    const existing = await getMaterialById(id);
    if (!existing)
        return undefined;
    const updates = [];
    const params = [];
    if (data.remark !== undefined) {
        updates.push('remark = ?');
        params.push(data.remark);
    }
    if (data.isCaliberModified !== undefined) {
        updates.push('is_caliber_modified = ?');
        params.push(data.isCaliberModified ? 1 : 0);
    }
    if (data.modifiedDescription !== undefined) {
        updates.push('modified_description = ?');
        params.push(data.modifiedDescription);
    }
    params.push(id);
    await (0, database_1.runExecute)(`UPDATE material_versions SET ${updates.join(', ')} WHERE id = ?`, params);
    if (data.isCaliberModified && !existing.isCaliberModified) {
        await (0, historyService_1.createHistoryChange)({
            recordId: existing.recordId,
            fieldName: `material_${existing.materialType}`,
            oldValue: '口径未修改',
            newValue: '口径已修改',
            changeType: 'update',
            changedBy: userId,
            remark: data.modifiedDescription
        });
    }
    return getMaterialById(id);
}
async function deleteMaterial(id) {
    const result = await (0, database_1.runExecute)('DELETE FROM material_versions WHERE id = ?', [id]);
    return result.changes > 0;
}
