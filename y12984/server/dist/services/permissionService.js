"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPermission = createPermission;
exports.getPermissionsByRecord = getPermissionsByRecord;
exports.deletePermission = deletePermission;
const db_1 = require("../db");
const recordService_1 = require("./recordService");
const recordService_2 = require("./recordService");
function createPermission(input) {
    const now = new Date().toISOString();
    const stmt = db_1.db.prepare(`INSERT INTO permissions (record_id, permission_name, grantee, granted_by, granted_at, status)
     VALUES (?, ?, ?, ?, ?, 'active')`);
    const result = stmt.run(input.record_id, input.permission_name, input.grantee, input.granted_by, now);
    checkAndUpdateMigrationStatus(input.record_id);
    return result.lastInsertRowid;
}
function getPermissionsByRecord(recordId) {
    return db_1.db.prepare('SELECT * FROM permissions WHERE record_id = ? ORDER BY granted_at DESC').all(recordId);
}
function deletePermission(id) {
    const perm = db_1.db.prepare('SELECT * FROM permissions WHERE id = ?').get(id);
    db_1.db.prepare('DELETE FROM permissions WHERE id = ?').run(id);
    if (perm) {
        checkAndUpdateMigrationStatus(perm.record_id);
    }
}
function checkAndUpdateMigrationStatus(recordId) {
    const record = (0, recordService_2.getRecord)(recordId);
    if (!record)
        return;
    const permissionMissing = record.anomalies.some((a) => a.anomaly_type === 'permission_missing' && a.status !== 'resolved');
    const hasPermissions = record.permissions.length > 0;
    if (!permissionMissing && hasPermissions && record.migration_status === 'not_started') {
        (0, recordService_1.updateMigrationStatus)(recordId, 'in_progress');
    }
}
