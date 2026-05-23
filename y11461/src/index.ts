#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { loadDatabase, saveDatabase, findUserByUsername } from './utils/database';
import { assertPermission, getRoleName, filterRecordsByRole } from './utils/permissions';
import { DataSource } from './types';
import { initDatabase } from './commands/init';
import { importCsvFile, getDataSourceName } from './utils/importer';
import { checkRecords } from './commands/check';
import { fixRecord, autoFixRecord, rejectRecord, approveRecord } from './commands/fix';
import { generateReport, getStatusName } from './commands/report';
import { getRecordHistory, getAllHistory } from './commands/history';
import { exportData, exportFailedRecords } from './commands/export';
import { getDirtyTypeName } from './utils/detector';

const program = new Command();

program
  .name('dmi')
  .description('口腔门诊材料多源导入巡检工具')
  .version('1.0.0')
  .option('-u, --user <username>', '当前操作用户名', 'admin');

async function getCurrentUser() {
  const opts = program.opts();
  const db = loadDatabase();
  const user = findUserByUsername(db, opts.user);
  
  if (!user) {
    console.error(chalk.red(`用户 "${opts.user}" 不存在`));
    process.exit(1);
  }
  
  return { user, db };
}

program
  .command('init')
  .description('初始化数据库')
  .option('-n, --name <name>', '管理员名称', '系统管理员')
  .action(async (options) => {
    try {
      const db = loadDatabase();
      await initDatabase(db, options.name);
      console.log(chalk.green('✓ 数据库初始化成功'));
      console.log(chalk.cyan('默认用户:'));
      console.log('  admin   - 主管');
      console.log('  entry   - 录入员');
      console.log('  reviewer - 复核员');
      console.log('  viewer  - 只读查看');
    } catch (e: any) {
      console.error(chalk.red(`错误: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('import')
  .description('导入数据文件')
  .requiredOption('-f, --file <path>', 'CSV 文件路径')
  .requiredOption('-s, --source <type>', '数据来源: implant|appointment|invoice|manual')
  .action(async (options) => {
    try {
      const { user, db } = await getCurrentUser();
      assertPermission(user.role, 'import');

      const sourceMap: Record<string, DataSource> = {
        implant: DataSource.IMPLANT_BATCH,
        appointment: DataSource.APPOINTMENT,
        invoice: DataSource.SUPPLIER_INVOICE,
        manual: DataSource.MANUAL_ENTRY
      };

      const source = sourceMap[options.source];
      if (!source) {
        throw new Error(`无效的数据来源: ${options.source}`);
      }

      console.log(chalk.cyan(`正在导入 ${getDataSourceName(source)} 数据...`));
      const result = await importCsvFile(options.file, source, user.username, db);
      saveDatabase(db);

      console.log(chalk.green(`✓ 导入完成`));
      console.log(`  总计: ${result.total} 条`);
      console.log(`  成功: ${chalk.green(result.success)} 条`);
      console.log(`  失败: ${chalk.red(result.failed)} 条`);
      console.log(`  有问题: ${chalk.yellow(result.dirty)} 条`);

      if (result.errors.length > 0) {
        console.log(chalk.red('\n错误详情:'));
        result.errors.forEach(e => console.log(`  - ${e}`));
      }
    } catch (e: any) {
      console.error(chalk.red(`错误: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('检查记录问题')
  .option('-r, --recheck', '重新检查所有记录')
  .action(async (options) => {
    try {
      const { user, db } = await getCurrentUser();
      assertPermission(user.role, 'check');

      console.log(chalk.cyan('正在检查记录...'));
      const result = checkRecords(db, options.recheck);

      console.log(chalk.green('✓ 检查完成'));
      console.log(`  总记录: ${result.total} 条`);
      console.log(`  问题数: ${chalk.yellow(result.dirtyCount)} 个`);

      console.log(chalk.cyan('\n问题分类:'));
      for (const [type, count] of Object.entries(result.dirtyByType)) {
        if (count > 0) {
          console.log(`  ${getDirtyTypeName(type as any)}: ${count} 个`);
        }
      }

      if (result.dirtyCount > 0) {
        console.log(chalk.yellow('\n有问题的记录:'));
        const table = new Table({
          head: ['记录ID', '原始行号', '批号', '材料名称', '问题类型', '描述']
        });
        
        result.dirtyRecords.slice(0, 10).forEach(dirty => {
          const record = db.records.find(r => r.id === dirty.recordId);
          table.push([
            dirty.recordId.slice(0, 8),
            String(record?.sourceLine || '-'),
            record?.batchNumber || '-',
            record?.materialName || '-',
            getDirtyTypeName(dirty.dirtyType),
            dirty.description.slice(0, 30)
          ]);
        });
        
        console.log(table.toString());
        if (result.dirtyCount > 10) {
          console.log(chalk.gray(`  ... 还有 ${result.dirtyCount - 10} 条问题记录`));
        }
      }
    } catch (e: any) {
      console.error(chalk.red(`错误: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('fix')
  .description('修正记录')
  .requiredOption('-i, --id <id>', '记录ID')
  .option('-f, --field <field>', '字段名')
  .option('-v, --value <value>', '新值')
  .option('-a, --auto', '自动修正')
  .option('-r, --reason <reason>', '修正原因', '手动修正')
  .action(async (options) => {
    try {
      const { user, db } = await getCurrentUser();
      assertPermission(user.role, 'fix');

      let result;
      
      if (options.auto) {
        result = autoFixRecord(db, options.id, user.username);
      } else if (options.field && options.value) {
        const updates: any = {};
        updates[options.field] = isNaN(Number(options.value)) ? options.value : Number(options.value);
        result = fixRecord(db, options.id, updates, user.username, options.reason);
      } else {
        throw new Error('请指定 --field 和 --value，或使用 --auto 自动修正');
      }

      if (result.success) {
        console.log(chalk.green(`✓ ${result.message}`));
      } else {
        console.log(chalk.yellow(`⚠ ${result.message}`));
      }
    } catch (e: any) {
      console.error(chalk.red(`错误: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('reject')
  .description('驳回记录')
  .requiredOption('-i, --id <id>', '记录ID')
  .option('-r, --reason <reason>', '驳回原因', '数据有误')
  .action(async (options) => {
    try {
      const { user, db } = await getCurrentUser();
      assertPermission(user.role, 'reject');

      const result = rejectRecord(db, options.id, user.username, options.reason);
      
      if (result.success) {
        console.log(chalk.green(`✓ ${result.message}`));
      } else {
        console.log(chalk.yellow(`⚠ ${result.message}`));
      }
    } catch (e: any) {
      console.error(chalk.red(`错误: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('approve')
  .description('审核通过记录')
  .requiredOption('-i, --id <id>', '记录ID')
  .action(async (options) => {
    try {
      const { user, db } = await getCurrentUser();
      assertPermission(user.role, 'approve');

      const result = approveRecord(db, options.id, user.username);
      
      if (result.success) {
        console.log(chalk.green(`✓ ${result.message}`));
      } else {
        console.log(chalk.yellow(`⚠ ${result.message}`));
      }
    } catch (e: any) {
      console.error(chalk.red(`错误: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('report')
  .description('生成巡检报告')
  .action(async () => {
    try {
      const { user, db } = await getCurrentUser();
      assertPermission(user.role, 'report');

      const report = generateReport(db, user.username);

      console.log(chalk.cyan('═'.repeat(50)));
      console.log(chalk.cyan('           口腔门诊材料巡检报告'));
      console.log(chalk.cyan('═'.repeat(50)));
      console.log(`生成时间: ${report.generatedAt}`);
      console.log(`生成人: ${report.generatedBy}`);
      console.log();

      console.log(chalk.bold('一、汇总统计'));
      console.log(`  总记录数: ${report.summary.totalRecords}`);
      console.log(`  待处理: ${chalk.yellow(report.summary.pendingReview)} 条`);
      console.log();

      console.log(chalk.bold('二、按状态分布'));
      for (const [status, count] of Object.entries(report.summary.byStatus)) {
        if (count > 0) {
          console.log(`  ${getStatusName(status as any)}: ${count} 条`);
        }
      }
      console.log();

      console.log(chalk.bold('三、按来源分布'));
      for (const [source, count] of Object.entries(report.summary.bySource)) {
        if (count > 0) {
          console.log(`  ${getDataSourceName(source as any)}: ${count} 条`);
        }
      }
      console.log();

      console.log(chalk.bold('四、问题分类'));
      let hasDirty = false;
      for (const [type, count] of Object.entries(report.summary.dirtyByType)) {
        if (count > 0) {
          hasDirty = true;
          console.log(`  ${getDirtyTypeName(type as any)}: ${count} 个`);
        }
      }
      if (!hasDirty) {
        console.log(chalk.green('  ✓ 暂无问题记录'));
      }
      console.log();

      if (report.failedRecords.length > 0) {
        console.log(chalk.bold('五、失败清单（院区主任关注重点）'));
        const table = new Table({
          head: ['原始行号', '源文件', '来源', '批号', '材料名称', '问题数']
        });
        
        report.failedRecords.forEach(fr => {
          table.push([
            String(fr.sourceLine),
            fr.sourceFile,
            fr.source,
            fr.batchNumber,
            fr.materialName,
            String(fr.issues.length)
          ]);
        });
        
        console.log(table.toString());
        console.log();
      }

      if (report.fixedRecords.length > 0) {
        console.log(chalk.bold('六、已修正记录（修正后再导入）'));
        console.log(`  共 ${report.fixedRecords.length} 条记录已修正待复核`);
      }
    } catch (e: any) {
      console.error(chalk.red(`错误: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('history')
  .description('查看状态变更历史')
  .option('-i, --id <id>', '记录ID（可选，不填则显示全部）')
  .option('-l, --limit <n>', '显示条数', '20')
  .action(async (options) => {
    try {
      const { user, db } = await getCurrentUser();
      assertPermission(user.role, 'history');

      const history = options.id 
        ? getRecordHistory(db, options.id)
        : getAllHistory(db, parseInt(options.limit));

      if (history.length === 0) {
        console.log(chalk.yellow('暂无状态变更记录'));
        return;
      }

      const table = new Table({
        head: ['时间', '批号', '材料名称', '从状态', '到状态', '操作人', '原因']
      });

      history.forEach(h => {
        table.push([
          h.changedAt.slice(0, 19).replace('T', ' '),
          h.batchNumber,
          h.materialName.slice(0, 10),
          h.fromStatus,
          h.toStatus,
          h.changedBy,
          h.reason.slice(0, 15)
        ]);
      });

      console.log(table.toString());
    } catch (e: any) {
      console.error(chalk.red(`错误: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('export')
  .description('导出数据')
  .option('-o, --output <dir>', '输出目录', './exports')
  .option('-f, --format <format>', '格式: csv|json', 'csv')
  .option('--failed', '仅导出失败记录')
  .action(async (options) => {
    try {
      const { user, db } = await getCurrentUser();
      assertPermission(user.role, 'export');

      let outputPath;
      
      if (options.failed) {
        outputPath = await exportFailedRecords(db, options.output, user.username);
      } else {
        outputPath = await exportData(
          db, 
          options.output, 
          { format: options.format }, 
          user.username
        );
      }

      console.log(chalk.green(`✓ 导出成功: ${outputPath}`));
    } catch (e: any) {
      console.error(chalk.red(`错误: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('列出记录')
  .option('-s, --status <status>', '按状态筛选')
  .option('-l, --limit <n>', '显示条数', '20')
  .action(async (options) => {
    try {
      const { user, db } = await getCurrentUser();

      let records = db.records;
      
      if (options.status) {
        records = records.filter(r => r.status === options.status);
      }

      const filteredRecords = filterRecordsByRole(records.slice(0, parseInt(options.limit)), user.role);

      console.log(chalk.cyan(`共 ${records.length} 条记录，当前用户角色: ${getRoleName(user.role)}`));
      
      const table = new Table({
        head: ['ID', '来源', '行号', '批号', '材料', '数量', '金额', '状态']
      });

      filteredRecords.forEach((r: any) => {
        table.push([
          (r.id || '').slice(0, 8),
          getDataSourceName(r.source),
          r.sourceLine,
          r.batchNumber,
          (r.materialName || '').slice(0, 8),
          r.quantity,
          r.totalAmount,
          getStatusName(r.status)
        ]);
      });

      console.log(table.toString());
    } catch (e: any) {
      console.error(chalk.red(`错误: ${e.message}`));
      process.exit(1);
    }
  });

program.parseAsync();
