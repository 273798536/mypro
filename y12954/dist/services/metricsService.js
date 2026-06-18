"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplementMetrics = supplementMetrics;
exports.listSupplements = listSupplements;
exports.triggerSchemaRecheckAfterSupplement = triggerSchemaRecheckAfterSupplement;
const database_1 = require("../db/database");
const helpers_1 = require("../utils/helpers");
const runService_1 = require("./runService");
const suggestionService_1 = require("./suggestionService");
const schemaService_1 = require("./schemaService");
const anomalyService_1 = require("./anomalyService");
function supplementMetrics(input) {
    const store = (0, database_1.getStore)();
    const id = (0, helpers_1.generateId)('met');
    const supplementedAt = Date.now();
    const supplement = { ...input, id, supplementedAt };
    store.supplements.push(supplement);
    (0, database_1.saveStore)();
    (0, runService_1.writeAuditLog)({
        entityType: 'METRICS',
        entityId: id,
        action: 'CREATE',
        operator: input.supplementedBy,
        runId: input.runId,
        afterState: supplement,
        note: `补录指标: ${input.metricName}=${input.metricValue} for ${input.suggestionId}`,
    });
    const suggestion = (0, suggestionService_1.getSuggestion)(input.suggestionId);
    if (suggestion) {
        const updates = {};
        if (input.metricName === 'execution_count')
            updates.executionCount = input.metricValue;
        if (input.metricName === 'avg_latency_ms')
            updates.avgLatencyMs = input.metricValue;
        if (input.metricName === 'coverage_rate')
            updates.coverageRate = input.metricValue;
        if (Object.keys(updates).length > 0) {
            (0, suggestionService_1.updateSuggestionMetrics)(input.suggestionId, updates, input.supplementedBy);
        }
        if (input.metricName === 'coverage_rate' && input.metricValue < 0.3) {
            (0, anomalyService_1.createAnomaly)({
                runId: input.runId,
                suggestionId: input.suggestionId,
                type: 'COVERAGE_LOW',
                severity: 'WARNING',
                title: `覆盖率过低: ${suggestion.tableName}.${suggestion.indexName}`,
                description: `索引 [${suggestion.indexName}] 补录后覆盖率仅为 ${(input.metricValue * 100).toFixed(1)}%, 低于阈值 30%。`,
                sourceRef: `${suggestion.sourceSystem}:${suggestion.tableName}.${suggestion.indexName}`,
                nextAction: 'REVIEW_INDEX',
                handlingOpinion: '覆盖率低于30%说明该索引实际使用场景有限。建议: 1) 确认业务场景是否变化 2) 检查查询模式是否仍匹配 3) 考虑删除或重设计索引。',
                materialsRequired: ['近7天查询日志样本', '业务场景说明文档'],
                operator: input.supplementedBy,
            });
        }
    }
    return supplement;
}
function listSupplements(runId, suggestionId) {
    const store = (0, database_1.getStore)();
    let result = store.supplements.filter((s) => s.runId === runId);
    if (suggestionId) {
        result = result.filter((s) => s.suggestionId === suggestionId);
    }
    return result.sort((a, b) => b.supplementedAt - a.supplementedAt);
}
async function triggerSchemaRecheckAfterSupplement(runId, operator) {
    const snapshots = (0, schemaService_1.getSnapshotByRun)(runId);
    const results = [];
    for (const snap of snapshots) {
        const diff = (0, schemaService_1.validateAndDiffSchema)(runId, snap, operator);
        if (diff) {
            const summary = `${snap.databaseName}.${snap.tableName}: ` +
                `+${diff.columnsAdded.length}列 -${diff.columnsRemoved.length}列 ` +
                `~${diff.columnsModified.length}列 +${diff.indexesAdded.length}idx -${diff.indexesRemoved.length}idx`;
            results.push(summary);
        }
    }
    (0, runService_1.writeAuditLog)({
        entityType: 'SCHEMA',
        entityId: runId,
        action: 'UPDATE',
        operator,
        runId,
        note: `指标补录完成后触发 schema 重新对比，共检查 ${snapshots.length} 张表，发现 ${results.length} 张表有变更。`,
        afterState: { recheckResults: results },
    });
    return results;
}
//# sourceMappingURL=metricsService.js.map