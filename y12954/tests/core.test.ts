import path from 'path';
import fs from 'fs';
import os from 'os';
import { closeDb, resetStoreForTest } from '../src/db/database';
import { createRun, updateRunStatus, getRun, listRuns, getAuditLogs, writeAuditLog } from '../src/services/runService';
import { createSuggestion, getSuggestion, listSuggestions, updateSuggestionMetrics } from '../src/services/suggestionService';
import {
  createAnomaly,
  getAnomaly,
  listAnomalies,
  resolveAnomaly,
  getAnomalyStats,
  buildIndexInvalidAnomaly,
  buildLockWaitAnomaly,
} from '../src/services/anomalyService';
import {
  saveSchemaSnapshot,
  getLatestSnapshot,
  compareSchemas,
  validateAndDiffSchema,
  hasSignificantChanges,
} from '../src/services/schemaService';
import {
  importIndexData,
  generateSampleCsv,
  generateSampleSchemaSnapshots,
} from '../src/services/importService';
import { exportRunReport, getExportHistory } from '../src/services/exportService';
import { supplementMetrics, listSupplements, triggerSchemaRecheckAfterSupplement } from '../src/services/metricsService';
import { generateRunFileName, formatTimestamp, hashSchema, generateId } from '../src/utils/helpers';
import { NEXT_ACTION_LABELS } from '../src/types';

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'index-coverage-test-'));
  process.chdir(tempDir);
  resetStoreForTest();
});

afterAll(() => {
  closeDb();
});

describe('Utils', () => {
  test('generateId 生成带前缀的唯一ID', () => {
    const id1 = generateId('test');
    const id2 = generateId('test');
    expect(id1).toMatch(/^test_[a-z0-9]+_[a-f0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  test('formatTimestamp 格式化正确', () => {
    const ts = new Date('2025-01-15T10:30:00').getTime();
    expect(formatTimestamp(ts)).toBe('2025-01-15 10:30:00');
  });

  test('generateRunFileName 包含时间戳和短ID', () => {
    const ts = new Date('2025-06-18T14:23:00').getTime();
    const name = generateRunFileName('run_abc123_def456', ts, 'xlsx');
    expect(name).toMatch(/^index_coverage_20250618_1423_[a-f0-9]+\.xlsx$/);
  });

  test('hashSchema 相同输入相同输出', () => {
    const obj = { a: 1, b: 'test' };
    expect(hashSchema(obj)).toBe(hashSchema(obj));
    expect(hashSchema(obj)).not.toBe(hashSchema({ a: 2 }));
  });
});

describe('Run & Audit Service', () => {
  test('createRun 创建运行并记录审计', () => {
    const run = createRun({ operator: 'tester', source: 'unit_test', description: '测试运行' });
    expect(run.runId).toBeDefined();
    expect(run.operator).toBe('tester');
    expect(run.timestamp).toBeGreaterThan(0);

    const fetched = getRun(run.runId);
    expect(fetched).not.toBeNull();
    expect(fetched!.operator).toBe('tester');
    expect(fetched!.status).toBe('PENDING');
  });

  test('updateRunStatus 更新状态', () => {
    const run = createRun({ operator: 'tester', source: 'unit_test' });
    updateRunStatus(run.runId, 'COMPLETED', 'tester');
    const updated = getRun(run.runId);
    expect(updated!.status).toBe('COMPLETED');
  });

  test('listRuns 返回最近运行', () => {
    createRun({ operator: 'tester', source: 'list_test' });
    createRun({ operator: 'tester', source: 'list_test_2' });
    const runs = listRuns(5);
    expect(runs.length).toBeGreaterThanOrEqual(2);
  });

  test('writeAuditLog and getAuditLogs 工作正常', () => {
    const run = createRun({ operator: 'tester', source: 'audit_test' });
    writeAuditLog({
      runId: run.runId,
      entityType: 'ANOMALY',
      entityId: 'anom_123',
      action: 'CREATE',
      operator: 'tester',
      note: '测试日志',
    });
    const logs = getAuditLogs(run.runId);
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs.find((l) => l.note === '测试日志')).toBeDefined();
  });
});

describe('Suggestion Service', () => {
  test('createSuggestion and getSuggestion', () => {
    const run = createRun({ operator: 'tester', source: 'sug_test' });
    const sug = createSuggestion({
      runId: run.runId,
      tableName: 'users',
      databaseName: 'app_db',
      indexName: 'idx_user_email',
      indexColumns: ['email'],
      coveredColumns: ['id', 'email', 'status'],
      coverageRate: 0.85,
      executionCount: 10000,
      avgLatencyMs: 5.2,
      isInvalid: false,
      sourceSystem: 'mysql_prod',
      operator: 'tester',
    });
    const fetched = getSuggestion(sug.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.indexName).toBe('idx_user_email');
    expect(fetched!.coverageRate).toBe(0.85);
    expect(fetched!.indexColumns).toEqual(['email']);
  });

  test('listSuggestions with filters', () => {
    const run = createRun({ operator: 'tester', source: 'filter_test' });
    createSuggestion({
      runId: run.runId,
      tableName: 'orders',
      databaseName: 'trade_db',
      indexName: 'idx_ok',
      indexColumns: ['customer_id'],
      coveredColumns: ['id'],
      coverageRate: 0.9,
      sourceSystem: 'mysql',
      operator: 'tester',
    });
    createSuggestion({
      runId: run.runId,
      tableName: 'orders',
      databaseName: 'trade_db',
      indexName: 'idx_invalid',
      indexColumns: ['col_removed'],
      coveredColumns: ['id'],
      coverageRate: 0.1,
      isInvalid: true,
      invalidReason: '列被删除',
      sourceSystem: 'mysql',
      operator: 'tester',
    });

    const invalid = listSuggestions(run.runId, { onlyInvalid: true });
    expect(invalid.length).toBe(1);
    expect(invalid[0].indexName).toBe('idx_invalid');

    const lowCov = listSuggestions(run.runId, { minCoverage: 0.5 });
    expect(lowCov.length).toBe(1);

    const byTable = listSuggestions(run.runId, { tableName: 'orders' });
    expect(byTable.length).toBe(2);
  });

  test('updateSuggestionMetrics 更新指标', () => {
    const run = createRun({ operator: 'tester', source: 'update_test' });
    const sug = createSuggestion({
      runId: run.runId,
      tableName: 't',
      databaseName: 'd',
      indexName: 'idx',
      indexColumns: ['a'],
      coveredColumns: ['a'],
      coverageRate: 0.5,
      sourceSystem: 's',
      operator: 'tester',
    });
    const updated = updateSuggestionMetrics(sug.id, { coverageRate: 0.95, executionCount: 500 }, 'tester');
    expect(updated).not.toBeNull();
    expect(updated!.coverageRate).toBe(0.95);
    expect(updated!.executionCount).toBe(500);
  });
});

describe('Anomaly Service', () => {
  test('createAnomaly full lifecycle', () => {
    const run = createRun({ operator: 'tester', source: 'anom_test' });
    const sug = createSuggestion({
      runId: run.runId,
      tableName: 'users',
      databaseName: 'db',
      indexName: 'idx_bad',
      indexColumns: ['x'],
      coveredColumns: ['x'],
      coverageRate: 0.1,
      sourceSystem: 'mysql',
      operator: 'tester',
    });

    const anom = createAnomaly({
      runId: run.runId,
      suggestionId: sug.id,
      type: 'COVERAGE_LOW',
      severity: 'WARNING',
      title: '覆盖率过低',
      description: '覆盖率仅10%',
      sourceRef: 'mysql:users.idx_bad',
      nextAction: 'PROVIDE_MATERIALS',
      handlingOpinion: '请补充业务说明',
      materialsRequired: ['SQL样例'],
      operator: 'tester',
    });

    const fetched = getAnomaly(anom.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.nextAction).toBe('PROVIDE_MATERIALS');
    expect(fetched!.isResolved).toBe(false);
    expect(fetched!.materialsRequired).toEqual(['SQL样例']);

    const resolved = resolveAnomaly(anom.id, 'tester', '已确认，删除索引');
    expect(resolved!.isResolved).toBe(true);
    expect(resolved!.resolutionNote).toBe('已确认，删除索引');
  });

  test('getAnomalyStats 统计正确', () => {
    const run = createRun({ operator: 'tester', source: 'stats_test' });
    const sug = createSuggestion({
      runId: run.runId,
      tableName: 't',
      databaseName: 'd',
      indexName: 'i',
      indexColumns: ['a'],
      coveredColumns: ['a'],
      coverageRate: 0.1,
      sourceSystem: 's',
      operator: 'tester',
    });

    buildIndexInvalidAnomaly(run.runId, sug.id, 't', 'i', '索引损坏', 'src', 'tester');
    buildLockWaitAnomaly(run.runId, 't', 60, 30, 'src', 'tester', sug.id);

    const stats = getAnomalyStats(run.runId);
    expect(stats.bySeverity.CRITICAL).toBeGreaterThanOrEqual(1);
    expect(stats.byType.INDEX_INVALID).toBe(1);
    expect(stats.byType.LOCK_WAIT_TIMEOUT).toBe(1);
    expect(stats.byAction.REVIEW_INDEX).toBeGreaterThanOrEqual(1);
  });

  test('listAnomalies 多条件筛选', () => {
    const run = createRun({ operator: 'tester', source: 'filter2_test' });
    const sug = createSuggestion({
      runId: run.runId,
      tableName: 't',
      databaseName: 'd',
      indexName: 'i',
      indexColumns: ['a'],
      coveredColumns: ['a'],
      coverageRate: 0.1,
      sourceSystem: 's',
      operator: 'tester',
    });

    buildIndexInvalidAnomaly(run.runId, sug.id, 't', 'i', '坏', 'src', 'tester');
    const cov = createAnomaly({
      runId: run.runId,
      type: 'COVERAGE_LOW',
      severity: 'WARNING',
      title: 'c',
      description: 'd',
      sourceRef: 'r',
      nextAction: 'PROVIDE_MATERIALS',
      handlingOpinion: 'h',
      operator: 'tester',
    });
    resolveAnomaly(cov.id, 'tester', 'done');

    const unresolved = listAnomalies({ runId: run.runId, isResolved: false });
    expect(unresolved.length).toBeGreaterThanOrEqual(1);
    expect(unresolved.find((a) => a.id === cov.id)).toBeUndefined();

    const byType = listAnomalies({ runId: run.runId, type: 'INDEX_INVALID' });
    expect(byType.length).toBe(1);
  });

  test('buildIndexInvalidAnomaly 包含完整拦截原因', () => {
    const run = createRun({ operator: 'tester', source: 'invalid_test' });
    const sug = createSuggestion({
      runId: run.runId,
      tableName: 'logs',
      databaseName: 'log_db',
      indexName: 'idx_log_old_id',
      indexColumns: ['old_id'],
      coveredColumns: ['id'],
      coverageRate: 0,
      isInvalid: true,
      invalidReason: '列old_id已被删除',
      sourceSystem: 'mysql',
      operator: 'tester',
    });
    const anom = buildIndexInvalidAnomaly(
      run.runId,
      sug.id,
      'logs',
      'idx_log_old_id',
      '列old_id已被删除',
      'mysql_prod',
      'tester'
    );
    expect(anom.type).toBe('INDEX_INVALID');
    expect(anom.severity).toBe('CRITICAL');
    expect(anom.nextAction).toBe('REVIEW_INDEX');
    expect(anom.description).toContain('已失效');
    expect(anom.handlingOpinion).toContain('自动拦截');
    expect(anom.materialsRequired!.length).toBeGreaterThan(2);
  });

  test('NEXT_ACTION_LABELS 中文标签正确', () => {
    expect(NEXT_ACTION_LABELS.PROVIDE_MATERIALS).toBe('需补材料');
    expect(NEXT_ACTION_LABELS.FIX_CALIBRATION).toBe('需改口径');
    expect(NEXT_ACTION_LABELS.REVIEW_INDEX).toBe('需复核索引');
    expect(NEXT_ACTION_LABELS.NO_ACTION).toBe('无需处理');
  });
});

describe('Schema Service', () => {
  test('save and compare schemas', () => {
    const run = createRun({ operator: 'tester', source: 'schema_test' });

    const snap1 = saveSchemaSnapshot({
      runId: run.runId,
      tableName: 'users',
      databaseName: 'app_db',
      columnDefinitions: [
        { name: 'id', type: 'BIGINT', nullable: false },
        { name: 'name', type: 'VARCHAR(100)', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
      ],
      indexDefinitions: [
        { name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimary: true },
        { name: 'idx_email', columns: ['email'], isUnique: true, isPrimary: false },
      ],
      operator: 'tester',
    });

    const run2 = createRun({ operator: 'tester', source: 'schema_test_2' });
    const snap2 = saveSchemaSnapshot({
      runId: run2.runId,
      tableName: 'users',
      databaseName: 'app_db',
      columnDefinitions: [
        { name: 'id', type: 'BIGINT', nullable: false },
        { name: 'name', type: 'VARCHAR(200)', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
        { name: 'phone', type: 'VARCHAR(20)', nullable: true },
      ],
      indexDefinitions: [
        { name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimary: true },
        { name: 'idx_email', columns: ['email'], isUnique: true, isPrimary: false },
      ],
      operator: 'tester',
    });

    const diff = compareSchemas(snap1, snap2);
    expect(diff.columnsAdded.length).toBe(1);
    expect(diff.columnsAdded[0].name).toBe('phone');
    expect(diff.columnsModified.length).toBe(1);
    expect(diff.columnsModified[0].old.name).toBe('name');
    expect(diff.columnsRemoved.length).toBe(0);
    expect(hasSignificantChanges(diff)).toBe(true);
  });

  test('validateAndDiffSchema 自动生成异常', () => {
    const run1 = createRun({ operator: 'tester', source: 'diff_test_1' });
    saveSchemaSnapshot({
      runId: run1.runId,
      tableName: 'items',
      databaseName: 'shop',
      columnDefinitions: [{ name: 'id', type: 'INT', nullable: false }],
      indexDefinitions: [{ name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimary: true }],
      operator: 'tester',
    });

    const run2 = createRun({ operator: 'tester', source: 'diff_test_2' });
    const snap2 = saveSchemaSnapshot({
      runId: run2.runId,
      tableName: 'items',
      databaseName: 'shop',
      columnDefinitions: [
        { name: 'id', type: 'BIGINT', nullable: false },
        { name: 'deleted', type: 'TINYINT', nullable: false, defaultValue: '0' },
      ],
      indexDefinitions: [{ name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimary: true }],
      operator: 'tester',
    });

    validateAndDiffSchema(run2.runId, snap2, 'tester');
    const anoms = listAnomalies({ runId: run2.runId, type: 'SCHEMA_MISMATCH' });
    expect(anoms.length).toBe(1);
    expect(anoms[0].nextAction).toBe('FIX_CALIBRATION');
    expect(anoms[0].description).toContain('表结构');
  });

  test('getLatestSnapshot 获取最近快照', () => {
    const run1 = createRun({ operator: 'tester', source: 'latest_test_1' });
    saveSchemaSnapshot({
      runId: run1.runId,
      tableName: 't',
      databaseName: 'd',
      columnDefinitions: [{ name: 'a', type: 'INT', nullable: false }],
      indexDefinitions: [],
      operator: 'tester',
    });
    const run2 = createRun({ operator: 'tester', source: 'latest_test_2' });
    const latest = getLatestSnapshot('d', 't', run2.runId);
    expect(latest).not.toBeNull();
    expect(latest!.runId).toBe(run1.runId);
  });
});

describe('Metrics & Supplement Service', () => {
  test('supplementMetrics 更新建议并记录', () => {
    const run = createRun({ operator: 'tester', source: 'metric_test' });
    const sug = createSuggestion({
      runId: run.runId,
      tableName: 't',
      databaseName: 'd',
      indexName: 'i',
      indexColumns: ['a'],
      coveredColumns: ['a'],
      coverageRate: 0.5,
      sourceSystem: 's',
      operator: 'tester',
    });

    supplementMetrics({
      runId: run.runId,
      suggestionId: sug.id,
      metricName: 'coverage_rate',
      metricValue: 0.15,
      source: 'manual',
      supplementedBy: 'tester',
    });

    const sups = listSupplements(run.runId, sug.id);
    expect(sups.length).toBe(1);
    expect(sups[0].metricValue).toBe(0.15);

    const updated = getSuggestion(sug.id);
    expect(updated!.coverageRate).toBe(0.15);

    const anoms = listAnomalies({ runId: run.runId, type: 'COVERAGE_LOW' });
    expect(anoms.length).toBeGreaterThanOrEqual(1);
  });

  test('triggerSchemaRecheckAfterSupplement 重新对比', async () => {
    const run = createRun({ operator: 'tester', source: 'recheck_test' });
    saveSchemaSnapshot({
      runId: run.runId,
      tableName: 'recheck_t',
      databaseName: 'd',
      columnDefinitions: [{ name: 'a', type: 'INT', nullable: false }],
      indexDefinitions: [],
      operator: 'tester',
    });
    const results = await triggerSchemaRecheckAfterSupplement(run.runId, 'tester');
    expect(Array.isArray(results)).toBe(true);
  });
});

describe('Import Service', () => {
  test('importIndexData CSV', () => {
    const csvPath = path.join(tempDir, 'test_input.csv');
    generateSampleCsv(csvPath);
    expect(fs.existsSync(csvPath)).toBe(true);

    const result = importIndexData({
      filePath: csvPath,
      operator: 'tester',
      source: 'import_test',
      description: '测试导入',
      schemaSnapshots: generateSampleSchemaSnapshots(),
    });

    expect(result.run.runId).toBeDefined();
    expect(result.suggestionsCreated).toBeGreaterThan(0);
    expect(result.anomaliesCreated).toBeGreaterThan(0);
    expect(result.schemaSnapshotsSaved).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);

    const anoms = listAnomalies({ runId: result.run.runId });
    const invalid = anoms.find((a) => a.type === 'INDEX_INVALID');
    expect(invalid).toBeDefined();
    expect(invalid!.handlingOpinion).toContain('拦截');
  });
});

describe('Export Service', () => {
  test('exportRunReport xlsx', async () => {
    const csvPath = path.join(tempDir, 'export_test.csv');
    generateSampleCsv(csvPath);
    const imp = importIndexData({
      filePath: csvPath,
      operator: 'tester',
      source: 'export_test',
      schemaSnapshots: generateSampleSchemaSnapshots(),
    });

    supplementMetrics({
      runId: imp.run.runId,
      suggestionId: listSuggestions(imp.run.runId)[0].id,
      metricName: 'execution_count',
      metricValue: 999,
      source: 'test',
      supplementedBy: 'tester',
    });

    const exportDir = path.join(tempDir, 'exports');
    const result = await exportRunReport(imp.run.runId, {
      format: 'xlsx',
      outputDir: exportDir,
      explainAnomalies: true,
      includeDiff: true,
      includeResolved: false,
    });

    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(result.sheets).toContain('运行概览');
    expect(result.sheets).toContain('索引建议');
    expect(result.sheets).toContain('异常明细');
    expect(result.sheets).toContain('行动指引');
    expect(result.summary.totalSuggestions).toBeGreaterThan(0);
    expect(result.summary.totalAnomalies).toBeGreaterThan(0);

    const stats = fs.statSync(result.filePath);
    expect(stats.size).toBeGreaterThan(1000);

    const history = getExportHistory(exportDir);
    expect(history.length).toBe(1);
    expect(history[0].fileName).toContain('index_coverage_');
  });

  test('exportRunReport csv', async () => {
    const csvPath = path.join(tempDir, 'export_test2.csv');
    generateSampleCsv(csvPath);
    const imp = importIndexData({
      filePath: csvPath,
      operator: 'tester',
      source: 'csv_export_test',
    });

    const exportDir = path.join(tempDir, 'exports_csv');
    const result = await exportRunReport(imp.run.runId, { format: 'csv', outputDir: exportDir });
    expect(result.filePath).toContain('.csv');
  });
});
