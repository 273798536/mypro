#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { getDatabase, isDatabaseInitialized } from '../db/connection';
import { runMigrations } from '../db/schema';
import {
  SampleRepository,
  SizeModificationRepository,
  FabricRepository,
  FabricTransactionRepository,
  RefundRepository,
  ImportRepository,
  CheckRepository,
  AuditRepository,
  TaskRepository
} from '../db';
import {
  ImportService,
  CheckService,
  ExportService,
  ReportService,
  TaskQueue
} from '../services';
import { ExitCode, ConflictStrategy } from '../types';

const program = new Command();

program
  .name('gsi')
  .description('服装打版样衣多源导入巡检工具 CLI')
  .version('1.0.0');

function getCurrentUser(): string {
  return process.env.GSI_USER || process.env.USER || 'system';
}

function getDbConfig() {
  const dbPath = process.env.GSI_DB_PATH;
  return dbPath ? { dbPath } : {};
}

function getRepos() {
  const db = getDatabase(getDbConfig());
  return {
    db,
    sampleRepo: new SampleRepository(db),
    sizeRepo: new SizeModificationRepository(db),
    fabricRepo: new FabricRepository(db),
    fabricTxRepo: new FabricTransactionRepository(db),
    refundRepo: new RefundRepository(db),
    importRepo: new ImportRepository(db),
    checkRepo: new CheckRepository(db),
    auditRepo: new AuditRepository(db),
    taskRepo: new TaskRepository(db)
  };
}

program
  .command('init')
  .description('初始化数据库和工作目录')
  .option('--db-path <path>', '数据库文件路径')
  .action(async (options) => {
    try {
      const dbPath = options.dbPath || process.env.GSI_DB_PATH || './garment_inspection.db';
      
      if (isDatabaseInitialized({ dbPath })) {
        console.log(chalk.yellow('数据库已初始化'));
        process.exit(ExitCode.SUCCESS);
      }

      const db = getDatabase({ dbPath });
      runMigrations(db);
      
      console.log(chalk.green('✓ 数据库初始化成功'));
      console.log(chalk.green(`✓ 数据库路径: ${dbPath}`));
      process.exit(ExitCode.SUCCESS);
    } catch (error) {
      console.error(chalk.red('初始化失败:'), (error as Error).message);
      process.exit(ExitCode.ERROR);
    }
  });

program
  .command('import')
  .description('导入数据文件')
  .requiredOption('-t, --type <type>', '数据类型: sample_flow|size_modification|fabric_inout|refund')
  .requiredOption('-f, --file <path>', '数据文件路径 (CSV/Excel)')
  .option('-s, --sheet <name>', 'Excel工作表名称')
  .option('--conflict <strategy>', '冲突处理策略: ignore|overwrite|append', 'ignore' as ConflictStrategy)
  .option('--user <name>', '操作人', getCurrentUser())
  .option('--dry-run', '试运行，不实际写入数据')
  .action(async (options) => {
    if (!isDatabaseInitialized(getDbConfig())) {
      console.error(chalk.red('错误: 数据库未初始化，请先运行 gsi init'));
      process.exit(ExitCode.NOT_INITIALIZED);
    }

    try {
      const repos = getRepos();
      const importService = new ImportService(
        repos.sampleRepo,
        repos.sizeRepo,
        repos.fabricRepo,
        repos.fabricTxRepo,
        repos.refundRepo,
        repos.importRepo,
        repos.auditRepo,
        options.user
      );

      console.log(chalk.blue(`正在导入 ${options.file}...`));
      
      const result = await importService.import({
        sourceType: options.type,
        filePath: options.file,
        sheetName: options.sheet,
        conflictStrategy: options.conflict,
        importedBy: options.user,
        dryRun: options.dryRun
      });

      console.log('\n' + chalk.cyan('='.repeat(50)));
      console.log(chalk.cyan('导入结果'));
      console.log(chalk.cyan('='.repeat(50)));
      console.log(`批次号: ${chalk.yellow(result.batchId)}`);
      console.log(`数据类型: ${result.sourceType}`);
      console.log(`总数: ${result.total}`);
      console.log(chalk.green(`成功: ${result.success}`));
      console.log(chalk.yellow(`跳过: ${result.skipped}`));
      console.log(chalk.red(`失败: ${result.failed}`));

      if (result.warnings.length > 0) {
        console.log('\n' + chalk.yellow('警告:'));
        for (const warning of result.warnings) {
          console.log(`  ⚠ ${warning}`);
        }
      }

      if (result.errors.length > 0) {
        console.log('\n' + chalk.red('错误详情:'));
        for (const error of result.errors) {
          console.log(`  ✗ 行${error.rowNumber}: ${error.message}`);
        }

        if (!options.dryRun) {
          const exportService = new ExportService(
            repos.sampleRepo,
            repos.sizeRepo,
            repos.fabricTxRepo,
            repos.refundRepo,
            repos.checkRepo,
            repos.auditRepo
          );
          const errorFile = await exportService.exportFailedImports(
            result.errors,
            result.batchId,
            { format: 'xlsx', outputDir: './export' }
          );
          console.log(`\n${chalk.yellow('错误清单已导出至:')} ${errorFile}`);
        }
      }

      if (options.dryRun) {
        console.log('\n' + chalk.yellow('(试运行模式，未实际写入数据)'));
      }

      process.exit(result.failed > 0 ? ExitCode.IMPORT_FAILED : ExitCode.SUCCESS);
    } catch (error) {
      console.error(chalk.red('导入失败:'), (error as Error).message);
      process.exit(ExitCode.IMPORT_FAILED);
    }
  });

program
  .command('check')
  .description('运行数据校验检查')
  .option('--types <list>', '检查类型，逗号分隔: deposit_discrepancy,fabric_usage_tracking,missing_size_modification,refund_mismatch,version_consistency')
  .option('--sample <nos>', '指定样衣编号，逗号分隔')
  .option('--style <nos>', '指定款号，逗号分隔')
  .option('--user <name>', '操作人', getCurrentUser())
  .action(async (options) => {
    if (!isDatabaseInitialized(getDbConfig())) {
      console.error(chalk.red('错误: 数据库未初始化，请先运行 gsi init'));
      process.exit(ExitCode.NOT_INITIALIZED);
    }

    try {
      const repos = getRepos();
      const checkService = new CheckService(
        repos.sampleRepo,
        repos.sizeRepo,
        repos.fabricTxRepo,
        repos.refundRepo,
        repos.checkRepo,
        repos.auditRepo,
        options.user
      );

      const checkTypes = options.types ? options.types.split(',') : undefined;
      const sampleNos = options.sample ? options.sample.split(',') : undefined;
      const styleNos = options.style ? options.style.split(',') : undefined;

      console.log(chalk.blue('正在运行数据校验...'));
      
      const results = await checkService.runChecks({
        checkTypes,
        sampleNos,
        styleNos
      });

      console.log('\n' + chalk.cyan('='.repeat(50)));
      console.log(chalk.cyan('校验结果'));
      console.log(chalk.cyan('='.repeat(50)));

      const grouped = new Map<string, typeof results>();
      for (const r of results) {
        if (!grouped.has(r.type)) {
          grouped.set(r.type, []);
        }
        grouped.get(r.type)!.push(r);
      }

      for (const [type, items] of grouped) {
        console.log(`\n${chalk.bold(type)}: ${items.length} 项`);
        for (const item of items) {
          const severityColor = 
            item.severity === 'critical' ? chalk.red :
            item.severity === 'error' ? chalk.red :
            item.severity === 'warning' ? chalk.yellow :
            chalk.blue;
          
          console.log(`  [${severityColor(item.severity.toUpperCase())}] ${item.message}`);
          if (item.details.sourceRowNumber) {
            console.log(`    原始行号: ${item.details.sourceRowNumber}`);
          }
        }
      }

      const errorCount = results.filter(r => r.severity === 'error' || r.severity === 'critical').length;
      
      console.log('\n' + chalk.cyan('-'.repeat(50)));
      console.log(`总计: ${results.length} 项问题`);
      console.log(`严重/错误: ${chalk.red(errorCount)}`);
      console.log(`警告: ${chalk.yellow(results.filter(r => r.severity === 'warning').length)}`);
      console.log(`提示: ${chalk.blue(results.filter(r => r.severity === 'info').length)}`);

      process.exit(errorCount > 0 ? ExitCode.CHECK_FAILED : ExitCode.SUCCESS);
    } catch (error) {
      console.error(chalk.red('校验失败:'), (error as Error).message);
      process.exit(ExitCode.ERROR);
    }
  });

program
  .command('fix')
  .description('修复校验问题')
  .argument('[checkId]', '检查ID，不指定则列出所有问题')
  .option('--all', '修复所有可自动修复的问题')
  .option('--user <name>', '操作人', getCurrentUser())
  .action(async (checkId, options) => {
    if (!isDatabaseInitialized(getDbConfig())) {
      console.error(chalk.red('错误: 数据库未初始化，请先运行 gsi init'));
      process.exit(ExitCode.NOT_INITIALIZED);
    }

    try {
      const repos = getRepos();
      const checkService = new CheckService(
        repos.sampleRepo,
        repos.sizeRepo,
        repos.fabricTxRepo,
        repos.refundRepo,
        repos.checkRepo,
        repos.auditRepo,
        options.user
      );

      if (!checkId && !options.all) {
        const results = checkService.getCheckResults(false);
        
        if (results.length === 0) {
          console.log(chalk.green('没有待修复的问题'));
          process.exit(ExitCode.SUCCESS);
        }

        console.log(chalk.cyan('待修复问题列表:'));
        for (const r of results) {
          console.log(`  ${chalk.yellow(r.checkId)} - [${r.severity}] ${r.message}`);
        }
        console.log('\n使用: gsi fix <checkId> 修复单个问题');
        console.log('使用: gsi fix --all 修复所有可自动修复的问题');
        process.exit(ExitCode.SUCCESS);
      }

      if (options.all) {
        const results = checkService.getCheckResults(false);
        let fixedCount = 0;

        console.log(chalk.blue('正在修复所有可自动修复的问题...'));
        
        for (const r of results) {
          const result = await checkService.fixCheck(r.checkId);
          if (result.fixed) {
            console.log(chalk.green(`  ✓ ${r.checkId}: ${result.message}`));
            fixedCount++;
          } else {
            console.log(chalk.yellow(`  ⚠ ${r.checkId}: ${result.message}`));
          }
        }

        console.log(`\n修复完成: ${chalk.green(fixedCount)} 项已修复`);
      } else {
        const result = await checkService.fixCheck(checkId);
        if (result.fixed) {
          console.log(chalk.green(`✓ 修复成功: ${result.message}`));
        } else {
          console.log(chalk.yellow(`⚠ 修复失败: ${result.message}`));
        }
      }

      process.exit(ExitCode.SUCCESS);
    } catch (error) {
      console.error(chalk.red('修复失败:'), (error as Error).message);
      process.exit(ExitCode.ERROR);
    }
  });

program
  .command('report')
  .description('生成品牌企划报告')
  .option('-f, --format <format>', '输出格式: text|markdown|html', 'text')
  .option('-o, --output <path>', '输出文件路径')
  .action(async (options) => {
    if (!isDatabaseInitialized(getDbConfig())) {
      console.error(chalk.red('错误: 数据库未初始化，请先运行 gsi init'));
      process.exit(ExitCode.NOT_INITIALIZED);
    }

    try {
      const repos = getRepos();
      const reportService = new ReportService(
        repos.sampleRepo,
        repos.sizeRepo,
        repos.fabricTxRepo,
        repos.refundRepo,
        repos.checkRepo,
        repos.importRepo,
        repos.auditRepo
      );

      console.log(chalk.blue('正在生成品牌企划报告...'));
      
      const report = await reportService.generateBrandPlanningReport();
      const formatted = reportService.formatReport(report, options.format as any);

      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, formatted, 'utf8');
        console.log(chalk.green(`✓ 报告已导出至: ${options.output}`));
      } else {
        console.log('\n' + formatted);
      }

      process.exit(ExitCode.SUCCESS);
    } catch (error) {
      console.error(chalk.red('生成报告失败:'), (error as Error).message);
      process.exit(ExitCode.ERROR);
    }
  });

program
  .command('history')
  .description('查看历史变更记录')
  .option('--entity-type <type>', '实体类型: sample_flow|size_modification|fabric_transaction|refund')
  .option('--entity-id <id>', '实体ID')
  .option('--actor <name>', '操作人')
  .option('--action <action>', '操作类型')
  .option('--limit <n>', '显示条数', '50')
  .action(async (options) => {
    if (!isDatabaseInitialized(getDbConfig())) {
      console.error(chalk.red('错误: 数据库未初始化，请先运行 gsi init'));
      process.exit(ExitCode.NOT_INITIALIZED);
    }

    try {
      const repos = getRepos();
      
      const logs = repos.auditRepo.find({
        entityType: options.entityType,
        entityId: options.entityId,
        actor: options.actor,
        action: options.action
      }).slice(0, parseInt(options.limit));

      if (logs.length === 0) {
        console.log(chalk.yellow('没有找到历史记录'));
        process.exit(ExitCode.SUCCESS);
      }

      console.log(chalk.cyan('历史变更记录:'));
      console.log(chalk.cyan('-'.repeat(80)));
      
      for (const log of logs) {
        console.log(`\n${chalk.gray(log.timestamp)} | ${chalk.green(log.actor)} | ${chalk.blue(log.action)}`);
        console.log(`  实体: ${log.entityType}:${log.entityId}`);
        if (log.changes) {
          console.log('  变更:');
          for (const [field, change] of Object.entries(log.changes)) {
            console.log(`    ${field}: ${JSON.stringify(change.old)} → ${JSON.stringify(change.new)}`);
          }
        }
      }

      process.exit(ExitCode.SUCCESS);
    } catch (error) {
      console.error(chalk.red('查询历史失败:'), (error as Error).message);
      process.exit(ExitCode.ERROR);
    }
  });

program
  .command('export')
  .description('导出数据')
  .option('-t, --type <type>', '导出类型: all|sample_flow|size_modification|fabric_inout|refund|check_results', 'all')
  .option('-f, --format <format>', '格式: xlsx|csv|json', 'xlsx')
  .option('-o, --output <dir>', '输出目录', './export')
  .option('--include-source', '包含导入来源信息')
  .option('--include-history', '包含审计日志')
  .action(async (options) => {
    if (!isDatabaseInitialized(getDbConfig())) {
      console.error(chalk.red('错误: 数据库未初始化，请先运行 gsi init'));
      process.exit(ExitCode.NOT_INITIALIZED);
    }

    try {
      const repos = getRepos();
      const exportService = new ExportService(
        repos.sampleRepo,
        repos.sizeRepo,
        repos.fabricTxRepo,
        repos.refundRepo,
        repos.checkRepo,
        repos.auditRepo
      );

      console.log(chalk.blue('正在导出数据...'));
      
      const exportOptions = {
        format: options.format as any,
        outputDir: options.output,
        includeSource: options.includeSource,
        includeHistory: options.includeHistory
      };

      let files: string[] = [];

      if (options.type === 'all') {
        files = await exportService.exportAll(exportOptions);
      } else {
        switch (options.type) {
          case 'sample_flow':
            files = [await exportService.exportSampleFlow(exportOptions)];
            break;
          case 'size_modification':
            files = [await exportService.exportSizeModification(exportOptions)];
            break;
          case 'fabric_inout':
            files = [await exportService.exportFabricTransactions(exportOptions)];
            break;
          case 'refund':
            files = [await exportService.exportRefunds(exportOptions)];
            break;
          case 'check_results':
            files = [await exportService.exportCheckResults(exportOptions)];
            break;
          default:
            console.error(chalk.red(`未知导出类型: ${options.type}`));
            process.exit(ExitCode.INVALID_ARGS);
        }
      }

      console.log(chalk.green('✓ 导出完成!'));
      console.log(chalk.cyan('导出文件:'));
      for (const file of files) {
        console.log(`  - ${file}`);
      }

      process.exit(ExitCode.SUCCESS);
    } catch (error) {
      console.error(chalk.red('导出失败:'), (error as Error).message);
      process.exit(ExitCode.ERROR);
    }
  });

const taskCommand = program
  .command('task')
  .description('任务管理');

taskCommand
  .command('list')
  .description('列出任务')
  .option('--status <status>', '状态: pending|running|completed|failed_retry|failed_manual|failed_permanent')
  .action(async (options: { status?: string }) => {
    if (!isDatabaseInitialized(getDbConfig())) {
      console.error(chalk.red('错误: 数据库未初始化'));
      process.exit(ExitCode.NOT_INITIALIZED);
    }

    const repos = getRepos();
    const tasks = options.status 
      ? repos.taskRepo.findByStatus(options.status as any)
      : repos.taskRepo.findMany({ orderBy: 'created_at', orderDirection: 'DESC' });

    if (tasks.length === 0) {
      console.log(chalk.yellow('没有任务'));
      process.exit(ExitCode.SUCCESS);
    }

    console.log(chalk.cyan('任务列表:'));
    for (const task of tasks as any[]) {
      const statusColor = 
        task.status === 'completed' ? chalk.green :
        task.status === 'running' ? chalk.blue :
        task.status.startsWith('failed') ? chalk.red :
        chalk.yellow;
      
      console.log(`  ${chalk.yellow(task.taskId)} | ${statusColor(task.status)} | ${task.type} | ${task.createdAt}`);
    }
  });

program.parseAsync(process.argv);
