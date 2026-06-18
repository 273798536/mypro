import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { generateRunFileName, formatTimestamp } from '../utils/helpers';
import { getRun, listRuns, writeAuditLog } from './runService';
import { listSuggestions, getSuggestion } from './suggestionService';
import { listAnomalies, getAnomalyStats, NEXT_ACTION_LABELS, AnomalyRecord } from './anomalyService';
import { getSnapshotByRun, getLatestSnapshot, compareSchemas } from './schemaService';
import { listSupplements } from './metricsService';
import { ExportOptions, NEXT_ACTION_LABELS as NA } from '../types';

export interface ExportResult {
  filePath: string;
  sheets: string[];
  summary: {
    totalSuggestions: number;
    totalAnomalies: number;
    unresolvedAnomalies: number;
    invalidIndexes: number;
    schemaDiffs: number;
  };
}

function getAnomalyExplanation(anomaly: AnomalyRecord): string {
  const parts: string[] = [];
  parts.push(`【异常类型】${anomaly.type}`);
  parts.push(`【严重程度】${anomaly.severity}`);
  parts.push(`【问题描述】${anomaly.description}`);
  parts.push(`【数据来源】${anomaly.sourceRef}`);
  parts.push(`【下一步】${NEXT_ACTION_LABELS[anomaly.nextAction]}`);
  parts.push(`【处理意见】${anomaly.handlingOpinion}`);
  if (anomaly.materialsRequired && anomaly.materialsRequired.length > 0) {
    parts.push(`【需补材料】${anomaly.materialsRequired.join('；')}`);
  }
  if (anomaly.isResolved) {
    parts.push(`【已解决】${anomaly.resolutionNote ?? ''} (由 ${anomaly.resolvedBy} 于 ${formatTimestamp(anomaly.resolvedAt ?? 0)})`);
  }
  return parts.join('\n');
}

function getInterceptionReason(anomaly: AnomalyRecord): string {
  if (anomaly.type !== 'INDEX_INVALID') return '';
  return (
    '=== 索引失效拦截原因 ===\n' +
    `该索引因"${anomaly.description}"已被系统自动拦截。\n` +
    `拦截依据：${anomaly.handlingOpinion}\n` +
    `如放行需提供：${anomaly.materialsRequired?.join('、') ?? '相关证明材料'}\n` +
    `请执行下一步操作：${NEXT_ACTION_LABELS[anomaly.nextAction]}`
  );
}

export async function exportRunReport(
  runId: string,
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  const run = getRun(runId);
  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }

  const opts: ExportOptions = {
    includeResolved: options.includeResolved ?? false,
    format: options.format ?? 'xlsx',
    outputDir: options.outputDir ?? path.join(process.cwd(), 'exports'),
    explainAnomalies: options.explainAnomalies ?? true,
    includeDiff: options.includeDiff ?? true,
  };

  if (!fs.existsSync(opts.outputDir)) {
    fs.mkdirSync(opts.outputDir, { recursive: true });
  }

  const suffix = opts.format === 'xlsx' ? 'xlsx' : 'csv';
  const fileName = generateRunFileName(runId, run.timestamp, suffix);
  const filePath = path.join(opts.outputDir, fileName);

  const suggestions = listSuggestions(runId);
  const anomalies = listAnomalies({ runId, isResolved: opts.includeResolved ? undefined : false });
  const stats = getAnomalyStats(runId);
  const snapshots = getSnapshotByRun(runId);
  const supplements = listSupplements(runId);

  const schemaDiffs: {
    tableName: string;
    databaseName: string;
    diffText: string;
  }[] = [];

  if (opts.includeDiff) {
    for (const snap of snapshots) {
      const previous = getLatestSnapshot(snap.databaseName, snap.tableName, runId);
      if (previous) {
        const diff = compareSchemas(previous, snap);
        const parts: string[] = [];
        if (diff.columnsAdded.length) parts.push(`新增列: ${diff.columnsAdded.map((c) => `${c.name}(${c.type})`).join(', ')}`);
        if (diff.columnsRemoved.length) parts.push(`删除列: ${diff.columnsRemoved.map((c) => c.name).join(', ')}`);
        if (diff.columnsModified.length)
          parts.push(
            `修改列: ${diff.columnsModified.map((m) => `${m.old.name}:${m.old.type}→${m.new.type}`).join(', ')}`
          );
        if (diff.indexesAdded.length) parts.push(`新增索引: ${diff.indexesAdded.map((i) => i.name).join(', ')}`);
        if (diff.indexesRemoved.length) parts.push(`删除索引: ${diff.indexesRemoved.map((i) => i.name).join(', ')}`);
        if (parts.length > 0) {
          schemaDiffs.push({
            tableName: snap.tableName,
            databaseName: snap.databaseName,
            diffText: parts.join('\n'),
          });
        }
      }
    }
  }

  if (opts.format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Index Coverage CLI';
    workbook.created = new Date(run.timestamp);

    const wsSummary = workbook.addWorksheet('运行概览');
    wsSummary.columns = [
      { header: '项目', key: 'item', width: 25 },
      { header: '值', key: 'value', width: 60 },
    ];
    wsSummary.addRows([
      { item: '运行ID', value: run.runId },
      { item: '运行时间', value: formatTimestamp(run.timestamp) },
      { item: '操作人', value: run.operator },
      { item: '数据来源', value: run.source },
      { item: '说明', value: run.description ?? '' },
      { item: '父运行ID', value: run.parentRunId ?? '（无）' },
      { item: '运行状态', value: (run as { status?: string }).status ?? '' },
      { item: '', value: '' },
      { item: '=== 统计摘要 ===', value: '' },
      { item: '索引建议总数', value: suggestions.length },
      { item: '失效索引数', value: suggestions.filter((s) => s.isInvalid).length },
      { item: '异常总数', value: stats.total },
      { item: '未解决异常', value: stats.unresolved },
      { item: '  CRITICAL', value: stats.bySeverity.CRITICAL },
      { item: '  WARNING', value: stats.bySeverity.WARNING },
      { item: '  INFO', value: stats.bySeverity.INFO },
      { item: '', value: '' },
      { item: '=== 下一步行动分布 ===', value: '' },
      { item: '  需补材料', value: stats.byAction.PROVIDE_MATERIALS },
      { item: '  需改口径', value: stats.byAction.FIX_CALIBRATION },
      { item: '  需复核索引', value: stats.byAction.REVIEW_INDEX },
      { item: '  无需处理', value: stats.byAction.NO_ACTION },
      { item: '', value: '' },
      { item: 'Schema 差异表数', value: schemaDiffs.length },
      { item: '指标补录条数', value: supplements.length },
    ]);
    wsSummary.getColumn('A').font = { bold: true };

    const wsIdx = workbook.addWorksheet('索引建议');
    wsIdx.columns = [
      { header: '数据库', key: 'databaseName', width: 18 },
      { header: '表名', key: 'tableName', width: 22 },
      { header: '索引名', key: 'indexName', width: 28 },
      { header: '索引列', key: 'indexColumns', width: 30 },
      { header: '覆盖列', key: 'coveredColumns', width: 35 },
      { header: '覆盖率', key: 'coverageRate', width: 10 },
      { header: '执行次数', key: 'executionCount', width: 12 },
      { header: '平均延迟(ms)', key: 'avgLatencyMs', width: 14 },
      { header: '是否失效', key: 'isInvalid', width: 10 },
      { header: '失效原因', key: 'invalidReason', width: 35 },
      { header: '数据来源', key: 'sourceSystem', width: 15 },
      { header: '异常条数', key: 'anomalyCount', width: 10 },
    ];
    for (const s of suggestions) {
      const anomalyCount = anomalies.filter((a) => a.suggestionId === s.id).length;
      wsIdx.addRow({
        databaseName: s.databaseName,
        tableName: s.tableName,
        indexName: s.indexName,
        indexColumns: s.indexColumns.join(', '),
        coveredColumns: s.coveredColumns.join(', '),
        coverageRate: (s.coverageRate * 100).toFixed(1) + '%',
        executionCount: s.executionCount,
        avgLatencyMs: s.avgLatencyMs.toFixed(2),
        isInvalid: s.isInvalid ? '是 ⚠' : '否',
        invalidReason: s.invalidReason ?? '',
        sourceSystem: s.sourceSystem,
        anomalyCount,
      });
    }
    wsIdx.getRow(1).font = { bold: true };
    wsIdx.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && row.getCell('isInvalid').value === '是 ⚠') {
        row.font = { color: { argb: 'FFFF0000' }, bold: true };
      }
    });

    const wsAnom = workbook.addWorksheet('异常明细');
    wsAnom.columns = [
      { header: '异常ID', key: 'id', width: 24 },
      { header: '类型', key: 'type', width: 20 },
      { header: '严重程度', key: 'severity', width: 12 },
      { header: '标题', key: 'title', width: 40 },
      { header: '下一步', key: 'nextAction', width: 14 },
      { header: '数据来源', key: 'sourceRef', width: 30 },
      { header: '是否已解决', key: 'isResolved', width: 12 },
      { header: '完整解释', key: 'explanation', width: 80 },
    ];
    for (const a of anomalies) {
      let explanation = getAnomalyExplanation(a);
      if (a.type === 'INDEX_INVALID') {
        explanation += '\n\n' + getInterceptionReason(a);
      }
      wsAnom.addRow({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        nextAction: NEXT_ACTION_LABELS[a.nextAction],
        sourceRef: a.sourceRef,
        isResolved: a.isResolved ? '是' : '否',
        explanation,
      });
    }
    wsAnom.getRow(1).font = { bold: true };
    wsAnom.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const sev = row.getCell('severity').value as string;
      if (sev === 'CRITICAL') row.font = { color: { argb: 'FFB71C1C' }, bold: true };
      else if (sev === 'WARNING') row.font = { color: { argb: 'FFE65100' } };
      row.getCell('explanation').alignment = { wrapText: true, vertical: 'top' };
    });

    if (schemaDiffs.length > 0) {
      const wsDiff = workbook.addWorksheet('Schema对比');
      wsDiff.columns = [
        { header: '数据库', key: 'databaseName', width: 18 },
        { header: '表名', key: 'tableName', width: 22 },
        { header: '差异明细', key: 'diffText', width: 100 },
      ];
      for (const d of schemaDiffs) {
        wsDiff.addRow(d);
      }
      wsDiff.getRow(1).font = { bold: true };
      wsDiff.eachRow((row) => {
        row.getCell('diffText').alignment = { wrapText: true, vertical: 'top' };
      });
    }

    if (supplements.length > 0) {
      const wsSup = workbook.addWorksheet('指标补录');
      wsSup.columns = [
        { header: '补录时间', key: 'time', width: 22 },
        { header: '索引建议ID', key: 'suggestionId', width: 24 },
        { header: '指标名', key: 'metricName', width: 20 },
        { header: '指标值', key: 'metricValue', width: 15 },
        { header: '来源', key: 'source', width: 20 },
        { header: '补录人', key: 'by', width: 15 },
      ];
      for (const s of supplements) {
        const suggestion = getSuggestion(s.suggestionId);
        wsSup.addRow({
          time: formatTimestamp(s.supplementedAt),
          suggestionId: suggestion
            ? `${suggestion.databaseName}.${suggestion.tableName}.${suggestion.indexName} (${s.suggestionId})`
            : s.suggestionId,
          metricName: s.metricName,
          metricValue: s.metricValue,
          source: s.source,
          by: s.supplementedBy,
        });
      }
      wsSup.getRow(1).font = { bold: true };
    }

    const wsAction = workbook.addWorksheet('行动指引');
    wsAction.columns = [
      { header: '行动类型', key: 'action', width: 16 },
      { header: '异常标题', key: 'title', width: 40 },
      { header: '异常ID', key: 'id', width: 24 },
      { header: '需补材料/改口径说明', key: 'detail', width: 80 },
    ];
    for (const a of anomalies.filter((x) => !x.isResolved)) {
      let detail = '';
      if (a.nextAction === 'PROVIDE_MATERIALS') {
        detail = a.materialsRequired?.length
          ? `请准备以下材料：\n${a.materialsRequired.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
          : '请联系数据平台工程师确认需补材料清单';
      } else if (a.nextAction === 'FIX_CALIBRATION') {
        detail = a.handlingOpinion;
      } else if (a.nextAction === 'REVIEW_INDEX') {
        detail = a.handlingOpinion;
      } else {
        detail = a.handlingOpinion;
      }
      wsAction.addRow({
        action: NEXT_ACTION_LABELS[a.nextAction],
        title: a.title,
        id: a.id,
        detail,
      });
    }
    wsAction.getRow(1).font = { bold: true };
    wsAction.eachRow((row) => {
      row.getCell('detail').alignment = { wrapText: true, vertical: 'top' };
    });

    await workbook.xlsx.writeFile(filePath);
  } else {
    const baseName = path.basename(filePath, '.csv');
    const dir = path.dirname(filePath);

    const summaryLines = [
      ['项目', '值'],
      ['运行ID', run.runId],
      ['运行时间', formatTimestamp(run.timestamp)],
      ['操作人', run.operator],
      ['数据来源', run.source],
      ['索引建议总数', String(suggestions.length)],
      ['失效索引数', String(suggestions.filter((s) => s.isInvalid).length)],
      ['异常总数', String(stats.total)],
      ['未解决异常', String(stats.unresolved)],
      ['需补材料', String(stats.byAction.PROVIDE_MATERIALS)],
      ['需改口径', String(stats.byAction.FIX_CALIBRATION)],
      ['需复核索引', String(stats.byAction.REVIEW_INDEX)],
    ];
    fs.writeFileSync(
      path.join(dir, `${baseName}_summary.csv`),
      summaryLines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'),
      'utf-8'
    );

    const idxHeader = [
      '数据库', '表名', '索引名', '索引列', '覆盖列', '覆盖率',
      '执行次数', '平均延迟(ms)', '是否失效', '失效原因', '数据来源', '异常条数',
    ];
    const idxLines = [idxHeader];
    for (const s of suggestions) {
      const anomalyCount = anomalies.filter((a) => a.suggestionId === s.id).length;
      idxLines.push([
        s.databaseName, s.tableName, s.indexName,
        s.indexColumns.join('|'), s.coveredColumns.join('|'),
        (s.coverageRate * 100).toFixed(1) + '%',
        String(s.executionCount), s.avgLatencyMs.toFixed(2),
        s.isInvalid ? '是' : '否', s.invalidReason ?? '', s.sourceSystem, String(anomalyCount),
      ]);
    }
    fs.writeFileSync(
      path.join(dir, `${baseName}_suggestions.csv`),
      idxLines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'),
      'utf-8'
    );

    const anomHeader = [
      '异常ID', '类型', '严重程度', '标题', '下一步',
      '数据来源', '是否已解决', '完整解释',
    ];
    const anomLines = [anomHeader];
    for (const a of anomalies) {
      let explanation = getAnomalyExplanation(a);
      if (a.type === 'INDEX_INVALID') {
        explanation += '\n\n' + getInterceptionReason(a);
      }
      anomLines.push([
        a.id, a.type, a.severity, a.title,
        NEXT_ACTION_LABELS[a.nextAction], a.sourceRef,
        a.isResolved ? '是' : '否', explanation,
      ]);
    }
    fs.writeFileSync(
      path.join(dir, `${baseName}_anomalies.csv`),
      anomLines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'),
      'utf-8'
    );
  }

  writeAuditLog({
    entityType: 'RUN',
    entityId: runId,
    action: 'EXPORT',
    operator: process.env.USER ?? 'system',
    runId,
    note: `导出运行报告: ${filePath}`,
    afterState: { filePath, format: opts.format },
  });

  return {
    filePath,
    sheets:
      opts.format === 'xlsx'
        ? ['运行概览', '索引建议', '异常明细', '行动指引', ...(schemaDiffs.length ? ['Schema对比'] : []), ...(supplements.length ? ['指标补录'] : [])]
        : ['summary', 'suggestions', 'anomalies'],
    summary: {
      totalSuggestions: suggestions.length,
      totalAnomalies: stats.total,
      unresolvedAnomalies: stats.unresolved,
      invalidIndexes: suggestions.filter((s) => s.isInvalid).length,
      schemaDiffs: schemaDiffs.length,
    },
  };
}

export function getExportHistory(outputDir?: string): Array<{
  fileName: string;
  filePath: string;
  size: number;
  modifiedAt: number;
}> {
  const dir = outputDir ?? path.join(process.cwd(), 'exports');
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('index_coverage_') && (f.endsWith('.xlsx') || f.endsWith('.csv')))
    .map((f) => {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      return {
        fileName: f,
        filePath: fullPath,
        size: stat.size,
        modifiedAt: stat.mtime.getTime(),
      };
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
}
