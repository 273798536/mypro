import type {
  SlowQuery,
  SchemaVersion,
  SchemaTable,
  SchemaColumn,
  SchemaIndex,
  TimeDistributionItem,
  QueryTypeStats,
  SchemaCompareResult,
  TableDiff,
  ColumnDiff,
  IndexDiff,
  ReportData,
  VerifyItem
} from '../types';
import { slowQueries, getIndexFailureQueries } from '../data/slowQueries';
import { schemaVersions, getLatestSchemaVersion } from '../data/schemaVersions';
import { getLatestBackupVerify } from '../data/backupVerify';

export const generateRunId = (): string => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const random = Math.random().toString(36).slice(2, 8);
  return `run-${timestamp}-${random}`;
};

export const getTimeDistribution = (queries: SlowQuery[]): TimeDistributionItem[] => {
  const ranges = [
    { range: '0-1s', min: 0, max: 1 },
    { range: '1-3s', min: 1, max: 3 },
    { range: '3-5s', min: 3, max: 5 },
    { range: '5-10s', min: 5, max: 10 },
    { range: '10s+', min: 10, max: Infinity }
  ];

  return ranges.map(({ range, min, max }) => ({
    range,
    min,
    max,
    count: queries.filter(q => q.queryTime >= min && q.queryTime < max).length,
    hasIndexFailure: queries.filter(q => q.queryTime >= min && q.queryTime < max && q.indexFailure.detected).length
  }));
};

export const getQueryTypeStats = (queries: SlowQuery[]): QueryTypeStats[] => {
  const types: Array<'SELECT' | 'UPDATE' | 'DELETE' | 'INSERT'> = ['SELECT', 'UPDATE', 'DELETE', 'INSERT'];
  return types.map(type => {
    const typeQueries = queries.filter(q => q.queryType === type);
    return {
      type,
      count: typeQueries.length,
      avgTime: typeQueries.length > 0 ? typeQueries.reduce((sum, q) => sum + q.queryTime, 0) / typeQueries.length : 0,
      indexFailureCount: typeQueries.filter(q => q.indexFailure.detected).length
    };
  }).filter(s => s.count > 0);
};

export const getTopSlowQueries = (queries: SlowQuery[], limit = 5): SlowQuery[] => {
  return [...queries].sort((a, b) => b.queryTime - a.queryTime).slice(0, limit);
};

const compareColumns = (oldCols: SchemaColumn[], newCols: SchemaColumn[]): ColumnDiff[] => {
  const diffs: ColumnDiff[] = [];
  const oldColMap = new Map(oldCols.map(c => [c.name, c]));
  const newColMap = new Map(newCols.map(c => [c.name, c]));

  for (const col of oldCols) {
    if (!newColMap.has(col.name)) {
      diffs.push({
        columnName: col.name,
        changeType: 'removed',
        oldColumn: col
      });
    }
  }

  for (const col of newCols) {
    if (!oldColMap.has(col.name)) {
      diffs.push({
        columnName: col.name,
        changeType: 'added',
        newColumn: col
      });
    } else {
      const oldCol = oldColMap.get(col.name)!;
      const differences: string[] = [];
      if (oldCol.type !== col.type) differences.push(`类型: ${oldCol.type} → ${col.type}`);
      if (oldCol.nullable !== col.nullable) differences.push(`可空: ${oldCol.nullable} → ${col.nullable}`);
      if (oldCol.default !== col.default) differences.push(`默认值: ${oldCol.default || '无'} → ${col.default || '无'}`);
      if (oldCol.comment !== col.comment) differences.push(`注释: ${oldCol.comment || '无'} → ${col.comment || '无'}`);

      if (differences.length > 0) {
        diffs.push({
          columnName: col.name,
          changeType: 'modified',
          oldColumn: oldCol,
          newColumn: col,
          differences
        });
      }
    }
  }

  return diffs;
};

const compareIndexes = (oldIndexes: SchemaIndex[], newIndexes: SchemaIndex[]): IndexDiff[] => {
  const diffs: IndexDiff[] = [];
  const oldIdxMap = new Map(oldIndexes.map(i => [i.name, i]));
  const newIdxMap = new Map(newIndexes.map(i => [i.name, i]));

  for (const idx of oldIndexes) {
    if (!newIdxMap.has(idx.name)) {
      diffs.push({
        indexName: idx.name,
        changeType: 'removed',
        oldIndex: idx
      });
    }
  }

  for (const idx of newIndexes) {
    if (!oldIdxMap.has(idx.name)) {
      diffs.push({
        indexName: idx.name,
        changeType: 'added',
        newIndex: idx
      });
    } else {
      const oldIdx = oldIdxMap.get(idx.name)!;
      const differences: string[] = [];
      if (oldIdx.type !== idx.type) differences.push(`类型: ${oldIdx.type} → ${idx.type}`);
      if (oldIdx.columns.join(',') !== idx.columns.join(',')) {
        differences.push(`列: [${oldIdx.columns.join(', ')}] → [${idx.columns.join(', ')}]`);
      }

      if (differences.length > 0) {
        diffs.push({
          indexName: idx.name,
          changeType: 'modified',
          oldIndex: oldIdx,
          newIndex: idx,
          differences
        });
      }
    }
  }

  return diffs;
};

export const compareSchemaVersions = (oldVersion: SchemaVersion, newVersion: SchemaVersion): SchemaCompareResult => {
  const tableDiffs: TableDiff[] = [];
  const oldTableMap = new Map(oldVersion.tables.map(t => [t.name, t]));
  const newTableMap = new Map(newVersion.tables.map(t => [t.name, t]));

  for (const table of oldVersion.tables) {
    if (!newTableMap.has(table.name)) {
      tableDiffs.push({
        tableName: table.name,
        changeType: 'removed',
        columnDiffs: [],
        indexDiffs: [],
        tableDifferences: ['表已删除']
      });
    }
  }

  for (const table of newVersion.tables) {
    if (!oldTableMap.has(table.name)) {
      tableDiffs.push({
        tableName: table.name,
        changeType: 'added',
        columnDiffs: table.columns.map(c => ({
          columnName: c.name,
          changeType: 'added',
          newColumn: c
        })),
        indexDiffs: table.indexes.map(i => ({
          indexName: i.name,
          changeType: 'added',
          newIndex: i
        })),
        tableDifferences: ['新增表']
      });
    } else {
      const oldTable = oldTableMap.get(table.name)!;
      const columnDiffs = compareColumns(oldTable.columns, table.columns);
      const indexDiffs = compareIndexes(oldTable.indexes, table.indexes);
      const tableDifferences: string[] = [];

      if (oldTable.engine !== table.engine) tableDifferences.push(`引擎: ${oldTable.engine} → ${table.engine}`);
      if (oldTable.charset !== table.charset) tableDifferences.push(`字符集: ${oldTable.charset} → ${table.charset}`);
      if (oldTable.comment !== table.comment) tableDifferences.push(`注释: ${oldTable.comment || '无'} → ${table.comment || '无'}`);

      if (columnDiffs.length > 0 || indexDiffs.length > 0 || tableDifferences.length > 0) {
        tableDiffs.push({
          tableName: table.name,
          changeType: 'modified',
          columnDiffs,
          indexDiffs,
          tableDifferences: tableDifferences.length > 0 ? tableDifferences : undefined
        });
      }
    }
  }

  const summary = {
    tablesAdded: tableDiffs.filter(d => d.changeType === 'added').length,
    tablesRemoved: tableDiffs.filter(d => d.changeType === 'removed').length,
    tablesModified: tableDiffs.filter(d => d.changeType === 'modified').length,
    columnsAdded: tableDiffs.reduce((sum, d) => sum + d.columnDiffs.filter(c => c.changeType === 'added').length, 0),
    columnsRemoved: tableDiffs.reduce((sum, d) => sum + d.columnDiffs.filter(c => c.changeType === 'removed').length, 0),
    columnsModified: tableDiffs.reduce((sum, d) => sum + d.columnDiffs.filter(c => c.changeType === 'modified').length, 0),
    indexesAdded: tableDiffs.reduce((sum, d) => sum + d.indexDiffs.filter(i => i.changeType === 'added').length, 0),
    indexesRemoved: tableDiffs.reduce((sum, d) => sum + d.indexDiffs.filter(i => i.changeType === 'removed').length, 0),
    indexesModified: tableDiffs.reduce((sum, d) => sum + d.indexDiffs.filter(i => i.changeType === 'modified').length, 0)
  };

  return {
    oldVersion: oldVersion.version,
    newVersion: newVersion.version,
    tableDiffs,
    summary
  };
};

export const getUnusableRecords = (queries: SlowQuery[], verifyItems: VerifyItem[]) => {
  const records: { tableName: string; reason: string; impact: string; source: string }[] = [];

  queries
    .filter(q => q.indexFailure.detected)
    .forEach(q => {
      const tables = q.tableName.split(',').map(t => t.trim());
      tables.forEach(table => {
        records.push({
          tableName: table,
          reason: `SQL [${q.id}]: ${q.indexFailure.reason}`,
          impact: q.indexFailure.businessImpact,
          source: 'slow_query'
        });
      });
    });

  verifyItems
    .filter(v => v.status === 'failed' || v.status === 'warning')
    .forEach(v => {
      const tableMatch = v.name.match(/^([\w_]+)表/);
      if (tableMatch) {
        records.push({
          tableName: tableMatch[1],
          reason: `校验项 [${v.id}]: ${v.description}`,
          impact: v.businessImpact || '可能影响数据完整性',
          source: v.status
        });
      }
    });

  return records;
};

export const generateReportData = (runId: string): ReportData => {
  const latestSchema = getLatestSchemaVersion();
  const latestVerify = getLatestBackupVerify();
  const previousSchema = schemaVersions.length >= 2 ? schemaVersions[schemaVersions.length - 2] : schemaVersions[0];

  const indexFailureQueries = getIndexFailureQueries();
  const unusableRecords = getUnusableRecords(slowQueries, latestVerify.items);

  return {
    generatedAt: new Date().toISOString(),
    runId,
    slowQueryCount: slowQueries.length,
    indexFailureCount: indexFailureQueries.length,
    schemaVersion: latestSchema.version,
    backupVerifyStatus: latestVerify.status,
    timeDistribution: getTimeDistribution(slowQueries),
    topSlowQueries: getTopSlowQueries(slowQueries),
    indexFailureList: indexFailureQueries,
    schemaDiffSummary: compareSchemaVersions(previousSchema, latestSchema),
    backupVerifyItems: latestVerify.items,
    unusableRecords
  };
};

export const exportReportToJSON = (report: ReportData): string => {
  return JSON.stringify(report, null, 2);
};

export const exportReportToCSV = (report: ReportData): string => {
  let csv = '\uFEFF';

  csv += '=== 索引失效慢查询明细 ===\n';
  csv += 'ID,时间,查询类型,表名,查询时间(秒),扫描行数,返回行数,使用索引,失效原因,业务影响\n';
  report.indexFailureList.forEach(q => {
    csv += `${q.id},${q.timestamp},${q.queryType},"${q.tableName}",${q.queryTime},${q.rowsExamined},${q.rowsSent},${q.indexUsed || '无'},"${q.indexFailure.reason}","${q.indexFailure.businessImpact}"\n`;
  });

  csv += '\n=== 不可用记录汇总 ===\n';
  csv += '表名,原因,影响,来源\n';
  report.unusableRecords.forEach(r => {
    csv += `"${r.tableName}","${r.reason}","${r.impact}","${r.source}"\n`;
  });

  csv += '\n=== 备份校验不通过项 ===\n';
  csv += 'ID,名称,分类,状态,描述,业务影响,相关迁移\n';
  report.backupVerifyItems
    .filter(v => v.status !== 'passed')
    .forEach(v => {
      csv += `${v.id},${v.name},${v.category},${v.status},"${v.description}","${v.businessImpact || '无'}","${v.relatedMigration || '无'}"\n`;
    });

  return csv;
};

export const exportReportToMarkdown = (report: ReportData): string => {
  const formatDate = (iso: string) => new Date(iso).toLocaleString('zh-CN');

  let md = `# 主从切换记录台 - 分析报告\n\n`;
  md += `- **运行批次**: ${report.runId}\n`;
  md += `- **生成时间**: ${formatDate(report.generatedAt)}\n`;
  md += `- **Schema 版本**: ${report.schemaVersion}\n\n`;

  md += `## 一、核心结论\n\n`;
  md += `- 本次检测慢查询: **${report.slowQueryCount}** 条\n`;
  md += `- 发现索引失效: **${report.indexFailureCount}** 条 (已拦截并展示)\n`;
  md += `- 备份校验状态: **${report.backupVerifyStatus === 'passed' ? '通过' : report.backupVerifyStatus === 'warning' ? '有警告' : '未通过'}**\n`;
  md += `- 不可用记录数: **${report.unusableRecords.length}** 条\n\n`;

  md += `## 二、索引失效为什么被拦下来\n\n`;
  md += `索引失效查询会导致全表扫描、文件排序、临时表等问题，严重影响数据库性能。`;
  md += `以下查询因索引失效被专项拦截展示：\n\n`;

  report.indexFailureList.forEach((q, idx) => {
    md += `### ${idx + 1}. ${q.id} - ${q.indexFailure.reason}\n\n`;
    md += `- **SQL**: \`${q.sql}\`\n\n`;
    md += `- **查询时间**: ${q.queryTime} 秒\n`;
    md += `- **扫描行数**: ${q.rowsExamined} 行\n`;
    md += `- **返回行数**: ${q.rowsSent} 行\n`;
    md += `- **效率比**: 扫描/返回 ≈ ${(q.rowsExamined / Math.max(q.rowsSent, 1)).toFixed(1)}:1 (正常应 < 10:1)\n\n`;
    md += `#### 失效原因分析\n\n${q.indexFailure.explanation}\n\n`;
    md += `#### 业务影响\n\n${q.indexFailure.businessImpact}\n\n`;
  });

  md += `## 三、不可用记录清单\n\n`;
  md += `以下表存在可能导致业务不可用的问题，业务同事重点关注：\n\n`;
  md += `| 表名 | 问题原因 | 业务影响 | 来源 |\n`;
  md += `|------|----------|----------|------|\n`;
  report.unusableRecords.forEach(r => {
    md += `| ${r.tableName} | ${r.reason} | ${r.impact} | ${r.source} |\n`;
  });
  md += '\n';

  md += `## 四、备份校验结果\n\n`;
  const failedItems = report.backupVerifyItems.filter(v => v.status === 'failed');
  const warningItems = report.backupVerifyItems.filter(v => v.status === 'warning');

  if (failedItems.length > 0) {
    md += `### ❌ 未通过项 (${failedItems.length})\n\n`;
    failedItems.forEach(v => {
      md += `- **${v.name}**\n`;
      md += `  - 描述: ${v.description}\n`;
      md += `  - 详情: ${v.detail || '无'}\n`;
      if (v.businessImpact) md += `  - 影响: ${v.businessImpact}\n`;
      if (v.relatedMigration) md += `  - 相关迁移: ${v.relatedMigration}\n`;
      md += '\n';
    });
  }

  if (warningItems.length > 0) {
    md += `### ⚠️ 警告项 (${warningItems.length})\n\n`;
    warningItems.forEach(v => {
      md += `- **${v.name}**\n`;
      md += `  - 描述: ${v.description}\n`;
      md += `  - 详情: ${v.detail || '无'}\n`;
      if (v.businessImpact) md += `  - 影响: ${v.businessImpact}\n`;
      if (v.relatedMigration) md += `  - 相关迁移: ${v.relatedMigration}\n`;
      md += '\n';
    });
  }

  if (report.schemaDiffSummary) {
    md += `## 五、Schema 版本变更 (${report.schemaDiffSummary.oldVersion} → ${report.schemaDiffSummary.newVersion})\n\n`;
    const s = report.schemaDiffSummary.summary;
    md += `- 新增表: ${s.tablesAdded} 张\n`;
    md += `- 修改表: ${s.tablesModified} 张\n`;
    md += `- 删除表: ${s.tablesRemoved} 张\n`;
    md += `- 新增字段: ${s.columnsAdded} 个\n`;
    md += `- 修改字段: ${s.columnsModified} 个\n`;
    md += `- 新增索引: ${s.indexesAdded} 个\n`;
    md += `- 修改索引: ${s.indexesModified} 个\n\n`;
  }

  return md;
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateFileName = (runId: string, format: 'json' | 'csv' | 'md'): string => {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `主从切换记录台_${dateStr}_${runId}.${format}`;
};
