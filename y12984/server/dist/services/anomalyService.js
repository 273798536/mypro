"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnomaly = createAnomaly;
exports.getAnomaliesByRecord = getAnomaliesByRecord;
exports.getAnomaly = getAnomaly;
exports.updateAnomaly = updateAnomaly;
exports.deleteAnomaly = deleteAnomaly;
exports.detectAnomaliesForRecord = detectAnomaliesForRecord;
const db_1 = require("../db");
function createAnomaly(input) {
    const now = new Date().toISOString();
    const stmt = db_1.db.prepare(`INSERT INTO anomalies (record_id, anomaly_type, severity, description, next_action, source_details, handling_opinion, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`);
    const result = stmt.run(input.record_id, input.anomaly_type, input.severity, input.description, input.next_action || '待确认', input.source_details || '', input.handling_opinion || '', now, now);
    return result.lastInsertRowid;
}
function getAnomaliesByRecord(recordId) {
    return db_1.db.prepare('SELECT * FROM anomalies WHERE record_id = ? ORDER BY severity DESC, created_at DESC').all(recordId);
}
function getAnomaly(id) {
    return db_1.db.prepare('SELECT * FROM anomalies WHERE id = ?').get(id);
}
function updateAnomaly(id, updates) {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    if (updates.next_action !== undefined) {
        fields.push('next_action = ?');
        values.push(updates.next_action);
    }
    if (updates.handling_opinion !== undefined) {
        fields.push('handling_opinion = ?');
        values.push(updates.handling_opinion);
    }
    if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
    }
    if (updates.source_details !== undefined) {
        fields.push('source_details = ?');
        values.push(updates.source_details);
    }
    if (fields.length === 0)
        return;
    fields.push('updated_at = ?');
    values.push(now, id);
    db_1.db.prepare(`UPDATE anomalies SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}
function deleteAnomaly(id) {
    db_1.db.prepare('DELETE FROM anomalies WHERE id = ?').run(id);
}
function detectAnomaliesForRecord(recordId, data) {
    if (!data.backup_exists) {
        createAnomaly({
            record_id: recordId,
            anomaly_type: 'backup_gap',
            severity: 'error',
            description: `报表「${data.report_name}」未检测到备份记录，存在数据丢失风险`,
            next_action: '补材料',
            source_details: `来源系统: ${data.source_system}，负责人: ${data.owner || '未分配'}。备份校验规则：压缩迁移前必须存在近7天内的全量备份。`,
            handling_opinion: '请BI分析师确认备份策略，如已备份请补充备份凭证（备份文件名、时间、存储位置）；如确实未备份，请协调数据平台补做备份后再继续迁移。'
        });
    }
    if (data.compression_ratio > 0 && data.compression_ratio < 0.3) {
        createAnomaly({
            record_id: recordId,
            anomaly_type: 'compression_abnormal',
            severity: 'warning',
            description: `压缩率仅 ${(data.compression_ratio * 100).toFixed(1)}%，低于预期阈值 30%`,
            next_action: '改口径',
            source_details: `原始压缩率: ${(data.compression_ratio * 100).toFixed(2)}%。通常列存压缩率应在 30%-70% 之间，过低可能说明字段类型设置不合理或存在大量重复数据。`,
            handling_opinion: '建议研发团队检查字段编码方式、排序键、压缩算法设置。如数据本身不可压缩，请在处理意见中标注原因并由BI分析师确认。'
        });
    }
    if (!data.owner) {
        createAnomaly({
            record_id: recordId,
            anomaly_type: 'permission_missing',
            severity: 'warning',
            description: `报表「${data.report_name}」未指定负责人，权限清单不完整`,
            next_action: '补材料',
            source_details: '权限清单校验：每个报表必须指定至少一名负责人作为迁移对接人。',
            handling_opinion: '请BI分析师补充负责人信息，完成权限清单补录后迁移状态将自动更新。'
        });
    }
}
