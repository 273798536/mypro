"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertRecord = insertRecord;
exports.getRecordsByRun = getRecordsByRun;
exports.getRecord = getRecord;
exports.updateMigrationStatus = updateMigrationStatus;
const db_1 = require("../db");
function insertRecord(input) {
    const now = new Date().toISOString();
    const stmt = db_1.db.prepare(`INSERT INTO report_records
     (run_id, report_name, table_name, column_count, row_count, original_size_mb, compressed_size_mb,
      compression_ratio, source_system, owner, backup_exists, migration_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', ?)`);
    const result = stmt.run(input.run_id, input.report_name, input.table_name, input.column_count, input.row_count, input.original_size_mb, input.compressed_size_mb, input.compression_ratio, input.source_system, input.owner, input.backup_exists ? 1 : 0, now);
    return result.lastInsertRowid;
}
function getRecordsByRun(runId, filters) {
    let sql = 'SELECT * FROM report_records WHERE run_id = ?';
    const params = [runId];
    if (filters?.migrationStatus) {
        sql += ' AND migration_status = ?';
        params.push(filters.migrationStatus);
    }
    sql += ' ORDER BY id DESC';
    const records = db_1.db.prepare(sql).all(...params);
    return records.map((r) => enrichRecord(r, filters)).filter((r) => {
        if (filters?.hasAnomaly === true)
            return r.anomalies.length > 0;
        if (filters?.hasAnomaly === false)
            return r.anomalies.length === 0;
        if (filters?.anomalyType)
            return r.anomalies.some((a) => a.anomaly_type === filters.anomalyType);
        return true;
    });
}
function getRecord(id) {
    const record = db_1.db.prepare('SELECT * FROM report_records WHERE id = ?').get(id);
    if (!record)
        return undefined;
    return enrichRecord(record);
}
function enrichRecord(record, filters) {
    let anomalySql = 'SELECT * FROM anomalies WHERE record_id = ? ORDER BY severity DESC, created_at DESC';
    const anomalies = db_1.db.prepare(anomalySql).all(record.id);
    const normalizedAnomalies = anomalies.map((a) => ({
        ...a,
        backup_exists: Boolean(a.backup_exists)
    }));
    const permissions = db_1.db.prepare('SELECT * FROM permissions WHERE record_id = ? ORDER BY granted_at DESC').all(record.id);
    return {
        ...record,
        backup_exists: Boolean(record.backup_exists),
        anomalies: normalizedAnomalies,
        permissions
    };
}
function updateMigrationStatus(recordId, status) {
    db_1.db.prepare('UPDATE report_records SET migration_status = ? WHERE id = ?').run(status, recordId);
}
