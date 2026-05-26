#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import dayjs from 'dayjs';
import path from 'path';
import os from 'os';

import { DataStoreManager } from './utils/store';
import { DataImporter } from './utils/import';
import { DataChecker } from './utils/check';
import { DataFixer } from './utils/fix';
import { DataExporter } from './utils/export';
import { ExitCodes, ImportMode, DataSource } from './types';

const program = new Command();

program
  .name('contract-cli')
  .description('法务合同履约多源导入巡检 CLI 工具')
  .version('1.0.0')
  .option('-w, --workspace <path>', '工作目录', path.join(os.homedir(), '.contract-cli'))
  .option('-u, --user <name>', '操作者', process.env.USER || 'unknown')
  .option('-f, --format <format>', '输出格式: json|csv|table', 'table');

program
  .command('init')
  .description('初始化工作空间')
  .action(async () => {
    const opts = program.opts();
    try {
      const store = new DataStoreManager(opts.workspace);
      await store.init();
      console.log(chalk.green(`✓ 工作空间已初始化: ${opts.workspace}`));
      process.exit(ExitCodes.SUCCESS);
    } catch (err: any) {
      console.error(chalk.red(`✗ 初始化失败: ${err.message}`));
      process.exit(ExitCodes.GENERAL_ERROR);
    }
  });

program
  .command('import')
  .description('导入数据文件')
  .requiredOption('-s, --source <type>', '数据来源: contract_pdf|payment_node|acceptance_email|refund_record')
  .requiredOption('-m, --mode <mode>', '导入模式: ignore|overwrite|append')
  .requiredOption('-f, --file <path>', '导入文件路径')
  .option('-n, --name <name>', '批次名称')
  .action(async (options) => {
    const opts = program.opts();
    try {
      const importer = new DataImporter(opts.workspace, opts.user);
      const result = await importer.importFromFile(
        options.file,
        options.source as DataSource,
        options.mode as ImportMode,
        options.name
      );

      if (opts.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const table = new Table({
          head: ['项目', '值'],
          colWidths: [20, 50],
        });
        table.push(['批次ID', result.batchId]);
        table.push(['总记录数', result.totalRecords]);
        table.push(['成功', chalk.green(result.successCount.toString())]);
        table.push(['失败', chalk.red(result.failedCount.toString())]);
        console.log(table.toString());

        if (result.errors.length > 0) {
          console.log('\n' + chalk.yellow('错误详情:'));
          const errorTable = new Table({
            head: ['行号', '错误信息'],
            colWidths: [10, 60],
          });
          result.errors.forEach(e => errorTable.push([e.row, e.message]));
          console.log(errorTable.toString());
        }
      }

      process.exit(result.success ? ExitCodes.SUCCESS : ExitCodes.IMPORT_ERROR);
    } catch (err: any) {
      console.error(chalk.red(`✗ 导入失败: ${err.message}`));
      process.exit(ExitCodes.IMPORT_ERROR);
    }
  });

program
  .command('check')
  .description('执行数据校验')
  .option('-b, --batch <id>', '指定批次ID')
  .action(async (options) => {
    const opts = program.opts();
    try {
      const checker = new DataChecker(opts.workspace, opts.user);
      const report = await checker.runAllChecks(options.batch);

      if (opts.format === 'json') {
        console.log(JSON.stringify(report, null, 2));
      } else {
        const summaryTable = new Table({
          head: ['检查批次', '检查时间', '操作人', '总数', '错误', '警告', '信息', '自动解决'],
          colWidths: [20, 25, 15, 10, 10, 10, 10, 10],
        });
        summaryTable.push([
          report.batchId,
          dayjs(report.checkedAt).format('YYYY-MM-DD HH:mm:ss'),
          report.checkedBy,
          report.totalChecks,
          chalk.red(report.errorCount.toString()),
          chalk.yellow(report.warningCount.toString()),
          chalk.blue(report.infoCount.toString()),
          chalk.green((report.autoResolvedCount || 0).toString()),
        ]);
        console.log(summaryTable.toString());

        if (report.errorCount > 0) {
          console.log('\n' + chalk.red('错误清单:'));
          const errorTable = new Table({
            head: ['原始行号', '合同编号', '问题描述'],
            colWidths: [12, 20, 48],
          });
          report.results
            .filter(r => r.severity === 'error')
            .forEach(r => errorTable.push([
              r.originalLineNo || '-',
              r.contractNo,
              r.message
            ]));
          console.log(errorTable.toString());
        }
      }

      process.exit(report.errorCount > 0 ? ExitCodes.CHECK_ERROR : ExitCodes.SUCCESS);
    } catch (err: any) {
      console.error(chalk.red(`✗ 校验失败: ${err.message}`));
      process.exit(ExitCodes.CHECK_ERROR);
    }
  });

program
  .command('fix')
  .description('修复校验问题或直接修正数据')
  .option('-i, --id <id>', '检查结果ID')
  .option('-t, --type <type>', '批量修复类型')
  .requiredOption('-r, --reason <text>', '修复原因')
  .option('-v, --value <value>', '新值')
  .option('-b, --batch <id>', '批次ID')
  .option('--entity-type <type>', '直接修正: 实体类型 PaymentNode|AcceptanceRecord|RefundRecord|Contract')
  .option('--entity-id <id>', '直接修正: 实体业务ID(如nodeId, acceptanceId等)')
  .option('--field <field>', '直接修正: 字段名')
  .option('--field-value <value>', '直接修正: 字段新值')
  .action(async (options) => {
    const opts = program.opts();
    try {
      const fixer = new DataFixer(opts.workspace, opts.user);

      if (options.entityType && options.entityId && options.field && options.fieldValue !== undefined) {
        let result: any = null;
        const parsedValue = isNaN(Number(options.fieldValue)) ? options.fieldValue : Number(options.fieldValue);
        const updates: any = {};
        updates[options.field] = parsedValue;

        switch (options.entityType) {
          case 'PaymentNode':
            result = await fixer.updatePaymentNodeDirectly(options.entityId, updates, options.reason);
            break;
          case 'AcceptanceRecord':
            result = await fixer.updateAcceptanceRecordDirectly(options.entityId, updates, options.reason);
            break;
          case 'RefundRecord':
            result = await fixer.updateRefundRecordDirectly(options.entityId, updates, options.reason);
            break;
          case 'Contract':
            const storeManager = new DataStoreManager(opts.workspace);
            result = await storeManager.updateContract(options.entityId, updates, opts.user, options.reason);
            break;
          default:
            console.error(chalk.red('✗ 不支持的实体类型'));
            process.exit(ExitCodes.VALIDATION_ERROR);
        }

        if (result) {
          console.log(chalk.green(`✓ ${options.entityType} 修正成功`));
          if (opts.format === 'json') {
            console.log(JSON.stringify(result, null, 2));
          }
          process.exit(ExitCodes.SUCCESS);
        } else {
          console.error(chalk.red('✗ 未找到该实体或修正失败'));
          process.exit(ExitCodes.GENERAL_ERROR);
        }
      } else if (options.id) {
        const success = await fixer.resolveCheck(options.id, options.reason, options.value);
        if (success) {
          console.log(chalk.green('✓ 修复成功'));
          process.exit(ExitCodes.SUCCESS);
        } else {
          console.error(chalk.red('✗ 未找到该检查结果'));
          process.exit(ExitCodes.GENERAL_ERROR);
        }
      } else if (options.type) {
        const count = await fixer.batchResolve(options.type, options.reason, options.batch);
        console.log(chalk.green(`✓ 批量修复完成，共处理 ${count} 条记录`));
        process.exit(ExitCodes.SUCCESS);
      } else {
        const failedList = await fixer.getFailedList(options.batch);
        if (failedList.length === 0) {
          console.log(chalk.green('✓ 没有待修复的错误'));
          process.exit(ExitCodes.SUCCESS);
        }

        console.log(chalk.yellow('待修复错误清单:'));
        const table = new Table({
          head: ['ID', '原始行号', '合同编号', '实体类型', '问题'],
          colWidths: [38, 12, 15, 18, 27],
        });
        failedList.forEach(r => table.push([
          r.id, 
          r.originalLineNo || '-', 
          r.contractNo, 
          r.entityType || 'Contract',
          r.message
        ]));
        console.log(table.toString());
        process.exit(ExitCodes.SUCCESS);
      }
    } catch (err: any) {
      console.error(chalk.red(`✗ 修复失败: ${err.message}`));
      process.exit(ExitCodes.GENERAL_ERROR);
    }
  });

program
  .command('report')
  .description('生成巡检报告')
  .option('-b, --batch <id>', '指定批次ID')
  .option('--latest', '只显示最新批次的结果')
  .action(async (options) => {
    const opts = program.opts();
    try {
      const store = new DataStoreManager(opts.workspace);
      const checker = new DataChecker(opts.workspace, opts.user);

      const contracts = await store.getContracts();
      const allBatches = await store.getImportBatches();
      
      let targetBatchId = options.batch;
      if (options.latest && !targetBatchId) {
        targetBatchId = allBatches[allBatches.length - 1]?.id;
      }

      const errors = await checker.getChecksBySeverity('error', targetBatchId);
      const warnings = await checker.getChecksBySeverity('warning', targetBatchId);
      const allChecks = await store.getCheckResults(targetBatchId);
      const resolvedCount = allChecks.filter(c => c.resolved).length;

      if (opts.format === 'json') {
        console.log(JSON.stringify({
          contractCount: contracts.length,
          errorCount: errors.length,
          warningCount: warnings.length,
          resolvedCount,
          batchCount: allBatches.length,
          errors,
          warnings,
        }, null, 2));
      } else {
        console.log(chalk.bold('\n=== 法务合同履约巡检报告 ===\n'));

        const summaryTable = new Table({
          head: ['统计项', '数量'],
          colWidths: [30, 30],
        });
        summaryTable.push(
          ['合同总数', contracts.length],
          ['错误数', chalk.red(errors.length.toString())],
          ['警告数', chalk.yellow(warnings.length.toString())],
          ['已自动解决', chalk.green(resolvedCount.toString())],
          ['导入批次总数', allBatches.length]
        );
        console.log(summaryTable.toString());

        if (errors.length > 0) {
          console.log('\n' + chalk.bold.red('重点关注 - 错误清单:'));
          const errorTable = new Table({
            head: ['原始行号', '合同编号', '问题描述'],
            colWidths: [12, 20, 48],
          });
          errors.forEach(e => errorTable.push([
            e.originalLineNo || '-',
            e.contractNo,
            e.message
          ]));
          console.log(errorTable.toString());
        }

        console.log('\n' + chalk.gray('使用 contract-cli export 导出详细报告'));
      }

      process.exit(ExitCodes.SUCCESS);
    } catch (err: any) {
      console.error(chalk.red(`✗ 生成报告失败: ${err.message}`));
      process.exit(ExitCodes.GENERAL_ERROR);
    }
  });

program
  .command('history')
  .description('查看变更历史')
  .option('-c, --contract <no>', '合同编号')
  .option('-l, --limit <n>', '显示条数', '50')
  .action(async (options) => {
    const opts = program.opts();
    try {
      const store = new DataStoreManager(opts.workspace);
      let logs;

      if (options.contract) {
        const contract = await store.getContractByNo(options.contract);
        if (!contract) {
          console.error(chalk.red('✗ 合同不存在'));
          process.exit(ExitCodes.NO_DATA);
        }
        logs = await store.getChangeLogs(contract.id);
      } else {
        logs = await store.getChangeLogs();
      }

      const limit = parseInt(options.limit);
      logs = logs.slice(-limit).reverse();

      if (opts.format === 'json') {
        console.log(JSON.stringify(logs, null, 2));
      } else {
        const table = new Table({
          head: ['时间', '操作人', '实体', '字段', '变更', '原因'],
          colWidths: [20, 12, 12, 15, 20, 21],
        });

        logs.forEach(log => {
          const oldVal = typeof log.oldValue === 'object' ? JSON.stringify(log.oldValue) : String(log.oldValue);
          const newVal = typeof log.newValue === 'object' ? JSON.stringify(log.newValue) : String(log.newValue);
          table.push([
            dayjs(log.changedAt).format('MM-DD HH:mm'),
            log.changedBy,
            log.entityType,
            log.field,
            `${oldVal.substring(0, 8)} → ${newVal.substring(0, 8)}`,
            log.reason.substring(0, 18)
          ]);
        });

        console.log(table.toString());
      }

      process.exit(ExitCodes.SUCCESS);
    } catch (err: any) {
      console.error(chalk.red(`✗ 查询历史失败: ${err.message}`));
      process.exit(ExitCodes.GENERAL_ERROR);
    }
  });

program
  .command('export')
  .description('导出数据')
  .requiredOption('-t, --type <type>', '导出类型: check|contract|history|full')
  .option('-o, --output <dir>', '输出目录', './exports')
  .option('-c, --contract <no>', '合同编号(用于contract类型)')
  .option('-b, --batch <id>', '批次ID(用于check类型)')
  .option('--latest', '只导出最新批次数据(用于check类型)')
  .option('--format <format>', '文件格式: json|csv', 'json')
  .option('--raw', '包含原始数据')
  .action(async (options) => {
    const opts = program.opts();
    try {
      const exporter = new DataExporter(opts.workspace);
      const outputDir = path.resolve(options.output);

      let filePath: string;

      switch (options.type) {
        case 'check': {
          let targetBatchId = options.batch;
          if (options.latest && !targetBatchId) {
            const store = new DataStoreManager(opts.workspace);
            const allBatches = await store.getImportBatches();
            targetBatchId = allBatches[allBatches.length - 1]?.id;
          }
          filePath = await exporter.exportCheckReport({
            format: options.format,
            outputDir,
          }, targetBatchId);
          break;
        }
        case 'contract':
          if (!options.contract) {
            console.error(chalk.red('✗ 请指定合同编号 -c'));
            process.exit(ExitCodes.VALIDATION_ERROR);
          }
          filePath = await exporter.exportContractDetails(options.contract, {
            format: options.format,
            outputDir,
          });
          break;
        case 'history':
          filePath = await exporter.exportImportHistory({
            format: options.format,
            outputDir,
          });
          break;
        case 'full':
          filePath = await exporter.exportFullData({
            format: options.format,
            outputDir,
            includeRaw: options.raw,
          });
          break;
        default:
          console.error(chalk.red('✗ 不支持的导出类型'));
          process.exit(ExitCodes.VALIDATION_ERROR);
          return;
      }

      console.log(chalk.green(`✓ 导出成功: ${filePath}`));
      process.exit(ExitCodes.SUCCESS);
    } catch (err: any) {
      console.error(chalk.red(`✗ 导出失败: ${err.message}`));
      process.exit(ExitCodes.GENERAL_ERROR);
    }
  });

program
  .command('retry')
  .description('重试失败的导入任务')
  .action(async () => {
    const opts = program.opts();
    try {
      const importer = new DataImporter(opts.workspace, opts.user);
      const results = await importer.retryFailedBatches();

      if (results.length === 0) {
        console.log(chalk.green('✓ 没有需要重试的任务'));
      } else {
        console.log(chalk.green(`✓ 重试完成，共处理 ${results.length} 个批次`));
      }

      process.exit(ExitCodes.SUCCESS);
    } catch (err: any) {
      console.error(chalk.red(`✗ 重试失败: ${err.message}`));
      process.exit(ExitCodes.GENERAL_ERROR);
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red(`✗ 命令执行失败: ${err.message}`));
  process.exit(ExitCodes.GENERAL_ERROR);
});
