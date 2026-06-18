#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { showMainMenu } from './cli/menu';
import { importIndexData, generateSampleCsv, generateSampleSchemaSnapshots } from './services/importService';
import { exportRunReport, getExportHistory } from './services/exportService';
import { listRuns, getRun } from './services/runService';
import { listAnomalies, getAnomalyStats, NEXT_ACTION_LABELS } from './services/anomalyService';
import { listSuggestions } from './services/suggestionService';
import { formatTimestamp } from './utils/helpers';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();

program
  .name('index-coverage')
  .description('索引覆盖建议 CLI - 数据平台索引分析与异常追踪工具')
  .version('1.0.0');

program
  .command('interactive', { isDefault: true })
  .description('启动交互式菜单（默认模式）')
  .action(async () => {
    try {
      await showMainMenu();
    } catch (e) {
      console.error(chalk.red('❌ 出错:'), (e as Error).message);
      process.exit(1);
    }
  });

program
  .command('import <filePath>')
  .description('导入索引数据 (CSV/JSON)')
  .requiredOption('-o, --operator <name>', '操作人', process.env.USER || 'unknown')
  .option('-s, --source <src>', '数据来源标识', 'cli_import')
  .option('-d, --description <desc>', '运行说明')
  .option('-p, --parent <runId>', '父运行ID（用于关联返工等）')
  .option('--with-schema', '同时导入示例 Schema 快照进行对比', false)
  .action(async (filePath: string, opts) => {
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red('❌ 文件不存在:'), filePath);
      process.exit(1);
    }
    const result = importIndexData({
      filePath,
      operator: opts.operator,
      source: opts.source,
      description: opts.description,
      parentRunId: opts.parent,
      schemaSnapshots: opts.withSchema ? generateSampleSchemaSnapshots() : undefined,
    });
    console.log(chalk.green('✅ 导入完成'));
    console.log(`  RunID: ${result.run.runId}`);
    console.log(`  索引建议: ${result.suggestionsCreated}`);
    console.log(`  异常: ${result.anomaliesCreated}`);
    console.log(`  Schema差异: ${result.schemaDiffsFound}`);
    if (result.errors.length) {
      console.log(chalk.red(`  错误: ${result.errors.length}`));
      result.errors.forEach((e) => console.log(chalk.red(`    - ${e}`)));
    }
  });

program
  .command('export <runId>')
  .description('导出运行报告')
  .option('-f, --format <fmt>', '格式: xlsx|csv', 'xlsx')
  .option('-r, --include-resolved', '包含已解决异常', false)
  .option('-d, --output-dir <dir>', '输出目录', path.join(process.cwd(), 'exports'))
  .action(async (runId: string, opts) => {
    try {
      const result = await exportRunReport(runId, {
        format: opts.format,
        includeResolved: opts.includeResolved,
        outputDir: opts.outputDir,
        explainAnomalies: true,
        includeDiff: true,
      });
      console.log(chalk.green('✅ 导出完成'));
      console.log(`  文件: ${result.filePath}`);
      console.log(`  工作表: ${result.sheets.join(', ')}`);
      console.log(
        `  摘要: ${result.summary.totalSuggestions} 建议, ${result.summary.invalidIndexes} 失效, ` +
          `${result.summary.totalAnomalies} 异常(${result.summary.unresolvedAnomalies}未解决)`
      );
    } catch (e) {
      console.error(chalk.red('❌ 导出失败:'), (e as Error).message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('列出运行记录')
  .option('-n, --limit <n>', '显示条数', '20')
  .action((opts) => {
    const runs = listRuns(parseInt(opts.limit, 10));
    if (runs.length === 0) {
      console.log(chalk.gray('暂无运行记录'));
      return;
    }
    for (const r of runs) {
      console.log(
        `${chalk.cyan(r.runId)}  ${formatTimestamp(r.timestamp)}  ` +
          `${r.operator}  ${r.source}  [${r.status}]`
      );
    }
  });

program
  .command('status <runId>')
  .description('查看运行状态与统计')
  .action((runId: string) => {
    const run = getRun(runId);
    if (!run) {
      console.error(chalk.red('❌ Run 不存在'));
      process.exit(1);
    }
    const stats = getAnomalyStats(runId);
    const suggestions = listSuggestions(runId);
    console.log(chalk.bold(`\n=== Run: ${runId} ===`));
    console.log(`时间: ${formatTimestamp(run.timestamp)}  操作人: ${run.operator}  来源: ${run.source}`);
    console.log(`状态: ${run.status}`);
    console.log(chalk.cyan(`\n索引建议: ${suggestions.length} (失效: ${suggestions.filter((s) => s.isInvalid).length})`));
    console.log(
      chalk.red(
        `异常: ${stats.total} (未解决: ${stats.unresolved})  ` +
          `${chalk.red('CRITICAL ' + stats.bySeverity.CRITICAL)} ` +
          `${chalk.yellow('WARNING ' + stats.bySeverity.WARNING)} ` +
          `${chalk.blue('INFO ' + stats.bySeverity.INFO)}`
      )
    );
    console.log(
      `下一步: ${chalk.magenta('需补材料 ' + stats.byAction.PROVIDE_MATERIALS)}  ` +
        `${chalk.cyan('需改口径 ' + stats.byAction.FIX_CALIBRATION)}  ` +
        `${chalk.yellow('需复核索引 ' + stats.byAction.REVIEW_INDEX)}  ` +
        `${chalk.gray('无需处理 ' + stats.byAction.NO_ACTION)}`
    );
  });

program
  .command('anomalies [runId]')
  .description('列出异常')
  .option('--action <type>', '按下一步筛选: PROVIDE_MATERIALS|FIX_CALIBRATION|REVIEW_INDEX|NO_ACTION')
  .option('--severity <level>', '按严重程度: CRITICAL|WARNING|INFO')
  .option('--resolved', '包含已解决', false)
  .action((runId: string | undefined, opts) => {
    const list = listAnomalies({
      runId,
      nextAction: opts.action,
      severity: opts.severity,
      isResolved: opts.resolved ? undefined : false,
    });
    if (list.length === 0) {
      console.log(chalk.gray('无异常记录'));
      return;
    }
    console.log(chalk.bold(`共 ${list.length} 条异常:\n`));
    for (const a of list) {
      const sevColor =
        a.severity === 'CRITICAL' ? chalk.red.bold : a.severity === 'WARNING' ? chalk.yellow : chalk.blue;
      const actionColor =
        a.nextAction === 'PROVIDE_MATERIALS'
          ? chalk.magenta
          : a.nextAction === 'FIX_CALIBRATION'
          ? chalk.cyan
          : a.nextAction === 'REVIEW_INDEX'
          ? chalk.yellow
          : chalk.gray;
      console.log(
        `${sevColor('[' + a.severity + ']')} ${chalk.bold(a.title)}` +
          `  → ${actionColor(NEXT_ACTION_LABELS[a.nextAction])}` +
          `  ${chalk.gray(a.id)}`
      );
      console.log(chalk.gray(`  ${a.description}`));
      console.log(chalk.gray(`  处理意见: ${a.handlingOpinion}\n`));
    }
  });

program
  .command('sample [outputDir]')
  .description('生成示例 CSV 数据文件')
  .action((outputDir: string) => {
    const dir = outputDir || path.join(process.cwd(), 'sample_data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'sample_indexes.csv');
    generateSampleCsv(filePath);
    console.log(chalk.green(`✅ 示例文件已生成: ${filePath}`));
  });

program
  .command('exports')
  .description('查看导出历史')
  .option('-d, --output-dir <dir>', '导出目录', path.join(process.cwd(), 'exports'))
  .action((opts) => {
    const history = getExportHistory(opts.outputDir);
    if (history.length === 0) {
      console.log(chalk.gray('暂无导出文件'));
      return;
    }
    console.log(chalk.bold(`共 ${history.length} 个导出文件 (按时间倒序，文件名含RunID可区分):\n`));
    for (const h of history.slice(0, 20)) {
      const size = (h.size / 1024).toFixed(1) + 'KB';
      console.log(`${formatTimestamp(h.modifiedAt)}  ${size.padStart(8)}  ${h.fileName}`);
    }
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(chalk.red('❌ 未处理异常:'), e);
  process.exit(1);
});
