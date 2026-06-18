import { getStore, saveStore } from '../db/database';
import { generateId } from '../utils/helpers';
import { IndexSuggestion } from '../types';
import { writeAuditLog } from './runService';

export interface IndexSuggestionInput {
  runId: string;
  tableName: string;
  databaseName: string;
  indexName: string;
  indexColumns: string[];
  coveredColumns: string[];
  coverageRate: number;
  executionCount?: number;
  avgLatencyMs?: number;
  isInvalid?: boolean;
  invalidReason?: string;
  sourceSystem: string;
  operator: string;
}

export function createSuggestion(input: IndexSuggestionInput): IndexSuggestion {
  const store = getStore();
  const id = generateId('idx');
  const createdAt = Date.now();

  const suggestion: IndexSuggestion = {
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
  saveStore();

  writeAuditLog({
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

export function getSuggestion(id: string): IndexSuggestion | null {
  const store = getStore();
  const suggestion = store.suggestions.find((s) => s.id === id);
  return suggestion ?? null;
}

export function listSuggestions(runId: string, filters?: {
  onlyInvalid?: boolean;
  minCoverage?: number;
  tableName?: string;
}): IndexSuggestion[] {
  const store = getStore();
  let result = store.suggestions.filter((s) => s.runId === runId);

  if (filters?.onlyInvalid) {
    result = result.filter((s) => s.isInvalid);
  }
  if (filters?.minCoverage !== undefined) {
    result = result.filter((s) => s.coverageRate < filters.minCoverage!);
  }
  if (filters?.tableName) {
    result = result.filter((s) => s.tableName.includes(filters.tableName!));
  }

  return result.sort((a, b) => a.coverageRate - b.coverageRate);
}

export function updateSuggestionMetrics(
  id: string,
  metrics: { executionCount?: number; avgLatencyMs?: number; coverageRate?: number },
  operator: string
): IndexSuggestion | null {
  const store = getStore();
  const before = getSuggestion(id);
  if (!before) return null;

  const hasUpdates =
    metrics.executionCount !== undefined ||
    metrics.avgLatencyMs !== undefined ||
    metrics.coverageRate !== undefined;

  if (!hasUpdates) return before;

  const idx = store.suggestions.findIndex((s) => s.id === id);
  if (idx === -1) return null;

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

  saveStore();

  const after = { ...target };
  writeAuditLog({
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
