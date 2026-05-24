#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { storage } from './storage/FileStorage';
import { importService } from './services/ImportService';
import { checkService } from './services/CheckService';
import { fixService } from './services/FixService';
import { reportService } from './services/ReportService';
import { exportService } from './services/ExportService';
import { auditService } from './services/AuditService';
import { formatDiff } from './utils/diff';
import { EntityType } from './types';

const program = new Command();

program
  .name('ticket-cli')
  .description('客服工单升级多源导入巡检工具')
  .version('1.0.0');

program
  .command('init')
  .description('初始化巡检工具工作目录')
  .action(() => {
    if (storage.isInitialized()) {
      console.log(chalk.yellow('⚠️  工作目录已存在'));
      console.log(`目录位置: ${storage.getBaseDir()}`);
      return;
    }

    storage.init();
    console.log(chalk.green('✅ 巡检工具初始化完成'));
    console.log(`工作目录: ${storage.getBaseDir()}`);
    console.log('');
    console.log('可用命令:');
    console.log('  ticket-cli import    - 导入数据');
    console.log('  ticket-cli check     - 执行数据检查');
    console.log('  ticket-cli fix       - 自动修复问题');
    console.log('  ticket-cli report    - 生成报表');
    console.log('  ticket-cli history   - 查看历史记录');
    console.log('  ticket-cli export    - 导出数据');
    console.log('  ticket-cli audit     - 执行自动化审计');
  });

program
  .command('import')
  .description('导入数据文件')
  .requiredOption('-f, --file <path>', 'JSON文件路径')
  .requiredOption(
    '-t, --type <type>',
    '数据类型: ticket|sessionSummary|slaRule|compensationApproval|customerServiceNote|exceptionPhoto|assignmentHistory'
  )
  .option('-u, --user <name>', '操作人', 'system')
  .option('--allow-duplicates', '允许重复导入', false)
  .action((options) => {
    if (!storage.isInitialized()) {
      console.log(chalk.red('❌ 请先执行 init 命令初始化工作目录'));
      process.exit(1);
    }

    try {
      console.log(chalk.blue(`📥 正在导入文件: ${options.file}`));
      console.log(chalk.blue(`数据类型: ${options.type}`));

      const result = importService.importFromJsonFile(
        options.file,
        options.type as EntityType,
        options.user,
        !options.allowDuplicates
      );

      console.log('');
      console.log(chalk.green('✅ 导入完成'));
      console.log(`批次ID: ${result.batchId}`);
      console.log(`成功: ${chalk.green(result.successCount)} 条`);
      console.log(`失败: ${chalk.red(result.failedCount)} 条`);

      if (result.errors.length > 0) {
        console.log('');
        console.log(chalk.yellow('失败详情:'));
        const table = new Table({
          head: ['行号', '错误类型', '错误信息'],
          colWidths: [10, 20, 50],
        });

        for (const err of result.errors.slice(0, 10)) {
          table.push([
            err.originalRowNumber,
            err.errorType,
            err.errorMessage.slice(0, 45) + (err.errorMessage.length > 45 ? '...' : ''),
          ]);
        }

        console.log(table.toString());

        if (result.errors.length > 10) {
          console.log(`... 还有 ${result.errors.length - 10} 条错误`);
        }

        const templatePath = exportService.generateFailedRecordsTemplate(result.batchId);
        console.log('');
        console.log(chalk.cyan(`💡 修复模板已生成: ${templatePath}`));
        console.log('   请修改后使用 import 命令重新导入');
      }
    } catch (e) {
      console.log(chalk.red(`❌ 导入失败: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('执行数据完整性检查')
  .option('-d, --detail', '显示详细信息', false)
  .action((options) => {
    if (!storage.isInitialized()) {
      console.log(chalk.red('❌ 请先执行 init 命令初始化工作目录'));
      process.exit(1);
    }

    console.log(chalk.blue('🔍 正在执行数据检查...'));
    const result = checkService.runAllChecks();

    console.log('');
    console.log(chalk[result.totalIssues === 0 ? 'green' : 'yellow'](
      `检查完成，发现 ${result.totalIssues} 个问题`
    ));
    console.log('');

    const summaryTable = new Table({
      head: ['检查项', '问题数'],
      colWidths: [30, 10],
    });

    summaryTable.push(['SLA违规', result.slaViolations.length]);
    summaryTable.push(['转派冲突', result.assignmentConflicts.length]);
    summaryTable.push(['待审批补偿', result.pendingCompensations.length]);
    summaryTable.push(['孤立记录', result.orphanedRecords.length]);
    summaryTable.push(['数据不一致', result.dataInconsistencies.length]);

    console.log(summaryTable.toString());

    if (options.detail) {
      if (result.slaViolations.length > 0) {
        console.log('');
        console.log(chalk.red('SLA违规详情:'));
        const slaTable = new Table({
          head: ['工单ID', '规则名称', '截止时间'],
          colWidths: [20, 20, 25],
        });
        for (const sla of result.slaViolations) {
          slaTable.push([sla.ticketId, sla.ruleName, sla.deadline]);
        }
        console.log(slaTable.toString());
      }

      if (result.assignmentConflicts.length > 0) {
        console.log('');
        console.log(chalk.yellow('转派冲突详情:'));
        const conflictTable = new Table({
          head: ['工单号', '转派次数', '责任人', '补偿金额'],
          colWidths: [15, 10, 25, 12],
        });
        for (const conflict of result.assignmentConflicts) {
          conflictTable.push([
            conflict.ticketNo,
            conflict.transfers.length,
            conflict.timeoutResponsible.join(',') || '-',
            `¥${conflict.compensationAmount}`,
          ]);
        }
        console.log(conflictTable.toString());
      }

      if (result.orphanedRecords.length > 0) {
        console.log('');
        console.log(chalk.yellow('孤立记录详情:'));
        const orphanTable = new Table({
          head: ['类型', 'ID', '关联工单ID'],
          colWidths: [20, 20, 20],
        });
        for (const orphan of result.orphanedRecords.slice(0, 10)) {
          orphanTable.push([orphan.type, orphan.id, orphan.ticketId]);
        }
        console.log(orphanTable.toString());
        if (result.orphanedRecords.length > 10) {
          console.log(`... 还有 ${result.orphanedRecords.length - 10} 条`);
        }
      }
    }

    if (result.totalIssues > 0) {
      console.log('');
      console.log(chalk.cyan('💡 建议执行 fix 命令自动修复可修复的问题'));
    }
  });

program
  .command('fix')
  .description('自动修复可修复的问题')
  .option('-u, --user <name>', '操作人', 'system')
  .option('--sla', '仅修复SLA违规标记')
  .option('--orphans', '仅清理孤立记录')
  .action((options) => {
    if (!storage.isInitialized()) {
      console.log(chalk.red('❌ 请先执行 init 命令初始化工作目录'));
      process.exit(1);
    }

    console.log(chalk.blue('🔧 正在执行自动修复...'));
    console.log('');

    if (options.sla || !options.orphans) {
      const slaResult = fixService.fixSLAViolations(options.user);
      console.log(`SLA违规标记: 修复 ${chalk.green(slaResult.fixedCount)} 条`);
    }

    if (options.orphans || !options.sla) {
      const orphanResult = fixService.fixOrphanedRecords(options.user);
      console.log(`孤立记录: 清理 ${chalk.green(orphanResult.fixedCount)} 条`);
    }

    console.log('');
    console.log(chalk.green('✅ 自动修复完成'));
    console.log(chalk.cyan('💡 建议执行 check 命令验证修复结果'));
  });

program
  .command('report')
  .description('生成巡检报表')
  .option('-s, --save', '保存到文件')
  .option('-o, --output <path>', '输出文件路径')
  .action((options) => {
    if (!storage.isInitialized()) {
      console.log(chalk.red('❌ 请先执行 init 命令初始化工作目录'));
      process.exit(1);
    }

    const report = reportService.generateTextReport();
    console.log(report);

    if (options.save) {
      const filePath = reportService.saveReportToFile(options.output);
      console.log('');
      console.log(chalk.green(`📄 报表已保存到: ${filePath}`));
    }
  });

program
  .command('history')
  .description('查看操作历史')
  .option('-l, --limit <number>', '显示条数', '50')
  .option('--entity-type <type>', '按实体类型过滤')
  .option('--entity-id <id>', '按实体ID过滤')
  .option('--batch-id <id>', '按批次ID过滤')
  .option('-d, --diff', '显示差异详情', false)
  .action((options) => {
    if (!storage.isInitialized()) {
      console.log(chalk.red('❌ 请先执行 init 命令初始化工作目录'));
      process.exit(1);
    }

    let history = auditService.getRecentHistory(parseInt(options.limit));

    if (options.entityType) {
      history = history.filter((h) => h.entityType === options.entityType);
    }
    if (options.entityId) {
      history = history.filter((h) => h.entityId === options.entityId);
    }
    if (options.batchId) {
      history = history.filter((h) => h.batchId === options.batchId);
    }

    console.log(chalk.blue(`📜 操作历史 (共 ${history.length} 条)`));
    console.log('');

    for (const record of history) {
      const time = new Date(record.performedAt).toLocaleString();
      console.log(chalk.gray(`[${time}]`));
      console.log(
        `${chalk.cyan(record.action)} ${chalk.magenta(record.entityType)}:${record.entityId}`
      );
      console.log(`操作人: ${record.performedBy}`);
      if (record.batchId) {
        console.log(`批次: ${record.batchId}`);
      }
      if (options.diff && record.diff.length > 0) {
        console.log(chalk.gray('变更详情:'));
        console.log(formatDiff(record.diff));
      }
      console.log('');
    }
  });

program
  .command('export')
  .description('导出数据')
  .option('-a, --all', '导出所有数据')
  .option('-t, --tickets', '导出行单数据')
  .option('-f, --failed', '导出失败记录')
  .option('--ticket <id>', '导出指定工单详情')
  .option('--batch <id>', '按批次过滤')
  .option('--with-history', '包含历史记录')
  .option('--with-errors', '包含错误记录')
  .option('--check-consistency <file>', '检查导出文件一致性')
  .action((options) => {
    if (!storage.isInitialized()) {
      console.log(chalk.red('❌ 请先执行 init 命令初始化工作目录'));
      process.exit(1);
    }

    if (options.checkConsistency) {
      console.log(chalk.blue('🔍 检查导出文件一致性...'));
      const result = exportService.checkExportConsistency(options.checkConsistency);

      if (result.isConsistent) {
        console.log(chalk.green('✅ 导出文件与当前数据一致'));
      } else {
        console.log(chalk.red('❌ 发现不一致:'));
        for (const mismatch of result.mismatches) {
          console.log(
            `  ${mismatch.type}:${mismatch.entityId} ${mismatch.field}`
          );
          console.log(`    导出值: ${JSON.stringify(mismatch.exportValue)}`);
          console.log(`    当前值: ${JSON.stringify(mismatch.historyValue)}`);
        }
      }
      return;
    }

    let filePath: string | null = null;

    if (options.all) {
      filePath = exportService.exportAllData({
        includeHistory: options.withHistory,
        includeErrors: options.withErrors,
      });
    } else if (options.tickets) {
      filePath = exportService.exportTickets();
    } else if (options.failed) {
      filePath = exportService.exportFailedRecords(options.batch);
    } else if (options.ticket) {
      filePath = exportService.exportTicketDetail(options.ticket);
      if (!filePath) {
        console.log(chalk.red('❌ 未找到指定工单'));
        process.exit(1);
      }
    } else {
      console.log(chalk.yellow('⚠️  请指定导出类型'));
      console.log('使用 --all 导出所有数据');
      console.log('使用 --tickets 导出行单数据');
      console.log('使用 --failed 导出失败记录');
      console.log('使用 --ticket <id> 导出指定工单详情');
      process.exit(1);
    }

    console.log(chalk.green(`📦 数据已导出: ${filePath}`));
  });

program
  .command('audit')
  .description('执行自动化审计检查')
  .option('-d, --detail', '显示详细信息', false)
  .action((options) => {
    if (!storage.isInitialized()) {
      console.log(chalk.red('❌ 请先执行 init 命令初始化工作目录'));
      process.exit(1);
    }

    console.log(chalk.blue('🔐 执行自动化审计检查...'));
    console.log('');

    const results = auditService.runAllAuditChecks();
    let passed = 0;
    let failed = 0;

    for (const result of results) {
      const status = result.passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      console.log(`${status} ${result.name}: ${result.message}`);

      if (options.detail && result.details) {
        for (const detail of result.details) {
          console.log(chalk.gray(`   - ${detail}`));
        }
      }

      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    }

    console.log('');
    console.log(chalk.blue(`审计完成: ${passed} 通过, ${failed} 失败`));
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(chalk.red(`❌ 错误: ${e.message}`));
  process.exit(1);
});
