#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { initDatabase, resetDatabase, closeDb } from './db/database';
import { checkPermission, filterFieldsByRole } from './config/permissions';
import { 
  getCurrentUser, 
  createUser, 
  listUsers 
} from './services/userService';
import { 
  getAllRecords, 
  getRecordById, 
  getRecordHistory, 
  updateRecord,
  updateRecordStatus,
  getRecordsByStatus,
  RawRecordData
} from './services/recordService';
import { 
  getUnfixedDirtyRecords, 
  getDirtyRecords, 
  fixDirtyRecord 
} from './services/dirtyRecordService';
import { importFromCSV, importFromZip, importSupplement } from './services/importService';
import { generateReport } from './services/reportService';
import { 
  exportCleanRecords, 
  exportDirtyRecords, 
  exportFixedRecords 
} from './services/exportService';
import { 
  addAlias, 
  getAttribution, 
  getAllRenamedMaterials 
} from './services/aliasService';
import { UserRole, ImportSource } from './types';

const program = new Command();

program
  .name('ad-inspect')
  .description('广告素材投放多源导入巡检工具')
  .version('1.0.0')
  .option('-u, --user <username>', '指定当前用户', 'admin');

async function requirePermission(action: string): Promise<void> {
  const user = await getCurrentUser();
  if (!checkPermission(user.role, action)) {
    console.error(chalk.red('权限不足: 用户 ' + user.username + ' (' + user.role + ') 无法执行 ' + action + ' 操作'));
    process.exit(1);
  }
}

program
  .command('init')
  .description('初始化数据库')
  .option('--reset', '重置数据库（删除所有数据）')
  .action(async (options) => {
    if (options.reset) {
      console.log(chalk.yellow('正在重置数据库...'));
      await resetDatabase();
    } else {
      await initDatabase();
    }
    console.log(chalk.green('数据库初始化完成'));
  });

program
  .command('import')
  .description('导入数据')
  .requiredOption('-f, --file <path>', '导入文件路径')
  .requiredOption('-s, --source <type>', '数据来源: material_id|audit_result|cost_daily|history_zip', 'cost_daily')
  .option('-r, --request-id <id>', '请求ID（用于幂等性控制）')
  .action(async (options) => {
    await requirePermission('import');
    
    const validSources: ImportSource[] = ['material_id', 'audit_result', 'cost_daily', 'history_zip'];
    if (!validSources.includes(options.source)) {
      console.error(chalk.red('无效的数据来源类型'));
      process.exit(1);
    }
    
    console.log(chalk.blue('正在导入文件: ' + options.file));
    
    try {
      if (options.file.endsWith('.zip')) {
        await importFromZip(options.file, options.source, options.requestId);
      } else {
        await importFromCSV(options.file, options.source, options.requestId);
      }
      console.log(chalk.green('导入完成'));
    } catch (error) {
      console.error(chalk.red('导入失败: ' + (error as Error).message));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('检查脏记录')
  .option('-l, --limit <n>', '显示数量', '50')
  .action(async (options) => {
    await requirePermission('check');
    
    const dirtyRecords = await getUnfixedDirtyRecords();
    
    if (dirtyRecords.length === 0) {
      console.log(chalk.green('没有发现脏记录'));
      return;
    }
    
    const table = new Table({
      head: ['行号', '素材ID', '素材名称', '脏类型', '处理建议'],
      colWidths: [10, 15, 20, 18, 40]
    });
    
    const limit = Math.min(parseInt(options.limit), dirtyRecords.length);
    for (let i = 0; i < limit; i++) {
      const r = dirtyRecords[i];
      table.push([
        r.source_line ?? '-',
        r.material_id,
        r.material_name.substring(0, 18),
        r.dirty_type,
        r.suggestion.substring(0, 38)
      ]);
    }
    
    console.log(table.toString());
    console.log(chalk.yellow('共 ' + dirtyRecords.length + ' 条脏记录'));
  });

program
  .command('fix')
  .description('修复记录')
  .requiredOption('-i, --id <recordId>', '记录ID')
  .option('-f, --field <field>', '字段名')
  .option('-v, --value <value>', '新值')
  .option('-d, --dirty-id <dirtyId>', '脏记录ID（标记单个脏问题为已修复')
  .option('-r, --reason <reason>', '修改原因', '手动修复')
  .action(async (options) => {
    await requirePermission('fix');
    
    if (options.dirtyId) {
      await fixDirtyRecord(options.dirtyId);
      console.log(chalk.green('脏记录 ' + options.dirtyId + ' 已标记为已修复'));
      return;
    }
    
    if (!options.field || !options.value) {
      console.error(chalk.red('请指定字段名和新值'));
      process.exit(1);
    }
    
    try {
      const updates: Partial<RawRecordData> = {};
      const numFields = ['impressions', 'clicks', 'cost'];
      (updates as any)[options.field] = numFields.includes(options.field) 
        ? Number(options.value) 
        : options.value;
      
      await updateRecord(options.id, updates, options.reason);
      console.log(chalk.green('记录 ' + options.id + ' 已更新'));
    } catch (error) {
      console.error(chalk.red('更新失败: ' + (error as Error).message));
      process.exit(1);
    }
  });

program
  .command('approve')
  .description('审核通过记录')
  .requiredOption('-i, --id <recordId>', '记录ID')
  .action(async (options) => {
    await requirePermission('approve');
    await updateRecordStatus(options.id, 'approved', '审核通过');
    console.log(chalk.green('记录 ' + options.id + ' 已审核通过'));
  });

program
  .command('reject')
  .description('驳回记录')
  .requiredOption('-i, --id <recordId>', '记录ID')
  .option('-r, --reason <reason>', '驳回原因', '审核驳回')
  .action(async (options) => {
    await requirePermission('reject');
    await updateRecordStatus(options.id, 'rejected', options.reason);
    console.log(chalk.yellow('记录 ' + options.id + ' 已驳回'));
  });

program
  .command('report')
  .description('生成报告')
  .option('--failed', '只显示失败清单')
  .action(async (options) => {
    await requirePermission('report');
    
    const report = await generateReport();
    
    if (options.failed) {
      if (report.failedList.length === 0) {
        console.log(chalk.green('没有失败记录'));
        return;
      }
      
      const table = new Table({
        head: ['行号', '素材ID', '素材名称', '问题类型', '处理建议'],
        colWidths: [10, 15, 20, 25, 40]
      });
      
      for (const item of report.failedList) {
        table.push([
          item.source_line,
          item.material_id,
          item.material_name.substring(0, 18),
          item.dirty_types.join(', ').substring(0, 23),
          item.suggestions.join('; ').substring(0, 38)
        ]);
      }
      
      console.log(table.toString());
      return;
    }
    
    console.log(chalk.blue('\n=== 巡检报告 ===\n'));
    
    console.log('记录统计:');
    console.log('  总记录数: ' + report.totalRecords);
    console.log('  脏记录数: ' + chalk.red(String(report.dirtyRecords)));
    console.log('  已修复数: ' + chalk.yellow(String(report.fixedRecords)));
    console.log('  已导入数: ' + chalk.green(String(report.importedRecords)));
    
    console.log('\n按平台分布:');
    for (const [platform, count] of Object.entries(report.byPlatform)) {
      console.log('  ' + platform + ': ' + count);
    }
    
    console.log('\n按脏类型分布:');
    for (const [type, count] of Object.entries(report.byDirtyType)) {
      console.log('  ' + type + ': ' + count);
    }
    
    if (report.failedList.length > 0) {
      console.log(chalk.yellow('\n失败清单 (共 ' + report.failedList.length + ' 条):'));
      for (const item of report.failedList.slice(0, 10)) {
        console.log('  [行' + item.source_line + '] ' + item.material_id + ' - ' + item.material_name);
        console.log('    问题: ' + item.dirty_types.join(', '));
      }
      if (report.failedList.length > 10) {
        console.log('  ... 还有 ' + (report.failedList.length - 10) + ' 条');
      }
    }
  });

program
  .command('history')
  .description('查看变更历史')
  .requiredOption('-i, --id <recordId>', '记录ID')
  .action(async (options) => {
    await requirePermission('history');
    
    const history = await getRecordHistory(options.id);
    
    if (history.length === 0) {
      console.log(chalk.yellow('没有变更历史'));
      return;
    }
    
    const table = new Table({
      head: ['字段', '原值', '新值', '原因', '时间'],
      colWidths: [15, 20, 20, 20, 25]
    });
    
    for (const h of history) {
      table.push([
        h.field_name,
        (h.old_value ?? '-').substring(0, 18),
        (h.new_value ?? '-').substring(0, 18),
        h.change_reason.substring(0, 18),
        h.changed_at.substring(0, 23)
      ]);
    }
    
    console.log(table.toString());
  });

program
  .command('export')
  .description('导出数据')
  .requiredOption('-t, --type <type>', '导出类型: clean|dirty|fixed')
  .requiredOption('-o, --output <path>', '输出文件路径')
  .action(async (options) => {
    await requirePermission('export');
    
    try {
      switch (options.type) {
        case 'clean':
          await exportCleanRecords(options.output);
          break;
        case 'dirty':
          await exportDirtyRecords(options.output);
          break;
        case 'fixed':
          await exportFixedRecords(options.output);
          break;
        default:
          console.error(chalk.red('无效的导出类型'));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('导出失败: ' + (error as Error).message));
      process.exit(1);
    }
  });

program
  .command('alias')
  .description('素材别名管理')
  .option('-a, --add', '添加别名')
  .option('-c, --canonical <id>', '标准素材ID')
  .option('-n, --name <name>', '别名')
  .option('-p, --platform <platform>', '平台')
  .option('-l, --list', '列出所有改名素材')
  .option('-s, --show <id>', '查看素材归因')
  .action(async (options) => {
    if (options.list) {
      const renamed = await getAllRenamedMaterials();
      if (renamed.length === 0) {
        console.log(chalk.green('没有发现改名素材'));
        return;
      }
      
      const table = new Table({
        head: ['素材ID', '平台', '名称数量', '名称列表'],
        colWidths: [15, 12, 10, 50]
      });
      
      for (const r of renamed) {
        table.push([
          r.material_id,
          r.platform,
          r.name_count,
          r.names.join(' | ').substring(0, 48)
        ]);
      }
      
      console.log(table.toString());
      return;
    }
    
    if (options.show) {
      const attribution = await getAttribution(options.show);
      if (!attribution) {
        console.log(chalk.red('未找到该素材'));
        return;
      }
      
      console.log(chalk.blue('\n=== 素材归因报告 ===\n'));
      console.log('标准素材ID: ' + attribution.canonical_id);
      console.log('标准名称: ' + attribution.canonical_name);
      
      if (attribution.aliases.length > 0) {
        console.log('\n已配置别名:');
        for (const a of attribution.aliases) {
          console.log('  ' + a.platform + ': ' + a.name);
        }
      }
      
      console.log('\n按平台汇总:');
      const table = new Table({
        head: ['平台', '使用名称', '曝光量', '点击量', '花费'],
        colWidths: [12, 30, 12, 10, 12]
      });
      
      for (const p of attribution.by_platform) {
        table.push([
          p.platform,
          p.material_names.join(', ').substring(0, 28),
          p.impressions.toLocaleString(),
          p.clicks.toLocaleString(),
          p.cost.toFixed(2)
        ]);
      }
      
      console.log(table.toString());
      
      console.log('\n总计:');
      console.log('  总曝光: ' + attribution.total_impressions.toLocaleString());
      console.log('  总点击: ' + attribution.total_clicks.toLocaleString());
      console.log('  总花费: ' + attribution.total_cost.toFixed(2));
      return;
    }
    
    if (options.add) {
      await requirePermission('fix');
      if (!options.canonical || !options.name || !options.platform) {
        console.error(chalk.red('请指定标准素材ID、别名和平台'));
        process.exit(1);
      }
      await addAlias(options.canonical, options.name, options.platform);
      console.log(chalk.green('别名已添加: ' + options.name + ' -> ' + options.canonical + ' (' + options.platform + ')'));
    }
  });

program
  .command('supplement')
  .description('临时补录单条记录')
  .requiredOption('--material-id <id>', '素材ID')
  .requiredOption('--material-name <name>', '素材名称')
  .requiredOption('--platform <platform>', '平台')
  .requiredOption('--date <date>', '日期 (YYYY-MM-DD)')
  .option('--impressions <n>', '曝光量')
  .option('--clicks <n>', '点击量')
  .option('--cost <n>', '花费')
  .option('--audit-status <status>', '审核状态')
  .option('-r, --request-id <id>', '请求ID')
  .action(async (options) => {
    await requirePermission('import');
    
    const data: RawRecordData = {
      material_id: options.materialId,
      material_name: options.materialName,
      platform: options.platform,
      record_date: options.date,
      impressions: options.impressions ? Number(options.impressions) : undefined,
      clicks: options.clicks ? Number(options.clicks) : undefined,
      cost: options.cost ? Number(options.cost) : undefined,
      audit_status: options.auditStatus
    };
    
    const result = await importSupplement(data, options.requestId);
    console.log(chalk.green('补录完成，记录ID: ' + result.recordId));
  });

program
  .command('user')
  .description('用户管理')
  .option('-c, --create', '创建用户')
  .option('-u, --username <name>', '用户名')
  .option('-r, --role <role>', '角色: entry|review|manager|readonly')
  .option('-l, --list', '列出所有用户')
  .action(async (options) => {
    if (options.list) {
      await requirePermission('view');
      const users = await listUsers();
      const table = new Table({
        head: ['用户名', '角色', '创建时间'],
        colWidths: [20, 15, 30]
      });
      
      for (const u of users) {
        table.push([u.username, u.role, u.created_at]);
      }
      
      console.log(table.toString());
      return;
    }
    
    if (options.create) {
      await requirePermission('user:create');
      
      const validRoles: UserRole[] = ['entry', 'review', 'manager', 'readonly'];
      if (!validRoles.includes(options.role as UserRole)) {
        console.error(chalk.red('无效的角色'));
        process.exit(1);
      }
      
      try {
        await createUser(options.username, options.role as UserRole);
        console.log(chalk.green('用户 ' + options.username + ' 创建成功，角色: ' + options.role));
      } catch (error) {
        console.error(chalk.red('创建失败: ' + (error as Error).message));
        process.exit(1);
      }
    }
  });

program
  .command('view')
  .description('查看记录')
  .option('-i, --id <recordId>', '记录ID')
  .option('-l, --limit <n>', '显示数量', '20')
  .option('-s, --status <status>', '按状态过滤')
  .action(async (options) => {
    await requirePermission('view');
    const user = await getCurrentUser();
    
    if (options.id) {
      const record = await getRecordById(options.id);
      if (!record) {
        console.log(chalk.red('未找到记录'));
        return;
      }
      
      const filtered = filterFieldsByRole(user.role, record as any);
      console.log(JSON.stringify(filtered, null, 2));
      
      const dirtyRecords = await getDirtyRecords(options.id);
      if (dirtyRecords.length > 0) {
        console.log(chalk.yellow('\n关联脏记录:'));
        for (const dr of dirtyRecords) {
          const status = dr.fixed ? chalk.green('[已修复]') : chalk.red('[未修复]');
          console.log('  ' + status + ' ' + dr.dirty_type + ': ' + dr.suggestion);
        }
      }
      return;
    }
    
    const records = options.status 
      ? await getRecordsByStatus(options.status as any)
      : await getAllRecords(parseInt(options.limit));
    
    const table = new Table({
      head: ['ID', '素材ID', '素材名称', '平台', '日期', '状态'],
      colWidths: [10, 12, 18, 10, 12, 10]
    });
    
    for (const r of records) {
      const statusColor = r.status === 'dirty' ? chalk.red(r.status) :
                          r.status === 'fixed' ? chalk.yellow(r.status) :
                          r.status === 'approved' ? chalk.green(r.status) :
                          r.status;
      table.push([
        r.id.substring(0, 8),
        r.material_id,
        r.material_name.substring(0, 16),
        r.platform,
        r.record_date,
        statusColor
      ]);
    }
    
    console.log(table.toString());
  });

program.parseAsync(process.argv).then(() => {
  closeDb();
}).catch((error) => {
  console.error(chalk.red('错误: ' + error.message));
  closeDb();
  process.exit(1);
});
