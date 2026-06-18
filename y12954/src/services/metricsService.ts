import { getStore, saveStore } from '../db/database';
import { generateId } from '../utils/helpers';
import { MetricsSupplement } from '../types';
import { writeAuditLog } from './runService';
import { getSuggestion, updateSuggestionMetrics } from './suggestionService';
import { getSnapshotByRun, validateAndDiffSchema } from './schemaService';
import { createAnomaly } from './anomalyService';

export interface SupplementInput {
  runId: string;
  suggestionId: string;
  metricName: string;
  metricValue: number;
  source: string;
  supplementedBy: string;
}

export function supplementMetrics(input: SupplementInput): MetricsSupplement {
  const store = getStore();
  const id = generateId('met');
  const supplementedAt = Date.now();

  const supplement: MetricsSupplement = { ...input, id, supplementedAt };
  store.supplements.push(supplement);
  saveStore();

  writeAuditLog({
    entityType: 'METRICS',
    entityId: id,
    action: 'CREATE',
    operator: input.supplementedBy,
    runId: input.runId,
    afterState: supplement,
    note: `补录指标: ${input.metricName}=${input.metricValue} for ${input.suggestionId}`,
  });

  const suggestion = getSuggestion(input.suggestionId);
  if (suggestion) {
    const updates: Parameters<typeof updateSuggestionMetrics>[1] = {};
    if (input.metricName === 'execution_count') updates.executionCount = input.metricValue;
    if (input.metricName === 'avg_latency_ms') updates.avgLatencyMs = input.metricValue;
    if (input.metricName === 'coverage_rate') updates.coverageRate = input.metricValue;

    if (Object.keys(updates).length > 0) {
      updateSuggestionMetrics(input.suggestionId, updates, input.supplementedBy);
    }

    if (input.metricName === 'coverage_rate' && input.metricValue < 0.3) {
      createAnomaly({
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

export function listSupplements(runId: string, suggestionId?: string): MetricsSupplement[] {
  const store = getStore();
  let result = store.supplements.filter((s) => s.runId === runId);

  if (suggestionId) {
    result = result.filter((s) => s.suggestionId === suggestionId);
  }

  return result.sort((a, b) => b.supplementedAt - a.supplementedAt);
}

export async function triggerSchemaRecheckAfterSupplement(
  runId: string,
  operator: string
): Promise<string[]> {
  const snapshots = getSnapshotByRun(runId);
  const results: string[] = [];

  for (const snap of snapshots) {
    const diff = validateAndDiffSchema(runId, snap, operator);
    if (diff) {
      const summary = `${snap.databaseName}.${snap.tableName}: ` +
        `+${diff.columnsAdded.length}列 -${diff.columnsRemoved.length}列 ` +
        `~${diff.columnsModified.length}列 +${diff.indexesAdded.length}idx -${diff.indexesRemoved.length}idx`;
      results.push(summary);
    }
  }

  writeAuditLog({
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
