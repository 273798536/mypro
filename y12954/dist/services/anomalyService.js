"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEXT_ACTION_LABELS = void 0;
exports.createAnomaly = createAnomaly;
exports.getAnomaly = getAnomaly;
exports.listAnomalies = listAnomalies;
exports.resolveAnomaly = resolveAnomaly;
exports.getAnomalyStats = getAnomalyStats;
exports.buildIndexInvalidAnomaly = buildIndexInvalidAnomaly;
exports.buildLockWaitAnomaly = buildLockWaitAnomaly;
const database_1 = require("../db/database");
const helpers_1 = require("../utils/helpers");
const types_1 = require("../types");
Object.defineProperty(exports, "NEXT_ACTION_LABELS", { enumerable: true, get: function () { return types_1.NEXT_ACTION_LABELS; } });
const runService_1 = require("./runService");
const SEVERITY_ORDER = {
    CRITICAL: 3,
    WARNING: 2,
    INFO: 1,
};
function createAnomaly(input) {
    const store = (0, database_1.getStore)();
    const id = (0, helpers_1.generateId)('anom');
    const now = Date.now();
    const anomaly = {
        id,
        runId: input.runId,
        suggestionId: input.suggestionId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        description: input.description,
        sourceRef: input.sourceRef,
        nextAction: input.nextAction,
        handlingOpinion: input.handlingOpinion,
        materialsRequired: input.materialsRequired,
        isResolved: false,
        createdAt: now,
        updatedAt: now,
    };
    store.anomalies.push(anomaly);
    (0, database_1.saveStore)();
    (0, runService_1.writeAuditLog)({
        entityType: 'ANOMALY',
        entityId: id,
        action: 'CREATE',
        operator: input.operator,
        runId: input.runId,
        afterState: anomaly,
        note: `发现异常 [${input.type}]: ${input.title}`,
    });
    return anomaly;
}
function getAnomaly(id) {
    const store = (0, database_1.getStore)();
    const anomaly = store.anomalies.find((a) => a.id === id);
    return anomaly ?? null;
}
function listAnomalies(filters = {}) {
    const store = (0, database_1.getStore)();
    let results = [...store.anomalies];
    if (filters.runId) {
        results = results.filter((a) => a.runId === filters.runId);
    }
    if (filters.type) {
        results = results.filter((a) => a.type === filters.type);
    }
    if (filters.severity) {
        results = results.filter((a) => a.severity === filters.severity);
    }
    if (filters.nextAction) {
        results = results.filter((a) => a.nextAction === filters.nextAction);
    }
    if (filters.isResolved !== undefined) {
        results = results.filter((a) => a.isResolved === filters.isResolved);
    }
    if (filters.suggestionId) {
        results = results.filter((a) => a.suggestionId === filters.suggestionId);
    }
    results.sort((a, b) => {
        const severityDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
        if (severityDiff !== 0)
            return severityDiff;
        return b.createdAt - a.createdAt;
    });
    return results;
}
function resolveAnomaly(id, operator, resolutionNote) {
    const store = (0, database_1.getStore)();
    const before = getAnomaly(id);
    if (!before)
        return null;
    const now = Date.now();
    const index = store.anomalies.findIndex((a) => a.id === id);
    if (index === -1)
        return null;
    store.anomalies[index] = {
        ...store.anomalies[index],
        isResolved: true,
        resolvedAt: now,
        resolvedBy: operator,
        resolutionNote,
        updatedAt: now,
    };
    (0, database_1.saveStore)();
    const after = getAnomaly(id);
    if (after) {
        (0, runService_1.writeAuditLog)({
            entityType: 'ANOMALY',
            entityId: id,
            action: 'RESOLVE',
            operator,
            runId: before.runId,
            beforeState: before,
            afterState: after,
            note: `异常已解决: ${resolutionNote}`,
        });
    }
    return after;
}
function getAnomalyStats(runId) {
    const all = listAnomalies({ runId });
    const stats = {
        total: all.length,
        bySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 },
        byAction: {
            PROVIDE_MATERIALS: 0,
            FIX_CALIBRATION: 0,
            REVIEW_INDEX: 0,
            NO_ACTION: 0,
        },
        byType: {
            INDEX_INVALID: 0,
            LOCK_WAIT_TIMEOUT: 0,
            SCHEMA_MISMATCH: 0,
            MISSING_METRICS: 0,
            COVERAGE_LOW: 0,
            DUPLICATE_INDEX: 0,
        },
        resolved: 0,
        unresolved: 0,
    };
    for (const a of all) {
        stats.bySeverity[a.severity]++;
        stats.byAction[a.nextAction]++;
        stats.byType[a.type]++;
        if (a.isResolved)
            stats.resolved++;
        else
            stats.unresolved++;
    }
    return stats;
}
function buildIndexInvalidAnomaly(runId, suggestionId, tableName, indexName, invalidReason, sourceSystem, operator) {
    return createAnomaly({
        runId,
        suggestionId,
        type: 'INDEX_INVALID',
        severity: 'CRITICAL',
        title: `索引失效: ${tableName}.${indexName}`,
        description: `索引 [${indexName}] 在表 [${tableName}] 中已失效。原因: ${invalidReason}。该索引建议将被拦截，需研发团队确认后决定是否重新设计。`,
        sourceRef: `${sourceSystem}:${tableName}.${indexName}`,
        nextAction: 'REVIEW_INDEX',
        handlingOpinion: `索引失效已被自动拦截。请研发团队检查: 1) 索引列是否仍存在 2) 数据分布是否发生显著变化 3) 是否有替代索引方案。确认后决定删除或重建索引。`,
        materialsRequired: [
            '索引历史执行统计（近30天）',
            '表结构变更记录',
            '数据分布直方图',
            '相关慢查询日志',
        ],
        operator,
    });
}
function buildLockWaitAnomaly(runId, tableName, waitSeconds, threshold, sourceSystem, operator, suggestionId) {
    return createAnomaly({
        runId,
        suggestionId,
        type: 'LOCK_WAIT_TIMEOUT',
        severity: 'CRITICAL',
        title: `锁等待超时: ${tableName} (${waitSeconds}s)`,
        description: `表 [${tableName}] 在索引分析过程中出现锁等待 ${waitSeconds}s，超过阈值 ${threshold}s。数据采集可能不完整，结果准确性受影响。`,
        sourceRef: `${sourceSystem}:lock-monitor:${tableName}`,
        nextAction: 'PROVIDE_MATERIALS',
        handlingOpinion: `锁等待导致采样数据不完整。需要补充: 1) 低峰时段重新采集的数据 2) 锁等待期间的事务日志 3) 表级锁冲突分析报告。参考上次审计返工记录（run_id 关联历史数据），避免重复问题。`,
        materialsRequired: [
            '低峰时段索引采样数据',
            '锁等待事务日志',
            '表级锁冲突分析',
        ],
        operator,
    });
}
//# sourceMappingURL=anomalyService.js.map