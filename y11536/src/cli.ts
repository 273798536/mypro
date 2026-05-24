#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import path from 'path';
import fs from 'fs';
import { AttendanceDatabase } from './database';
import { ImportService } from './importService';
import { CheckService } from './checkService';
import { ReportService } from './reportService';
import { SourceType, AttendanceStatus } from './types';

const program = new Command();
const DEFAULT_DATA_DIR = path.join(process.cwd(), '.attendance-data');

function getDataDir(options: any): string {
  return options.dataDir || DEFAULT_DATA_DIR;
}

async function withDb<T>(
  options: any,
  fn: (db: AttendanceDatabase) => Promise<T>
): Promise<T> {
  const dataDir = getDataDir(options);
  const db = new AttendanceDatabase(dataDir);
  try {
    await db.init();
    return await fn(db);
  } finally {
    await db.close();
  }
}

program
  .name('attend')
  .description('企业培训签到多源导入巡检 CLI')
  .version('1.0.0')
  .option('-d, --data-dir <path>', '数据目录', DEFAULT_DATA_DIR);

program
  .command('init')
  .description('初始化巡检工作目录')
  .action(async (options) => {
    try {
      const dataDir = getDataDir(program.opts());
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const db = new AttendanceDatabase(dataDir);
      await db.init();
      await db.close();

      console.log(chalk.green('✓ 初始化成功'));
      console.log(chalk.gray(`数据目录: ${dataDir}`));
    } catch (error: any) {
      console.error(chalk.red(`✗ 初始化失败: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('import')
  .description('导入签到数据')
  .requiredOption('-f, --file <path>', '导入文件路径')
  .requiredOption('-t, --type <type>', '来源类型: registration|qrcode|homework|external_receipt')
  .option('-o, --operator <name>', '操作者', 'system')
  .action(async (options) => {
    try {
      const sourceType = options.type as SourceType;
      const validTypes: SourceType[] = ['registration', 'qrcode', 'homework', 'external_receipt'];
      
      if (!validTypes.includes(sourceType)) {
        throw new Error(`无效的来源类型，必须是: ${validTypes.join(', ')}`);
      }

      if (!fs.existsSync(options.file)) {
        throw new Error(`文件不存在: ${options.file}`);
      }

      const result = await withDb(program.opts(), async (db) => {
        const importService = new ImportService(db);
        return await importService.importFromFile(options.file, sourceType, options.operator);
      });

      console.log(chalk.green('✓ 导入完成'));
      console.log(`批次ID: ${chalk.cyan(result.batchId)}`);
      console.log(`来源文件: ${chalk.cyan(result.sourceFile)}`);
      console.log(`来源类型: ${chalk.cyan(result.sourceType)}`);
      console.log(`总计: ${chalk.white(result.total)} | 成功: ${chalk.green(result.success)} | 失败: ${chalk.red(result.failed)}`);

      if (result.failures.length > 0) {
        console.log('\n' + chalk.red.bold('失败清单:'));
        const table = new Table({
          head: ['行号', '错误信息'],
          colWidths: [10, 80],
        });
        for (const failure of result.failures) {
          table.push([
            failure.lineNumber,
            failure.error,
          ]);
        }
        console.log(table.toString());
      }
    } catch (error: any) {
      console.error(chalk.red(`✗ 导入失败: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('运行一致性检查')
  .option('-o, --operator <name>', '操作者', 'system')
  .action(async (options) => {
    try {
      const result = await withDb(program.opts(), async (db) => {
        const checkService = new CheckService(db);
        return await checkService.runChecks(options.operator);
      });

      console.log(chalk.green('✓ 检查完成'));
      console.log(`检查时间: ${chalk.cyan(result.checkedAt)}`);
      console.log(`总记录数: ${chalk.white(result.totalRecords)}`);
      console.log(`新增问题: ${chalk.yellow(result.totalIssues)}`);
      console.log(`严重问题: ${chalk.red(result.criticalIssues)}`);

      if (result.newIssues.length > 0) {
        console.log('\n' + chalk.yellow.bold('问题清单:'));
        const table = new Table({
          head: ['记录ID', '类型', '严重程度', '描述'],
          colWidths: [40, 25, 12, 50],
        });
        for (const issue of result.newIssues) {
          const severityColor = issue.severity === 'critical' ? chalk.red :
                                issue.severity === 'high' ? chalk.magenta :
                                issue.severity === 'medium' ? chalk.yellow : chalk.green;
          table.push([
            issue.recordId,
            issue.type,
            severityColor(issue.severity),
            issue.description,
          ]);
        }
        console.log(table.toString());
      }
    } catch (error: any) {
      console.error(chalk.red(`✗ 检查失败: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('fix')
  .description('人工改判记录状态')
  .requiredOption('-r, --record-id <id>', '记录ID')
  .requiredOption('-s, --status <status>', '目标状态: confirmed|withdrawn|failed|manually_corrected')
  .requiredOption('-R, --reason <text>', '改判原因')
  .option('-o, --operator <name>', '操作者', 'system')
  .action(async (options) => {
    try {
      const targetStatus = options.status as AttendanceStatus;
      const validStatuses: AttendanceStatus[] = ['confirmed', 'withdrawn', 'failed', 'manually_corrected'];
      
      if (!validStatuses.includes(targetStatus)) {
        throw new Error(`无效的状态，必须是: ${validStatuses.join(', ')}`);
      }

      await withDb(program.opts(), async (db) => {
        const record = await db.getRecord(options.recordId);
        if (!record) {
          throw new Error(`记录不存在: ${options.recordId}`);
        }

        await db.updateRecordStatus(
          options.recordId,
          targetStatus,
          options.operator,
          `人工改判: ${options.reason}`
        );

        const issues = await db.getAllIssues();
        for (const issue of issues) {
          if (issue.recordId === options.recordId && !issue.resolved) {
            await db.resolveIssue(issue.id, options.operator);
          }
        }
      });

      console.log(chalk.green('✓ 改判成功'));
      console.log(`记录ID: ${chalk.cyan(options.recordId)}`);
      console.log(`新状态: ${chalk.cyan(options.status)}`);
      console.log(`原因: ${chalk.gray(options.reason)}`);
    } catch (error: any) {
      console.error(chalk.red(`✗ 改判失败: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('freeze')
  .description('冻结记录（导出前锁定）')
  .requiredOption('-r, --record-id <id>', '记录ID')
  .requiredOption('-R, --reason <text>', '冻结原因')
  .option('-o, --operator <name>', '操作者', 'system')
  .action(async (options) => {
    try {
      await withDb(program.opts(), async (db) => {
        const record = await db.getRecord(options.recordId);
        if (!record) {
          throw new Error(`记录不存在: ${options.recordId}`);
        }

        await db.freezeRecord(options.recordId, options.operator, options.reason);
      });

      console.log(chalk.green('✓ 冻结成功'));
      console.log(`记录ID: ${chalk.cyan(options.recordId)}`);
      console.log(`原因: ${chalk.gray(options.reason)}`);
    } catch (error: any) {
      console.error(chalk.red(`✗ 冻结失败: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('unfreeze')
  .description('解冻记录')
  .requiredOption('-r, --record-id <id>', '记录ID')
  .option('-o, --operator <name>', '操作者', 'system')
  .action(async (options) => {
    try {
      await withDb(program.opts(), async (db) => {
        const record = await db.getRecord(options.recordId);
        if (!record) {
          throw new Error(`记录不存在: ${options.recordId}`);
        }

        await db.unfreezeRecord(options.recordId, options.operator, '手动解冻');
      });

      console.log(chalk.green('✓ 解冻成功'));
      console.log(`记录ID: ${chalk.cyan(options.recordId)}`);
    } catch (error: any) {
      console.error(chalk.red(`✗ 解冻失败: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('report')
  .description('生成巡检报告')
  .action(async () => {
    try {
      const report = await withDb(program.opts(), async (db) => {
        const reportService = new ReportService(db);
        return await reportService.generateReport();
      });

      console.log(chalk.green.bold('\n=== 企业培训签到巡检报告 ===\n'));
      console.log(`生成时间: ${chalk.cyan(report.generatedAt)}`);
      console.log(`总记录数: ${chalk.white(report.totalRecords)}`);
      console.log(`未解决问题: ${chalk.yellow(report.unresolvedIssues)}`);
      console.log(`冻结记录: ${chalk.blue(report.frozenRecords)}`);

      console.log('\n' + chalk.bold('状态分布:'));
      const statusTable = new Table({
        head: ['状态', '数量'],
        colWidths: [25, 10],
      });
      for (const [status, count] of Object.entries(report.statusBreakdown)) {
        if (count > 0) {
          statusTable.push([status, count]);
        }
      }
      console.log(statusTable.toString());

      console.log('\n' + chalk.bold('来源分布:'));
      const sourceTable = new Table({
        head: ['来源类型', '数量'],
        colWidths: [25, 10],
      });
      for (const [source, count] of Object.entries(report.sourceBreakdown)) {
        if (count > 0) {
          sourceTable.push([source, count]);
        }
      }
      console.log(sourceTable.toString());

      if (report.duplicateTrackingNumbers.length > 0) {
        console.log('\n' + chalk.red.bold('重复快递单号列表:'));
        for (const tn of report.duplicateTrackingNumbers) {
          console.log(chalk.red(`  - ${tn}`));
        }
      }

      if (report.failedImports.length > 0) {
        console.log('\n' + chalk.red.bold('导入失败记录:'));
        const failTable = new Table({
          head: ['来源文件', '行号', '错误信息'],
          colWidths: [30, 10, 50],
        });
        for (const fail of report.failedImports) {
          failTable.push([
            fail.sourceFile,
            fail.lineNumber,
            fail.error,
          ]);
        }
        console.log(failTable.toString());
      }
    } catch (error: any) {
      console.error(chalk.red(`✗ 生成报告失败: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('history')
  .description('查看记录历史')
  .requiredOption('-r, --record-id <id>', '记录ID')
  .action(async (options) => {
    try {
      const history = await withDb(program.opts(), async (db) => {
        const record = await db.getRecord(options.recordId);
        if (!record) {
          throw new Error(`记录不存在: ${options.recordId}`);
        }
        return await db.getRecordHistory(options.recordId);
      });

      console.log(chalk.green.bold(`\n=== 记录历史: ${options.recordId} ===\n`));

      const table = new Table({
        head: ['时间', '操作者', '原状态', '新状态', '原因'],
        colWidths: [25, 15, 18, 18, 40],
      });

      for (const h of history) {
        table.push([
          h.timestamp,
          h.operator,
          h.fromStatus || '-',
          h.toStatus,
          h.reason,
        ]);
      }

      console.log(table.toString());
    } catch (error: any) {
      console.error(chalk.red(`✗ 查询历史失败: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('export')
  .description('导出数据')
  .option('-o, --output <path>', '输出目录', './exports')
  .option('-t, --type <type>', '导出类型: main|sources|failures|all', 'all')
  .option('-f, --include-frozen', '包含冻结记录')
  .action(async (options) => {
    try {
      const outputDir = path.resolve(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const results: string[] = [];

      await withDb(program.opts(), async (db) => {
        const reportService = new ReportService(db);

        if (options.type === 'main' || options.type === 'all') {
          const mainPath = path.join(outputDir, 'attendance_main.csv');
          await reportService.exportToCSV(mainPath, options.includeFrozen);
          results.push(mainPath);
        }

        if (options.type === 'sources' || options.type === 'all') {
          const sourcesPath = path.join(outputDir, 'attendance_sources.csv');
          await reportService.exportWithSources(sourcesPath);
          results.push(sourcesPath);
        }

        if (options.type === 'failures' || options.type === 'all') {
          const failuresPath = path.join(outputDir, 'import_failures.csv');
          await reportService.exportFailures(failuresPath);
          results.push(failuresPath);
        }
      });

      console.log(chalk.green('✓ 导出成功'));
      for (const r of results) {
        console.log(chalk.gray(`  - ${r}`));
      }
    } catch (error: any) {
      console.error(chalk.red(`✗ 导出失败: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('列出所有记录')
  .option('-s, --status <status>', '按状态过滤')
  .option('-f, --include-frozen', '包含冻结记录')
  .action(async (options) => {
    try {
      const records = await withDb(program.opts(), async (db) => {
        return await db.getAllRecords();
      });

      let filtered = records;
      
      if (!options.includeFrozen) {
        filtered = filtered.filter(r => !r.isFrozen);
      }
      
      if (options.status) {
        filtered = filtered.filter(r => r.currentStatus === options.status);
      }

      console.log(chalk.green(`找到 ${filtered.length} 条记录\n`));

      const table = new Table({
        head: ['记录ID', '员工', '快递单号', '课程', '日期', '状态', '来源数', '问题'],
        colWidths: [20, 15, 20, 15, 12, 15, 10, 10],
      });

      for (const r of filtered) {
        const statusColor = r.currentStatus === 'confirmed' ? chalk.green :
                           r.currentStatus === 'duplicate' ? chalk.red :
                           r.currentStatus === 'proxy_sign' ? chalk.magenta :
                           r.currentStatus === 'makeup_sign' ? chalk.yellow : chalk.white;
        table.push([
          r.id.substring(0, 8) + '...',
          r.employeeName,
          r.trackingNumber,
          r.courseName,
          r.attendDate,
          statusColor(r.currentStatus),
          r.sources.length,
          r.issues.filter(i => !i.resolved).length,
        ]);
      }

      console.log(table.toString());
    } catch (error: any) {
      console.error(chalk.red(`✗ 查询失败: ${error.message}`));
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(chalk.red(`错误: ${error.message}`));
  process.exit(1);
});
