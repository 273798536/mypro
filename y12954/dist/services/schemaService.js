"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSchemaSnapshot = saveSchemaSnapshot;
exports.getLatestSnapshot = getLatestSnapshot;
exports.getSnapshotByRun = getSnapshotByRun;
exports.compareSchemas = compareSchemas;
exports.hasSignificantChanges = hasSignificantChanges;
exports.validateAndDiffSchema = validateAndDiffSchema;
const database_1 = require("../db/database");
const helpers_1 = require("../utils/helpers");
const runService_1 = require("./runService");
const anomalyService_1 = require("./anomalyService");
function saveSchemaSnapshot(input) {
    const store = (0, database_1.getStore)();
    const id = (0, helpers_1.generateId)('sch');
    const capturedAt = Date.now();
    const schemaHash = (0, helpers_1.hashSchema)({
        columns: input.columnDefinitions,
        indexes: input.indexDefinitions,
    });
    const snapshot = {
        id,
        runId: input.runId,
        tableName: input.tableName,
        databaseName: input.databaseName,
        schemaHash,
        columnDefinitions: input.columnDefinitions,
        indexDefinitions: input.indexDefinitions,
        capturedAt,
    };
    store.schemas.push(snapshot);
    (0, database_1.saveStore)();
    (0, runService_1.writeAuditLog)({
        entityType: 'SCHEMA',
        entityId: id,
        action: 'CREATE',
        operator: input.operator,
        runId: input.runId,
        afterState: { ...snapshot, schemaHash },
        note: `保存 schema 快照: ${input.databaseName}.${input.tableName}`,
    });
    return snapshot;
}
function getLatestSnapshot(databaseName, tableName, beforeRunId) {
    const store = (0, database_1.getStore)();
    let filtered = store.schemas.filter((s) => s.databaseName === databaseName && s.tableName === tableName);
    if (beforeRunId) {
        filtered = filtered.filter((s) => s.runId !== beforeRunId);
    }
    const sorted = filtered.sort((a, b) => b.capturedAt - a.capturedAt);
    return sorted[0] ?? null;
}
function getSnapshotByRun(runId, databaseName, tableName) {
    const store = (0, database_1.getStore)();
    let filtered = store.schemas.filter((s) => s.runId === runId);
    if (databaseName) {
        filtered = filtered.filter((s) => s.databaseName === databaseName);
    }
    if (tableName) {
        filtered = filtered.filter((s) => s.tableName === tableName);
    }
    return filtered;
}
function compareSchemas(oldSnap, newSnap) {
    const diff = {
        tableName: newSnap.tableName,
        databaseName: newSnap.databaseName,
        columnsAdded: [],
        columnsRemoved: [],
        columnsModified: [],
        indexesAdded: [],
        indexesRemoved: [],
    };
    const oldCols = new Map(oldSnap.columnDefinitions.map((c) => [c.name, c]));
    const newCols = new Map(newSnap.columnDefinitions.map((c) => [c.name, c]));
    for (const [name, col] of newCols) {
        if (!oldCols.has(name)) {
            diff.columnsAdded.push(col);
        }
        else {
            const old = oldCols.get(name);
            if (old.type !== col.type || old.nullable !== col.nullable || old.defaultValue !== col.defaultValue) {
                diff.columnsModified.push({ old, new: col });
            }
        }
    }
    for (const [name, col] of oldCols) {
        if (!newCols.has(name)) {
            diff.columnsRemoved.push(col);
        }
    }
    const oldIdxKey = (idx) => `${idx.name}:${idx.columns.sort().join(',')}`;
    const oldIdxs = new Map(oldSnap.indexDefinitions.map((i) => [oldIdxKey(i), i]));
    const newIdxs = new Map(newSnap.indexDefinitions.map((i) => [oldIdxKey(i), i]));
    for (const [key, idx] of newIdxs) {
        if (!oldIdxs.has(key))
            diff.indexesAdded.push(idx);
    }
    for (const [key, idx] of oldIdxs) {
        if (!newIdxs.has(key))
            diff.indexesRemoved.push(idx);
    }
    return diff;
}
function hasSignificantChanges(diff) {
    return (diff.columnsAdded.length > 0 ||
        diff.columnsRemoved.length > 0 ||
        diff.columnsModified.length > 0 ||
        diff.indexesRemoved.length > 0);
}
function validateAndDiffSchema(runId, newSnapshot, operator) {
    const previous = getLatestSnapshot(newSnapshot.databaseName, newSnapshot.tableName, runId);
    if (!previous)
        return null;
    const diff = compareSchemas(previous, newSnapshot);
    (0, runService_1.writeAuditLog)({
        entityType: 'SCHEMA',
        entityId: newSnapshot.id,
        action: 'UPDATE',
        operator,
        runId,
        beforeState: previous,
        afterState: { ...newSnapshot, diff },
        note: hasSignificantChanges(diff)
            ? `检测到 schema 重大变更: ${formatDiffSummary(diff)}`
            : 'schema 无重大变更',
    });
    if (hasSignificantChanges(diff)) {
        (0, anomalyService_1.createAnomaly)({
            runId,
            type: 'SCHEMA_MISMATCH',
            severity: 'WARNING',
            title: `Schema 变更: ${newSnapshot.databaseName}.${newSnapshot.tableName}`,
            description: `检测到表结构发生变化: ${formatDiffDescription(diff)}。相关索引建议需重新评估覆盖性。`,
            sourceRef: `schema:${newSnapshot.databaseName}.${newSnapshot.tableName}`,
            nextAction: 'FIX_CALIBRATION',
            handlingOpinion: `Schema 变更后需重新校准索引覆盖分析。${formatDiffHandling(diff)}已将此异常标记为"需改口径"，请在指标补录完成后触发重新对比。`,
            operator,
        });
    }
    return diff;
}
function formatDiffSummary(diff) {
    const parts = [];
    if (diff.columnsAdded.length)
        parts.push(`+${diff.columnsAdded.length}列`);
    if (diff.columnsRemoved.length)
        parts.push(`-${diff.columnsRemoved.length}列`);
    if (diff.columnsModified.length)
        parts.push(`~${diff.columnsModified.length}列变更`);
    if (diff.indexesAdded.length)
        parts.push(`+${diff.indexesAdded.length}索引`);
    if (diff.indexesRemoved.length)
        parts.push(`-${diff.indexesRemoved.length}索引`);
    return parts.join(', ') || '无变更';
}
function formatDiffDescription(diff) {
    const parts = [];
    if (diff.columnsAdded.length)
        parts.push(`新增列: ${diff.columnsAdded.map((c) => c.name).join(', ')}`);
    if (diff.columnsRemoved.length)
        parts.push(`删除列: ${diff.columnsRemoved.map((c) => c.name).join(', ')}`);
    if (diff.columnsModified.length)
        parts.push(`修改列: ${diff.columnsModified.map((m) => `${m.old.name}(${m.old.type}→${m.new.type})`).join(', ')}`);
    if (diff.indexesAdded.length)
        parts.push(`新增索引: ${diff.indexesAdded.map((i) => i.name).join(', ')}`);
    if (diff.indexesRemoved.length)
        parts.push(`删除索引: ${diff.indexesRemoved.map((i) => i.name).join(', ')}`);
    return parts.join('; ');
}
function formatDiffHandling(diff) {
    const tips = [];
    if (diff.columnsRemoved.length)
        tips.push('删除列可能导致索引覆盖失效，需检查相关索引。');
    if (diff.columnsModified.length)
        tips.push('列类型变更影响索引选择性，请重新评估基数。');
    if (diff.indexesRemoved.length)
        tips.push('已删除的索引需从建议列表中移除并记录原因。');
    return tips.join(' ');
}
//# sourceMappingURL=schemaService.js.map