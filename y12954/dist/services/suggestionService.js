"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuggestion = createSuggestion;
exports.getSuggestion = getSuggestion;
exports.listSuggestions = listSuggestions;
exports.updateSuggestionMetrics = updateSuggestionMetrics;
const database_1 = require("../db/database");
const helpers_1 = require("../utils/helpers");
const runService_1 = require("./runService");
function createSuggestion(input) {
    const store = (0, database_1.getStore)();
    const id = (0, helpers_1.generateId)('idx');
    const createdAt = Date.now();
    const suggestion = {
        id,
        runId: input.runId,
        tableName: input.tableName,
        databaseName: input.databaseName,
        indexName: input.indexName,
        indexColumns: input.indexColumns,
        coveredColumns: input.coveredColumns,
        coverageRate: input.coverageRate,
        executionCount: input.executionCount ?? 0,
        avgLatencyMs: input.avgLatencyMs ?? 0,
        isInvalid: input.isInvalid ?? false,
        invalidReason: input.invalidReason,
        sourceSystem: input.sourceSystem,
        createdAt,
    };
    store.suggestions.push(suggestion);
    (0, database_1.saveStore)();
    (0, runService_1.writeAuditLog)({
        entityType: 'SUGGESTION',
        entityId: id,
        action: 'CREATE',
        operator: input.operator,
        runId: input.runId,
        afterState: suggestion,
        note: `创建索引建议: ${input.databaseName}.${input.tableName}.${input.indexName}`,
    });
    return suggestion;
}
function getSuggestion(id) {
    const store = (0, database_1.getStore)();
    const suggestion = store.suggestions.find((s) => s.id === id);
    return suggestion ?? null;
}
function listSuggestions(runId, filters) {
    const store = (0, database_1.getStore)();
    let result = store.suggestions.filter((s) => s.runId === runId);
    if (filters?.onlyInvalid) {
        result = result.filter((s) => s.isInvalid);
    }
    if (filters?.minCoverage !== undefined) {
        result = result.filter((s) => s.coverageRate < filters.minCoverage);
    }
    if (filters?.tableName) {
        result = result.filter((s) => s.tableName.includes(filters.tableName));
    }
    return result.sort((a, b) => a.coverageRate - b.coverageRate);
}
function updateSuggestionMetrics(id, metrics, operator) {
    const store = (0, database_1.getStore)();
    const before = getSuggestion(id);
    if (!before)
        return null;
    const hasUpdates = metrics.executionCount !== undefined ||
        metrics.avgLatencyMs !== undefined ||
        metrics.coverageRate !== undefined;
    if (!hasUpdates)
        return before;
    const idx = store.suggestions.findIndex((s) => s.id === id);
    if (idx === -1)
        return null;
    const target = store.suggestions[idx];
    if (metrics.executionCount !== undefined) {
        target.executionCount = metrics.executionCount;
    }
    if (metrics.avgLatencyMs !== undefined) {
        target.avgLatencyMs = metrics.avgLatencyMs;
    }
    if (metrics.coverageRate !== undefined) {
        target.coverageRate = metrics.coverageRate;
    }
    (0, database_1.saveStore)();
    const after = { ...target };
    (0, runService_1.writeAuditLog)({
        entityType: 'SUGGESTION',
        entityId: id,
        action: 'UPDATE',
        operator,
        runId: before.runId,
        beforeState: before,
        afterState: after,
        note: '更新索引指标数据',
    });
    return after;
}
//# sourceMappingURL=suggestionService.js.map