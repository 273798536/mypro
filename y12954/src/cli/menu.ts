import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { listRuns, getRun, getAuditLogs } from '../services/runService';
import { listSuggestions, getSuggestion } from '../services/suggestionService';
import {
  listAnomalies,
  getAnomaly,
  getAnomalyStats,
  resolveAnomaly,
  NEXT_ACTION_LABELS,
  AnomalyFilters,
  AnomalyType,
  NextAction,
  AnomalySeverity,
} from '../services/anomalyService';
import { formatTimestamp, truncateText } from '../utils/helpers';
import { exportRunReport, getExportHistory } from '../services/exportService';
import { supplementMetrics, triggerSchemaRecheckAfterSupplement } from '../services/metricsService';
import { getSnapshotByRun, compareSchemas, getLatestSnapshot } from '../services/schemaService';
import { generateSampleCsv, generateSampleSchemaSnapshots, importIndexData } from '../services/importService';
import { AnomalyRecord, IndexSuggestion } from '../types';
import * as path from 'path';
import * as fs from 'fs';

function sevColor(severity: string, text: string): string {
  const map: Record<string, (s: string) => string> = {
    CRITICAL: (s) => chalk.red.bold(s),
    WARNING: (s) => chalk.yellow(s),
    INFO: (s) => chalk.blue(s),
  };
  return (map[severity] || chalk.white)(text);
}

function actColor(action: string, text: string): string {
  const map: Record<string, (s: string) => string> = {
    PROVIDE_MATERIALS: (s) => chalk.magenta(s),
    FIX_CALIBRATION: (s) => chalk.cyan(s),
    REVIEW_INDEX: (s) => chalk.yellow.bold(s),
    NO_ACTION: (s) => chalk.gray(s),
  };
  return (map[action] || chalk.white)(text);
}

export async function showMainMenu(): Promise<void> {
  console.log(chalk.bold.green('\n======== 索引覆盖建议 CLI ========\n'));

  const runs = listRuns(10);
  if (runs.length > 0) {
    console.log(chalk.gray(`最近运行: ${runs.length} 条记录\n`));
  }

  const { choice } = await inquirer.prompt({
    type: 'list',
    name: 'choice',
    message: '请选择操作',
    choices: [
      { name: '📥 导入数据', value: 'import' },
      { name: '📋 查看运行列表', value: 'runs' },
      { name: '🔍 异常筛选与查看', value: 'anomalies' },
      { name: '📊 Schema 对比', value: 'schema' },
      { name: '➕ 补录指标数据', value: 'supplement' },
      { name: '📤 导出运行报告', value: 'export' },
      { name: '🧪 生成示例数据', value: 'sample' },
      { name: '❌ 退出', value: 'exit' },
    ],
  });

  switch (choice) {
    case 'import':
      await handleImport();
      break;
    case 'runs':
      await handleRunsList();
      break;
    case 'anomalies':
      await handleAnomalies();
      break;
    case 'schema':
      await handleSchemaDiff();
      break;
    case 'supplement':
      await handleSupplement();
      break;
    case 'export':
      await handleExport();
      break;
    case 'sample':
      await handleSample();
      break;
    case 'exit':
      console.log(chalk.green('再见！'));
      return;
  }

  await showMainMenu();
}

async function handleImport(): Promise<void> {
  console.log(chalk.bold('\n--- 导入索引数据 ---'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'filePath',
      message: '数据文件路径 (.csv 或 .json):',
      validate: (v) => fs.existsSync(v) || '文件不存在',
    },
    {
      type: 'input',
      name: 'operator',
      message: '操作人:',
      default: process.env.USER || 'unknown',
    },
    {
      type: 'input',
      name: 'source',
      message: '数据来源标识:',
      default: 'manual_import',
    },
    {
      type: 'input',
      name: 'description',
      message: '运行说明 (可选):',
    },
  ]);

  const includeSchema = await inquirer.prompt({
    type: 'confirm',
    name: 'include',
    message: '是否同时导入 Schema 快照?',
    default: false,
  });

  const schemaSnapshots = includeSchema.include ? generateSampleSchemaSnapshots() : undefined;

  const result = importIndexData({
    filePath: answers.filePath,
    operator: answers.operator,
    source: answers.source,
    description: answers.description || undefined,
    schemaSnapshots,
  });

  console.log(chalk.green(`\n✅ 导入完成!`));
  console.log(`  运行ID: ${result.run.runId}`);
  console.log(`  索引建议: ${result.suggestionsCreated} 条`);
  console.log(`  异常记录: ${result.anomaliesCreated} 条`);
  console.log(`  Schema 快照: ${result.schemaSnapshotsSaved} 张表`);
  console.log(`  Schema 差异: ${result.schemaDiffsFound} 张表`);
  if (result.warnings.length) {
    console.log(chalk.yellow(`  警告: ${result.warnings.length} 条`));
  }
  if (result.errors.length) {
    console.log(chalk.red(`  错误: ${result.errors.length} 条`));
    result.errors.forEach((e) => console.log(chalk.red(`    - ${e}`)));
  }
}

async function handleRunsList(): Promise<void> {
  console.log(chalk.bold('\n--- 运行列表 ---'));

  const runs = listRuns(50);
  if (runs.length === 0) {
    console.log(chalk.gray('暂无运行记录'));
    return;
  }

  const table = new Table({
    head: ['运行ID', '时间', '操作人', '来源', '状态'],
    colWidths: [28, 20, 12, 18, 12],
  });

  for (const r of runs) {
    const statusColor =
      r.status === 'COMPLETED'
        ? chalk.green
        : r.status === 'FAILED'
        ? chalk.red
        : r.status === 'PARTIAL'
        ? chalk.yellow
        : chalk.gray;
    table.push([
      truncateText(r.runId, 26),
      formatTimestamp(r.timestamp),
      r.operator,
      truncateText(r.source, 16),
      statusColor(r.status),
    ]);
  }
  console.log(table.toString());

  const { runId } = await inquirer.prompt({
    type: 'list',
    name: 'runId',
    message: '选择运行查看详情 (或返回):',
    choices: [
      ...runs.map((r) => ({
        name: `${formatTimestamp(r.timestamp)} - ${r.source} [${r.status}]`,
        value: r.runId,
      })),
      { name: '↩️ 返回主菜单', value: '__back__' },
    ],
  });

  if (runId === '__back__') return;
  await showRunDetail(runId);
}

async function showRunDetail(runId: string): Promise<void> {
  const run = getRun(runId);
  if (!run) return;

  const stats = getAnomalyStats(runId);
  const suggestions = listSuggestions(runId);

  console.log(chalk.bold(`\n--- 运行详情: ${runId} ---`));
  console.log(`时间: ${formatTimestamp(run.timestamp)}`);
  console.log(`操作人: ${run.operator}  |  来源: ${run.source}`);
  if (run.description) console.log(`说明: ${run.description}`);
  if (run.parentRunId) console.log(`父运行: ${run.parentRunId}`);
  console.log(chalk.cyan(`\n索引建议: ${suggestions.length} 条`));
  console.log(chalk.red(`失效索引: ${suggestions.filter((s) => s.isInvalid).length} 条`));

  console.log(chalk.bold('\n异常分布:'));
  console.log(`  总计: ${stats.total} (未解决: ${chalk.red.bold(stats.unresolved)})`);
  console.log(
    `  严重程度: ${chalk.red('CRITICAL ' + stats.bySeverity.CRITICAL)}  ${chalk.yellow(
      'WARNING ' + stats.bySeverity.WARNING
    )}  ${chalk.blue('INFO ' + stats.bySeverity.INFO)}`
  );
  console.log(
    `  下一步: ${chalk.magenta('需补材料 ' + stats.byAction.PROVIDE_MATERIALS)}  ${chalk.cyan(
      '需改口径 ' + stats.byAction.FIX_CALIBRATION
    )}  ${chalk.yellow('需复核索引 ' + stats.byAction.REVIEW_INDEX)}  ${chalk.gray(
      '无需处理 ' + stats.byAction.NO_ACTION
    )}`
  );

  const { action } = await inquirer.prompt({
    type: 'list',
    name: 'action',
    message: '选择操作:',
    choices: [
      { name: '🔍 查看异常列表', value: 'anomalies' },
      { name: '📋 查看索引建议列表', value: 'suggestions' },
      { name: '📜 查看审计日志', value: 'audit' },
      { name: '📤 导出此运行报告', value: 'export' },
      { name: '↩️ 返回', value: 'back' },
    ],
  });

  if (action === 'anomalies') await handleAnomalies(runId);
  else if (action === 'suggestions') await showSuggestionsList(runId);
  else if (action === 'audit') await showAuditLogs(runId);
  else if (action === 'export') {
    const result = await exportRunReport(runId);
    console.log(chalk.green(`\n✅ 已导出: ${result.filePath}`));
  }
}

async function showSuggestionsList(runId: string): Promise<void> {
  const suggestions = listSuggestions(runId);
  if (suggestions.length === 0) {
    console.log(chalk.gray('无索引建议记录'));
    return;
  }

  const table = new Table({
    head: ['数据库', '表名', '索引名', '覆盖率', '执行次数', '状态'],
    colWidths: [14, 18, 28, 10, 12, 10],
  });

  for (const s of suggestions) {
    const covColor = s.coverageRate >= 0.7 ? chalk.green : s.coverageRate >= 0.4 ? chalk.yellow : chalk.red;
    table.push([
      s.databaseName,
      s.tableName,
      s.indexName,
      covColor((s.coverageRate * 100).toFixed(1) + '%'),
      String(s.executionCount),
      s.isInvalid ? chalk.red('失效') : chalk.green('正常'),
    ]);
  }
  console.log(table.toString());

  const { sid } = await inquirer.prompt({
    type: 'list',
    name: 'sid',
    message: '选择索引查看详情:',
    choices: [
      ...suggestions.map((s) => ({
        name: `${s.databaseName}.${s.tableName}.${s.indexName}`,
        value: s.id,
      })),
      { name: '↩️ 返回', value: '__back__' },
    ],
  });

  if (sid !== '__back__') {
    await showSuggestionDetail(sid, runId);
  }
}

async function showSuggestionDetail(sid: string, runId: string): Promise<void> {
  const s = getSuggestion(sid);
  if (!s) return;

  const anomalies = listAnomalies({ runId, suggestionId: sid });

  console.log(chalk.bold(`\n--- 索引建议详情 ---`));
  console.log(`ID: ${s.id}`);
  console.log(`${s.databaseName}.${s.tableName}.${s.indexName}`);
  console.log(`索引列: ${chalk.cyan(s.indexColumns.join(', '))}`);
  console.log(`覆盖列: ${chalk.green(s.coveredColumns.join(', '))}`);
  console.log(
    `覆盖率: ${(s.coverageRate * 100).toFixed(1)}%  |  执行次数: ${s.executionCount}  |  平均延迟: ${s.avgLatencyMs.toFixed(2)}ms`
  );
  console.log(`数据来源: ${s.sourceSystem}`);
  if (s.isInvalid) {
    console.log(chalk.red(`⚠  索引已失效: ${s.invalidReason}`));
  }

  if (anomalies.length > 0) {
    console.log(chalk.bold(`\n关联异常 (${anomalies.length}):`));
    for (const a of anomalies) {
      console.log(
        `  ${sevColor(a.severity, '[' + a.severity + ']')} ${chalk.bold(a.title)}` +
          `  →  ${actColor(a.nextAction, NEXT_ACTION_LABELS[a.nextAction])}`
      );
    }
  }
  console.log('');
}

async function handleAnomalies(scopeRunId?: string): Promise<void> {
  console.log(chalk.bold('\n--- 异常筛选 ---'));

  let runId = scopeRunId;
  if (!runId) {
    const runs = listRuns(20);
    if (runs.length === 0) {
      console.log(chalk.gray('暂无运行记录'));
      return;
    }
    const { selected } = await inquirer.prompt({
      type: 'list',
      name: 'selected',
      message: '选择运行范围:',
      choices: [
        { name: '所有运行', value: '__all__' },
        ...runs.map((r) => ({ name: `${formatTimestamp(r.timestamp)} - ${r.source}`, value: r.runId })),
      ],
    });
    runId = selected === '__all__' ? undefined : selected;
  }

  const filterAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'nextAction',
      message: '按下一步行动筛选:',
      choices: [
        { name: '全部', value: undefined },
        { name: '需补材料', value: 'PROVIDE_MATERIALS' as NextAction },
        { name: '需改口径', value: 'FIX_CALIBRATION' as NextAction },
        { name: '需复核索引', value: 'REVIEW_INDEX' as NextAction },
        { name: '无需处理', value: 'NO_ACTION' as NextAction },
      ],
    },
    {
      type: 'list',
      name: 'severity',
      message: '按严重程度筛选:',
      choices: [
        { name: '全部', value: undefined },
        { name: 'CRITICAL (严重)', value: 'CRITICAL' as AnomalySeverity },
        { name: 'WARNING (警告)', value: 'WARNING' as AnomalySeverity },
        { name: 'INFO (提示)', value: 'INFO' as AnomalySeverity },
      ],
    },
    {
      type: 'list',
      name: 'type',
      message: '按异常类型筛选:',
      choices: [
        { name: '全部', value: undefined },
        { name: '索引失效', value: 'INDEX_INVALID' as AnomalyType },
        { name: '锁等待超时', value: 'LOCK_WAIT_TIMEOUT' as AnomalyType },
        { name: 'Schema不匹配', value: 'SCHEMA_MISMATCH' as AnomalyType },
        { name: '指标缺失', value: 'MISSING_METRICS' as AnomalyType },
        { name: '覆盖率过低', value: 'COVERAGE_LOW' as AnomalyType },
        { name: '重复索引', value: 'DUPLICATE_INDEX' as AnomalyType },
      ],
    },
    {
      type: 'confirm',
      name: 'onlyUnresolved',
      message: '仅显示未解决异常?',
      default: true,
    },
  ]);

  const filters: AnomalyFilters = {
    runId,
    nextAction: filterAnswers.nextAction,
    severity: filterAnswers.severity,
    type: filterAnswers.type,
    isResolved: filterAnswers.onlyUnresolved ? false : undefined,
  };

  const anomalies = listAnomalies(filters);
  if (anomalies.length === 0) {
    console.log(chalk.gray('无符合条件的异常记录'));
    return;
  }

  console.log(chalk.bold(`\n找到 ${anomalies.length} 条异常:`));
  console.log(
    chalk.magenta('  需补材料: ') + anomalies.filter((a) => a.nextAction === 'PROVIDE_MATERIALS').length +
    chalk.cyan('    需改口径: ') + anomalies.filter((a) => a.nextAction === 'FIX_CALIBRATION').length +
    chalk.yellow('    需复核索引: ') + anomalies.filter((a) => a.nextAction === 'REVIEW_INDEX').length + '\n'
  );

  const table = new Table({
    head: ['严重', '下一步', '类型', '标题', '来源'],
    colWidths: [10, 12, 18, 44, 24],
  });

  for (const a of anomalies) {
    table.push([
      sevColor(a.severity, a.severity),
      actColor(a.nextAction, NEXT_ACTION_LABELS[a.nextAction]),
      a.type,
      truncateText(a.title, 42),
      truncateText(a.sourceRef, 22),
    ]);
  }
  console.log(table.toString());

  const { aid } = await inquirer.prompt({
    type: 'list',
    name: 'aid',
    message: '选择异常查看详情:',
    choices: [
      ...anomalies.map((a) => ({
        name: `${sevColor(a.severity, '[' + a.severity + ']')} ${a.title}`,
        value: a.id,
        short: a.title,
      })),
      { name: '↩️ 返回', value: '__back__' },
    ],
  });

  if (aid !== '__back__') {
    await showAnomalyDetail(aid);
  }
}

async function showAnomalyDetail(aid: string): Promise<void> {
  const a = getAnomaly(aid);
  if (!a) return;

  console.log(chalk.bold(`\n========== 异常详情 ==========`));
  console.log(chalk.red(`ID: ${a.id}`));
  console.log(
    `严重程度: ${sevColor(a.severity, a.severity)}    ` +
      `类型: ${chalk.bold(a.type)}    ` +
      `状态: ${a.isResolved ? chalk.green('已解决') : chalk.red.bold('未解决')}`
  );
  console.log(chalk.bold(`\n标题: ${a.title}`));
  console.log(`\n${chalk.bold('问题描述:')}`);
  console.log(`  ${chalk.white(a.description)}`);

  console.log(`\n${chalk.bold('数据来源:')} ${a.sourceRef}`);
  console.log(`创建时间: ${formatTimestamp(a.createdAt)}`);

  console.log(chalk.bold(`\n--- 下一步行动 ---`));
  console.log(actColor(a.nextAction, `▶ ${NEXT_ACTION_LABELS[a.nextAction]}`));

  console.log(chalk.bold(`\n--- 处理意见 ---`));
  console.log(`  ${a.handlingOpinion}`);

  if (a.materialsRequired && a.materialsRequired.length > 0) {
    console.log(chalk.bold(`\n--- 需补材料清单 ---`));
    a.materialsRequired.forEach((m, i) => {
      console.log(chalk.magenta(`  ${i + 1}. ${m}`));
    });
  }

  if (a.type === 'INDEX_INVALID') {
    console.log(chalk.red.bold(`\n⚠  索引失效拦截说明:`));
    console.log(chalk.red(`  该记录已被系统自动拦截，不可直接放行。`));
    console.log(chalk.red(`  研发团队即使只看导出报告也能通过"完整解释"栏理解拦截原因。`));
  }

  if (a.suggestionId) {
    console.log(chalk.bold(`\n--- 关联索引建议 ---`));
    await showSuggestionDetail(a.suggestionId, a.runId);
  }

  if (a.isResolved) {
    console.log(chalk.green(`\n✅ 已解决: ${a.resolutionNote}`));
    console.log(`解决人: ${a.resolvedBy}  时间: ${formatTimestamp(a.resolvedAt ?? 0)}`);
  } else {
    const { resolve } = await inquirer.prompt({
      type: 'confirm',
      name: 'resolve',
      message: '是否将此异常标记为已解决?',
      default: false,
    });
    if (resolve) {
      const { note } = await inquirer.prompt({
        type: 'input',
        name: 'note',
        message: '请输入解决说明:',
        validate: (v) => v.trim().length > 0 || '请输入说明',
      });
      const { operator } = await inquirer.prompt({
        type: 'input',
        name: 'operator',
        message: '操作人:',
        default: process.env.USER || 'unknown',
      });
      resolveAnomaly(a.id, operator, note);
      console.log(chalk.green('✅ 异常已标记为已解决'));
    }
  }
}

async function showAuditLogs(runId: string): Promise<void> {
  const logs = getAuditLogs(runId);
  console.log(chalk.bold(`\n--- 审计日志 (${logs.length} 条) ---`));

  const table = new Table({
    head: ['时间', '实体类型', '操作', '操作人', '说明'],
    colWidths: [20, 14, 10, 12, 50],
  });

  for (const log of logs) {
    table.push([
      formatTimestamp(log.timestamp),
      log.entityType,
      log.action,
      log.operator,
      truncateText(log.note ?? '', 48),
    ]);
  }
  console.log(table.toString());
}

async function handleSchemaDiff(): Promise<void> {
  console.log(chalk.bold('\n--- Schema 对比 ---'));
  const runs = listRuns(20);
  if (runs.length === 0) {
    console.log(chalk.gray('暂无运行记录'));
    return;
  }

  const { runId } = await inquirer.prompt({
    type: 'list',
    name: 'runId',
    message: '选择运行:',
    choices: runs.map((r) => ({ name: `${formatTimestamp(r.timestamp)} - ${r.source}`, value: r.runId })),
  });

  const snapshots = getSnapshotByRun(runId);
  if (snapshots.length === 0) {
    console.log(chalk.gray('该运行无 Schema 快照'));
    return;
  }

  console.log(`\n共 ${snapshots.length} 张表的快照\n`);

  for (const snap of snapshots) {
    const previous = getLatestSnapshot(snap.databaseName, snap.tableName, runId);
    if (!previous) {
      console.log(chalk.gray(`${snap.databaseName}.${snap.tableName}: 无历史快照，跳过对比`));
      continue;
    }
    const diff = compareSchemas(previous, snap);
    const hasChanges =
      diff.columnsAdded.length +
      diff.columnsRemoved.length +
      diff.columnsModified.length +
      diff.indexesAdded.length +
      diff.indexesRemoved.length;

    if (hasChanges === 0) {
      console.log(chalk.green(`${snap.databaseName}.${snap.tableName}: ✅ 无变化`));
    } else {
      console.log(chalk.yellow.bold(`${snap.databaseName}.${snap.tableName}: ⚠ 检测到 ${hasChanges} 处变更`));
      if (diff.columnsAdded.length)
        console.log(chalk.green(`  + 新增列: ${diff.columnsAdded.map((c) => c.name).join(', ')}`));
      if (diff.columnsRemoved.length)
        console.log(chalk.red(`  - 删除列: ${diff.columnsRemoved.map((c) => c.name).join(', ')}`));
      if (diff.columnsModified.length)
        console.log(
          chalk.cyan(
            `  ~ 修改列: ${diff.columnsModified.map((m) => `${m.old.name}(${m.old.type}→${m.new.type})`).join(', ')}`
          )
        );
      if (diff.indexesAdded.length)
        console.log(chalk.green(`  + 新增索引: ${diff.indexesAdded.map((i) => i.name).join(', ')}`));
      if (diff.indexesRemoved.length)
        console.log(chalk.red(`  - 删除索引: ${diff.indexesRemoved.map((i) => i.name).join(', ')}`));
    }
  }
  console.log('');
}

async function handleSupplement(): Promise<void> {
  console.log(chalk.bold('\n--- 指标补录 ---'));

  const runs = listRuns(20);
  if (runs.length === 0) {
    console.log(chalk.gray('暂无运行记录'));
    return;
  }

  const { runId } = await inquirer.prompt({
    type: 'list',
    name: 'runId',
    message: '选择要补录的运行:',
    choices: runs.map((r) => ({ name: `${formatTimestamp(r.timestamp)} - ${r.source}`, value: r.runId })),
  });

  const suggestions = listSuggestions(runId);
  if (suggestions.length === 0) {
    console.log(chalk.gray('无索引建议'));
    return;
  }

  const { sid } = await inquirer.prompt({
    type: 'list',
    name: 'sid',
    message: '选择索引建议:',
    choices: suggestions.map((s) => ({
      name: `${s.databaseName}.${s.tableName}.${s.indexName}`,
      value: s.id,
    })),
  });

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'metricName',
      message: '补录指标类型:',
      choices: [
        { name: '执行次数 (execution_count)', value: 'execution_count' },
        { name: '平均延迟 ms (avg_latency_ms)', value: 'avg_latency_ms' },
        { name: '覆盖率 (coverage_rate 0~1)', value: 'coverage_rate' },
      ],
    },
    {
      type: 'number',
      name: 'metricValue',
      message: '指标值:',
    },
    {
      type: 'input',
      name: 'source',
      message: '数据来源:',
      default: 'manual',
    },
    {
      type: 'input',
      name: 'operator',
      message: '操作人:',
      default: process.env.USER || 'unknown',
    },
  ]);

  supplementMetrics({
    runId,
    suggestionId: sid,
    metricName: answers.metricName,
    metricValue: answers.metricValue,
    source: answers.source,
    supplementedBy: answers.operator,
  });

  console.log(chalk.green('\n✅ 指标补录成功! 自动触发 Schema 重新对比...'));
  const results = await triggerSchemaRecheckAfterSupplement(runId, answers.operator);
  if (results.length > 0) {
    console.log(chalk.yellow(`检测到 ${results.length} 张表 Schema 变更:`));
    results.forEach((r) => console.log(`  ${r}`));
  } else {
    console.log(chalk.green('Schema 无新增变更'));
  }
}

async function handleExport(): Promise<void> {
  console.log(chalk.bold('\n--- 导出运行报告 ---'));

  const runs = listRuns(20);
  if (runs.length === 0) {
    console.log(chalk.gray('暂无运行记录'));
    return;
  }

  const { runId } = await inquirer.prompt({
    type: 'list',
    name: 'runId',
    message: '选择要导出的运行:',
    choices: runs.map((r) => ({
      name: `${formatTimestamp(r.timestamp)} - ${r.source} [${r.status}]`,
      value: r.runId,
    })),
  });

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'format',
      message: '导出格式:',
      choices: [
        { name: 'Excel (.xlsx) - 推荐，多Sheet带完整解释', value: 'xlsx' },
        { name: 'CSV 多文件', value: 'csv' },
      ],
    },
    {
      type: 'confirm',
      name: 'includeResolved',
      message: '是否包含已解决异常?',
      default: false,
    },
  ]);

  const outputDir = path.join(process.cwd(), 'exports');
  const result = await exportRunReport(runId, {
    format: answers.format as 'xlsx' | 'csv',
    includeResolved: answers.includeResolved,
    outputDir,
    explainAnomalies: true,
    includeDiff: true,
  });

  console.log(chalk.green('\n✅ 导出完成!'));
  console.log(`  文件: ${result.filePath}`);
  console.log(`  工作表: ${result.sheets.join(', ')}`);
  console.log(
    `  摘要: 索引建议 ${result.summary.totalSuggestions} 条, ` +
      `失效 ${result.summary.invalidIndexes}, ` +
      `异常 ${result.summary.totalAnomalies} (未解决 ${result.summary.unresolvedAnomalies}), ` +
      `Schema差异 ${result.summary.schemaDiffs}`
  );

  const history = getExportHistory(outputDir);
  if (history.length > 1) {
    console.log(chalk.gray(`\n导出目录历史文件: ${history.length} 个（文件名按运行时间+ID区分，可直接对比本次与上次运行）`));
  }
}

async function handleSample(): Promise<void> {
  console.log(chalk.bold('\n--- 生成示例数据 ---'));

  const outputDir = path.join(process.cwd(), 'sample_data');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const csvPath = path.join(outputDir, 'sample_indexes.csv');
  generateSampleCsv(csvPath);
  console.log(chalk.green(`✅ 示例 CSV 已生成: ${csvPath}`));

  const { doImport } = await inquirer.prompt({
    type: 'confirm',
    name: 'doImport',
    message: '是否立即导入示例数据进行演示?',
    default: true,
  });

  if (doImport) {
    const result = importIndexData({
      filePath: csvPath,
      operator: process.env.USER || 'demo',
      source: 'sample_demo',
      description: '示例数据导入 - 用于功能演示',
      schemaSnapshots: generateSampleSchemaSnapshots(),
      lockWaitThreshold: 30,
    });
    console.log(chalk.green(`\n✅ 演示数据导入完成! RunID: ${result.run.runId}`));
    console.log(`  建议: ${result.suggestionsCreated}, 异常: ${result.anomaliesCreated}, Schema差异: ${result.schemaDiffsFound}`);
  }
}
