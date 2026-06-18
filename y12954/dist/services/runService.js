"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRun = createRun;
exports.updateRunStatus = updateRunStatus;
exports.getRun = getRun;
exports.listRuns = listRuns;
exports.writeAuditLog = writeAuditLog;
exports.getAuditLogs = getAuditLogs;
const database_1 = require("../db/database");
const helpers_1 = require("../utils/helpers");
function createRun(context) {
    const store = (0, database_1.getStore)();
    const runId = (0, helpers_1.generateId)('run');
    const timestamp = context.timestamp ?? Date.now();
    const newRun = {
        ...context,
        runId,
        timestamp,
        status: 'PENDING',
    };
    store.runs.push(newRun);
    (0, database_1.saveStore)();
    writeAuditLog({
        entityType: 'RUN',
        entityId: runId,
        action: 'CREATE',
        operator: context.operator,
        note: context.description ?? `创建运行: ${context.source}`,
        runId,
        afterState: { status: 'PENDING', ...context },
    });
    return { ...context, runId, timestamp };
}
function updateRunStatus(runId, status, operator) {
    const store = (0, database_1.getStore)();
    const run = store.runs.find((r) => r.runId === runId);
    const before = run ? { status: run.status } : undefined;
    if (run) {
        run.status = status;
        (0, database_1.saveStore)();
    }
    writeAuditLog({
        entityType: 'RUN',
        entityId: runId,
        action: 'UPDATE',
        operator,
        runId,
        beforeState: before,
        afterState: { status },
        note: `运行状态更新为 ${status}`,
    });
}
function getRun(runId) {
    const store = (0, database_1.getStore)();
    const run = store.runs.find((r) => r.runId === runId);
    return run ?? null;
}
function listRuns(limit = 50) {
    const store = (0, database_1.getStore)();
    return [...store.runs]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
}
function writeAuditLog(entry) {
    const store = (0, database_1.getStore)();
    const id = (0, helpers_1.generateId)('audit');
    const timestamp = entry.timestamp ?? Date.now();
    const newEntry = {
        id,
        runId: entry.runId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        operator: entry.operator,
        beforeState: entry.beforeState,
        afterState: entry.afterState,
        note: entry.note,
        timestamp,
    };
    store.auditLogs.push(newEntry);
    (0, database_1.saveStore)();
    return id;
}
function getAuditLogs(runId, entityType) {
    const store = (0, database_1.getStore)();
    let logs = store.auditLogs.filter((log) => log.runId === runId);
    if (entityType) {
        logs = logs.filter((log) => log.entityType === entityType);
    }
    return logs.sort((a, b) => a.timestamp - b.timestamp);
}
//# sourceMappingURL=runService.js.map