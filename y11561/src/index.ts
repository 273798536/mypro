#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { getDatabase } from './db/database';
import { DataImporter } from './services/importer';
import { RecordFixer } from './services/fixer';
import { ReportGenerator } from './services/reporter';
import { canPerformAction, ROLE_NAMES } from './auth/permissions';
import { RecordSource } from './types';

const program = new Command();
const db = getDatabase();
const importer = new DataImporter();
const fixer = new RecordFixer();
const reporter = new ReportGenerator();

function requireAuth(action: string) {
  const currentUser = db.getCurrentUser();
  if (!currentUser) {
    console.log(chalk.red('错误: 请先登录'));
    process.exit(1);
  }
  
  if (!canPerformAction(currentUser.role, action)) {
    console.log(chalk.red(`错误: 权限不足。您的角色 [${ROLE_NAMES[currentUser.role]}] 不允许执行此操作`));
    process.exit(1);
  }
  
  return currentUser;
}

function printBanner() {
  console.log(`
${chalk.cyan('╔══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}           ${chalk.bold('酒店前台夜审多源导入巡检 CLI 工具')}           ${chalk.cyan('║')}
${chalk.cyan('║')}                  Hotel Night Audit System                   ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════╝')}
  `);
}

program
  .name('audit')
  .description('酒店前台夜审多源导入巡检 CLI 工具')
  .version('1.0.0');

program
  .command('init')
  .description('初始化系统')
  .action(() => {
    printBanner();
    
    if (db.isInitialized()) {
      console.log(chalk.yellow('系统已初始化。如需重新初始化，请先删除 data 目录。'));
      return;
    }
    
    console.log(chalk.blue('正在初始化系统...'));
    db.initialize();
    
    console.log(chalk.green('✓ 系统初始化完成！'));
    console.log(chalk.green('✓ 默认用户已创建：'));
    
    const users = db.getUsers();
    const table = new Table({
      head: ['用户名', '姓名', '角色'],
      style: { head: ['cyan'] }
    });
    
    for (const user of users) {
      table.push([user.username, user.name, ROLE_NAMES[user.role]]);
    }
    
    console.log(table.toString());
    console.log(chalk.gray('\n使用 "audit login <用户名>" 登录系统'));
  });

program
  .command('login <username>')
  .description('用户登录')
  .action((username: string) => {
    if (!db.isInitialized()) {
      console.log(chalk.red('错误: 系统未初始化，请先运行 "audit init"'));
      return;
    }
    
    const user = db.getUserByUsername(username);
    if (!user) {
      console.log(chalk.red(`错误: 用户 "${username}" 不存在`));
      return;
    }
    
    db.setCurrentUser(user.id);
    console.log(chalk.green(`✓ 登录成功！欢迎 ${user.name} (${ROLE_NAMES[user.role]})`));
  });

program
  .command('whoami')
  .description('查看当前登录用户')
  .action(() => {
    const user = db.getCurrentUser();
    if (!user) {
      console.log(chalk.yellow('未登录'));
      return;
    }
    
    const table = new Table({
      head: ['字段', '值'],
      style: { head: ['cyan'] }
    });
    
    table.push(
      ['用户名', user.username],
      ['姓名', user.name],
      ['角色', ROLE_NAMES[user.role]]
    );
    
    console.log(table.toString());
  });

program
  .command('import <file> <source>')
  .description('导入数据文件')
  .option('-b, --batch <batch>', '批次号（可选）')
  .action(async (file: string, source: string, options: { batch?: string }) => {
    const currentUser = requireAuth('import');
    printBanner();
    
    const validSources: RecordSource[] = ['checkin', 'deposit', 'roomChange', 'shift', 'supplement'];
    if (!validSources.includes(source as RecordSource)) {
      console.log(chalk.red(`错误: 无效的数据源 "${source}"`));
      console.log(chalk.gray(`有效数据源: ${validSources.join(', ')}`));
      return;
    }
    
    console.log(chalk.blue(`正在导入 ${source} 数据...`));
    console.log(chalk.gray(`文件: ${file}`));
    
    try {
      const result = await importer.importFromCSV(file, source as RecordSource, currentUser.id, options.batch);
      
      console.log(chalk.green('✓ 导入完成！'));
      
      const table = new Table({
        head: ['项目', '数值'],
        style: { head: ['cyan'] }
      });
      
      table.push(
        ['批次号', result.batchNo],
        ['总记录数', result.totalRecords],
        ['成功导入', result.importedRecords],
        ['导入错误', result.errors.length]
      );
      
      console.log(table.toString());
      
      if (result.errors.length > 0) {
        console.log(chalk.yellow('\n导入错误:'));
        for (const error of result.errors.slice(0, 10)) {
          console.log(chalk.yellow(`  - ${error}`));
        }
        if (result.errors.length > 10) {
          console.log(chalk.yellow(`  ... 还有 ${result.errors.length - 10} 条错误`));
        }
      }
      
      console.log(chalk.gray(`\n运行 "audit check ${result.batchId}" 进行数据校验`));
      
    } catch (error) {
      console.log(chalk.red(`导入失败: ${(error as Error).message}`));
    }
  });

program
  .command('check <batchId>')
  .description('校验批次数据')
  .option('-s, --single', '仅校验当前批次，不跨批次')
  .action((batchId: string, options: { single?: boolean }) => {
    const currentUser = requireAuth('check');
    printBanner();
    
    const batch = db.getBatch(batchId);
    if (!batch) {
      console.log(chalk.red(`错误: 批次 "${batchId}" 不存在`));
      return;
    }
    
    console.log(chalk.blue(`正在校验批次 ${batch.batchNo}...`));
    if (options.single) {
      console.log(chalk.gray('模式: 仅校验当前批次'));
    } else {
      console.log(chalk.gray('模式: 跨批次校验（同日数据合并）'));
    }
    
    const { crossSourceIssues, duplicateIssues } = importer.validateBatch(batchId, currentUser.id, !options.single);
    const allDirtyRecords = db.getDirtyRecords(batchId);
    
    console.log(chalk.green('✓ 校验完成！'));
    
    const table = new Table({
      head: ['检查项', '数量'],
      style: { head: ['cyan'] }
    });
    
    table.push(
      ['字段缺失', allDirtyRecords.filter(d => d.dirtyType === 'missing_field').length],
      ['跨日异常', allDirtyRecords.filter(d => d.dirtyType === 'cross_day').length],
      ['姓名变更', allDirtyRecords.filter(d => d.dirtyType === 'name_changed').length],
      ['金额冲突', allDirtyRecords.filter(d => d.dirtyType === 'amount_conflict').length],
      ['数量冲突', allDirtyRecords.filter(d => d.dirtyType === 'quantity_conflict').length],
      ['重复记录', duplicateIssues],
      ['跨源不一致', crossSourceIssues],
      ['总计', allDirtyRecords.length]
    );
    
    console.log(table.toString());
    
    if (allDirtyRecords.length > 0) {
      console.log(chalk.gray(`\n运行 "audit fix ${batchId}" 修复问题`));
    } else {
      console.log(chalk.green('\n✓ 数据校验通过，无脏记录'));
    }
  });

program
  .command('fix <batchId>')
  .description('修复脏记录')
  .option('-a, --all', '批量修复所有可修复的问题')
  .action(async (batchId: string, options: { all?: boolean }) => {
    const currentUser = requireAuth('fix');
    printBanner();
    
    const batch = db.getBatch(batchId);
    if (!batch) {
      console.log(chalk.red(`错误: 批次 "${batchId}" 不存在`));
      return;
    }
    
    const dirtyRecords = db.getDirtyRecords(batchId, 'pending');
    
    if (dirtyRecords.length === 0) {
      console.log(chalk.green('该批次没有待处理的脏记录'));
      return;
    }
    
    if (options.all) {
      console.log(chalk.blue(`正在批量修复 ${dirtyRecords.length} 条记录...`));
      const result = fixer.batchFix(batchId, currentUser);
      
      console.log(chalk.green(`✓ 批量修复完成！`));
      console.log(`已修复: ${result.fixedCount} 条`);
      console.log(`剩余: ${result.remainingCount} 条`);
    } else {
      console.log(chalk.yellow(`发现 ${dirtyRecords.length} 条待处理的脏记录\n`));
      
      const dirtyTypeNames: Record<string, string> = {
        missing_field: '字段缺失',
        cross_day: '跨日异常',
        name_changed: '姓名变更',
        amount_conflict: '金额冲突',
        quantity_conflict: '数量冲突',
        duplicate: '重复记录',
        invalid_data: '无效数据'
      };
      
      for (let i = 0; i < Math.min(dirtyRecords.length, 10); i++) {
        const dirty = dirtyRecords[i];
        console.log(chalk.cyan(`[${i + 1}] ${dirtyTypeNames[dirty.dirtyType] || dirty.dirtyType}`));
        console.log(`    记录ID: ${dirty.recordId}`);
        console.log(`    描述: ${dirty.description}`);
        if (dirty.suggestion) {
          console.log(chalk.gray(`    建议: ${dirty.suggestion}`));
        }
        console.log('');
      }
      
      if (dirtyRecords.length > 10) {
        console.log(chalk.gray(`... 还有 ${dirtyRecords.length - 10} 条记录\n`));
      }
      
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: '选择操作:',
          choices: [
            { name: '批量修复所有', value: 'batch' },
            { name: '修复单条记录', value: 'single' },
            { name: '取消', value: 'cancel' }
          ]
        }
      ]);
      
      if (answers.action === 'batch') {
        const result = fixer.batchFix(batchId, currentUser);
        console.log(chalk.green(`✓ 批量修复完成！已修复 ${result.fixedCount} 条`));
      } else if (answers.action === 'single') {
        const idAnswer = await inquirer.prompt([
          {
            type: 'input',
            name: 'dirtyId',
            message: '输入要修复的脏记录ID:'
          },
          {
            type: 'input',
            name: 'newValue',
            message: '修正后的值（留空则使用建议值）:'
          },
          {
            type: 'input',
            name: 'remark',
            message: '修复说明:'
          }
        ]);
        
        try {
          const dirtyRecord = db.getDirtyRecords().find(d => d.id === idAnswer.dirtyId);
          const valueToUse = idAnswer.newValue || dirtyRecord?.expectedValue || '';
          fixer.fixDirtyRecord(idAnswer.dirtyId, idAnswer.remark, currentUser, valueToUse);
          console.log(chalk.green('✓ 修复成功！'));
        } catch (error) {
          console.log(chalk.red(`修复失败: ${(error as Error).message}`));
        }
      }
    }
  });

program
  .command('report <batchId>')
  .description('生成夜审报告')
  .action((batchId: string) => {
    const currentUser = requireAuth('report');
    printBanner();
    
    try {
      const report = reporter.generateReport(batchId, currentUser);
      
      console.log(chalk.green('✓ 报告生成完成！'));
      console.log(`报告日期: ${report.reportDate}`);
      console.log(`生成人: ${report.generatedBy}\n`);
      
      const table = new Table({
        head: ['项目', '数值'],
        style: { head: ['cyan'] }
      });
      
      table.push(
        ['总记录数', report.summary.totalRecords],
        ['干净记录', report.summary.cleanRecords],
        ['脏记录总数', report.summary.dirtyRecords],
        ['已修复', report.summary.fixedRecords],
        ['待处理', report.summary.pendingRecords],
        ['跨日问题', report.summary.crossDayIssues],
        ['金额冲突', report.summary.amountConflicts],
        ['姓名变更', report.summary.nameChanges],
        ['字段缺失', report.summary.missingFields]
      );
      
      console.log(table.toString());
      
      if (report.exportReady) {
        console.log(chalk.green('\n✓ 所有问题已处理，可以导出'));
      } else {
        console.log(chalk.yellow(`\n⚠ 还有 ${report.summary.pendingRecords} 条问题待处理`));
      }
      
    } catch (error) {
      console.log(chalk.red(`生成报告失败: ${(error as Error).message}`));
    }
  });

program
  .command('history [batchId]')
  .description('查看状态变更历史')
  .option('-r, --record <recordId>', '查看指定记录的历史')
  .action((batchId?: string, options?: { record?: string }) => {
    const currentUser = requireAuth('history');
    printBanner();
    
    let changes = db.getStatusChanges(options?.record, batchId);
    
    if (changes.length === 0) {
      console.log(chalk.yellow('没有找到状态变更记录'));
      return;
    }
    
    console.log(chalk.blue(`共 ${changes.length} 条状态变更记录:\n`));
    
    const table = new Table({
      head: ['时间', '操作者', '角色', '记录ID', '变更', '原因'],
      style: { head: ['cyan'] }
    });
    
    for (const change of changes.slice(0, 20)) {
      table.push([
        change.timestamp,
        change.operator,
        ROLE_NAMES[change.operatorRole],
        change.recordId.slice(0, 8),
        `${change.fromStatus} → ${change.toStatus}`,
        change.reason
      ]);
    }
    
    console.log(table.toString());
    
    if (changes.length > 20) {
      console.log(chalk.gray(`\n... 还有 ${changes.length - 20} 条记录`));
    }
  });

program
  .command('export <batchId>')
  .description('导出修正后的数据和报告')
  .option('-o, --output <dir>', '输出目录', './export')
  .action((batchId: string, options: { output: string }) => {
    const currentUser = requireAuth('export');
    printBanner();
    
    try {
      const result = reporter.exportToCSV(batchId, options.output);
      
      console.log(chalk.green('✓ 导出完成！'));
      console.log(`输出目录: ${options.output}\n`);
      
      for (const file of result.files) {
        console.log(chalk.green(`  ✓ ${file}`));
      }
      
    } catch (error) {
      console.log(chalk.red(`导出失败: ${(error as Error).message}`));
    }
  });

program
  .command('batches')
  .description('查看所有导入批次')
  .action(() => {
    if (!db.isInitialized()) {
      console.log(chalk.red('错误: 系统未初始化'));
      return;
    }
    
    const batches = db.getBatches();
    
    if (batches.length === 0) {
      console.log(chalk.yellow('还没有导入批次'));
      return;
    }
    
    const table = new Table({
      head: ['批次号', '数据源', '文件名', '状态', '总数', '脏记录', '已修复', '创建时间'],
      style: { head: ['cyan'] }
    });
    
    const sourceNames: Record<string, string> = {
      checkin: '入住单',
      deposit: '押金流水',
      roomChange: '换房记录',
      shift: '班次记录',
      supplement: '临时补录'
    };
    
    for (const batch of batches) {
      table.push([
        batch.batchNo,
        sourceNames[batch.source] || batch.source,
        batch.fileName,
        batch.status,
        batch.totalRecords,
        batch.dirtyRecords,
        batch.fixedRecords,
        batch.createdAt
      ]);
    }
    
    console.log(table.toString());
  });

program
  .command('users')
  .description('查看所有用户（仅主管）')
  .action(() => {
    const currentUser = requireAuth('user_manage');
    
    const users = db.getUsers();
    const table = new Table({
      head: ['用户名', '姓名', '角色', '创建时间'],
      style: { head: ['cyan'] }
    });
    
    for (const user of users) {
      table.push([
        user.username,
        user.name,
        ROLE_NAMES[user.role],
        user.createdAt
      ]);
    }
    
    console.log(table.toString());
  });

program.parseAsync(process.argv).catch(console.error);
