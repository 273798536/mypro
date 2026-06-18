import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createRun, updateRunStatus, writeAuditLog } from './runService';
import { createSuggestion, IndexSuggestionInput } from './suggestionService';
import {
  createAnomaly,
  buildIndexInvalidAnomaly,
  buildLockWaitAnomaly,
} from './anomalyService';
import { saveSchemaSnapshot, validateAndDiffSchema, SnapshotInput } from './schemaService';
import { ColumnDef, IndexDef, RunContext } from '../types';

export interface ImportRow {
  database_name: string;
  table_name: string;
  index_name: string;
  index_columns: string;
  covered_columns: string;
  coverage_rate: string | number;
  execution_count?: string | number;
  avg_latency_ms?: string | number;
  is_invalid?: string | boolean;
  invalid_reason?: string;
  source_system: string;
  lock_wait_seconds?: string | number;
}

export interface ImportOptions {
  filePath: string;
  operator: string;
  source: string;
  description?: string;
  parentRunId?: string;
  schemaSnapshots?: Omit<SnapshotInput, 'runId' | 'operator'>[];
  lockWaitThreshold?: number;
}

export interface ImportResult {
  run: RunContext & { status: string };
  suggestionsCreated: number;
  anomaliesCreated: number;
  schemaSnapshotsSaved: number;
  schemaDiffsFound: number;
  warnings: string[];
  errors: string[];
}

export function importIndexData(options: ImportOptions): ImportResult {
  const result: ImportResult = {
    run: {} as RunContext & { status: string },
    suggestionsCreated: 0,
    anomaliesCreated: 0,
    schemaSnapshotsSaved: 0,
    schemaDiffsFound: 0,
    warnings: [],
    errors: [],
  };

  const rawContent = fs.readFileSync(options.filePath, 'utf-8');
  const ext = path.extname(options.filePath).toLowerCase();

  let rows: ImportRow[];
  try {
    if (ext === '.json') {
      rows = JSON.parse(rawContent);
    } else if (ext === '.csv') {
      rows = parse(rawContent, { columns: true, skip_empty_lines: true }) as ImportRow[];
    } else {
      result.errors.push(`不支持的文件格式: ${ext}，仅支持 .json 和 .csv`);
      return result;
    }
  } catch (e) {
    result.errors.push(`解析文件失败: ${(e as Error).message}`);
    return result;
  }

  const run = createRun({
    operator: options.operator,
    source: options.source,
    description: options.description,
    parentRunId: options.parentRunId,
  });
  result.run = { ...run, status: 'PROCESSING' };

  writeAuditLog({
    entityType: 'RUN',
    entityId: run.runId,
    action: 'IMPORT',
    operator: options.operator,
    runId: run.runId,
    note: `开始导入数据: ${options.filePath}`,
    afterState: { rowsCount: rows.length },
  });

  const lockWaitThreshold = options.lockWaitThreshold ?? 30;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const coverageRate = typeof row.coverage_rate === 'string' ? parseFloat(row.coverage_rate) : row.coverage_rate;
      const executionCount = row.execution_count !== undefined
        ? (typeof row.execution_count === 'string' ? parseInt(row.execution_count, 10) : row.execution_count)
        : 0;
      const avgLatencyMs = row.avg_latency_ms !== undefined
        ? (typeof row.avg_latency_ms === 'string' ? parseFloat(row.avg_latency_ms) : row.avg_latency_ms)
        : 0;
      const isInvalid = row.is_invalid === true || row.is_invalid === 'true' || row.is_invalid === '1';
      const lockWaitSeconds = row.lock_wait_seconds !== undefined
        ? (typeof row.lock_wait_seconds === 'string' ? parseFloat(row.lock_wait_seconds) : row.lock_wait_seconds)
        : 0;

      const suggestionInput: IndexSuggestionInput = {
        runId: run.runId,
        tableName: row.table_name,
        databaseName: row.database_name,
        indexName: row.index_name,
        indexColumns: row.index_columns.split(',').map((s) => s.trim()).filter(Boolean),
        coveredColumns: row.covered_columns.split(',').map((s) => s.trim()).filter(Boolean),
        coverageRate,
        executionCount,
        avgLatencyMs,
        isInvalid,
        invalidReason: row.invalid_reason,
        sourceSystem: row.source_system,
        operator: options.operator,
      };

      const suggestion = createSuggestion(suggestionInput);
      result.suggestionsCreated++;

      if (isInvalid && row.invalid_reason) {
        buildIndexInvalidAnomaly(
          run.runId,
          suggestion.id,
          row.table_name,
          row.index_name,
          row.invalid_reason,
          row.source_system,
          options.operator
        );
        result.anomaliesCreated++;
      }

      if (lockWaitSeconds > lockWaitThreshold) {
        buildLockWaitAnomaly(
          run.runId,
          row.table_name,
          lockWaitSeconds,
          lockWaitThreshold,
          row.source_system,
          options.operator,
          suggestion.id
        );
        result.anomaliesCreated++;
      }

      if (coverageRate < 0.5) {
        createAnomaly({
          runId: run.runId,
          suggestionId: suggestion.id,
          type: 'COVERAGE_LOW',
          severity: coverageRate < 0.2 ? 'CRITICAL' : 'WARNING',
          title: `覆盖率不足: ${row.table_name}.${row.index_name} (${(coverageRate * 100).toFixed(1)}%)`,
          description: `索引覆盖率为 ${(coverageRate * 100).toFixed(1)}%，低于 50% 阈值。需确认索引是否仍有业务价值。`,
          sourceRef: `${row.source_system}:${row.table_name}.${row.index_name}`,
          nextAction: 'PROVIDE_MATERIALS',
          handlingOpinion: '覆盖率较低需补充业务场景说明。请提供: 1) 索引关联的SQL语句样例 2) 该索引服务的业务功能 3) 是否存在可合并的同类索引。',
          materialsRequired: ['关联SQL样例', '业务功能说明', '同类索引列表'],
          operator: options.operator,
        });
        result.anomaliesCreated++;
      }
    } catch (e) {
      result.warnings.push(`第 ${i + 1} 行处理失败: ${(e as Error).message}`);
    }
  }

  if (options.schemaSnapshots) {
    for (const snap of options.schemaSnapshots) {
      const snapshot = saveSchemaSnapshot({ ...snap, runId: run.runId, operator: options.operator });
      result.schemaSnapshotsSaved++;
      const diff = validateAndDiffSchema(run.runId, snapshot, options.operator);
      if (diff && (diff.columnsAdded.length || diff.columnsRemoved.length || diff.columnsModified.length || diff.indexesRemoved.length)) {
        result.schemaDiffsFound++;
      }
    }
  }

  updateRunStatus(run.runId, result.errors.length ? 'PARTIAL' : 'COMPLETED', options.operator);
  result.run.status = result.errors.length ? 'PARTIAL' : 'COMPLETED';

  writeAuditLog({
    entityType: 'RUN',
    entityId: run.runId,
    action: 'UPDATE',
    operator: options.operator,
    runId: run.runId,
    note: `导入完成: ${result.suggestionsCreated} 条建议, ${result.anomaliesCreated} 条异常, ${result.schemaDiffsFound} 个 schema 差异`,
    afterState: result,
  });

  return result;
}

export function generateSampleCsv(outputPath: string): void {
  const csvEscape = (val: string | number | boolean | undefined): string => {
    if (val === undefined || val === null) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const rows: string[][] = [
    ['database_name', 'table_name', 'index_name', 'index_columns', 'covered_columns', 'coverage_rate', 'execution_count', 'avg_latency_ms', 'is_invalid', 'invalid_reason', 'source_system', 'lock_wait_seconds'],
    ['trade_db', 'orders', 'idx_orders_customer_id', 'customer_id', 'id,customer_id,status', '0.78', '15234', '12.5', 'false', '', 'mysql_prod', '5'],
    ['trade_db', 'orders', 'idx_orders_date', 'created_at', 'id,created_at', '0.15', '823', '45.2', 'false', '', 'mysql_prod', '45'],
    ['user_db', 'users', 'idx_users_email', 'email', 'id,email,status', '0.92', '45210', '3.8', 'false', '', 'mysql_prod', '2'],
    ['log_db', 'access_log', 'idx_log_old_id', 'old_id', 'id,old_id', '0.0', '0', '0.0', 'true', '列old_id已被删除', 'mysql_prod', '0'],
  ];

  const csvContent = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
}

export function generateSampleSchemaSnapshots(): Omit<SnapshotInput, 'runId' | 'operator'>[] {
  return [
    {
      tableName: 'orders',
      databaseName: 'trade_db',
      columnDefinitions: [
        { name: 'id', type: 'BIGINT', nullable: false },
        { name: 'customer_id', type: 'BIGINT', nullable: false },
        { name: 'status', type: 'VARCHAR(32)', nullable: false },
        { name: 'created_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'amount', type: 'DECIMAL(12,2)', nullable: false },
      ],
      indexDefinitions: [
        { name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimary: true },
        { name: 'idx_orders_customer_id', columns: ['customer_id'], isUnique: false, isPrimary: false },
        { name: 'idx_orders_date', columns: ['created_at'], isUnique: false, isPrimary: false },
      ],
    },
    {
      tableName: 'users',
      databaseName: 'user_db',
      columnDefinitions: [
        { name: 'id', type: 'BIGINT', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
        { name: 'status', type: 'VARCHAR(32)', nullable: false },
      ],
      indexDefinitions: [
        { name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimary: true },
        { name: 'idx_users_email', columns: ['email'], isUnique: true, isPrimary: false },
      ],
    },
  ];
}
