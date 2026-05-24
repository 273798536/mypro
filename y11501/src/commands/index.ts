import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { initializeDatabase, getDatabasePath } from '../config/database';
import { AuthService } from '../services/AuthService';
import { ImportService } from '../services/ImportService';
import { DirtyRecordService } from '../services/DirtyRecordService';
import { BusinessIssueService } from '../services/BusinessIssueService';
import { ExportService } from '../services/ExportService';
import { OperationLogService } from '../services/OperationLogService';
import { OperationType } from '../entities/OperationLog';
import { DataSourceType, UserRole, DirtyRecordType, RecordStatus, BusinessIssueType } from '../types';
import { canPerformAction } from '../config/permissions';

const program = new Command();
let authService: AuthService;
let importService: ImportService;
let dirtyRecordService: DirtyRecordService;
let businessIssueService: BusinessIssueService;
let exportService: ExportService;
let logService: OperationLogService;

async function ensureInitialized(): Promise<void> {
  try {
    await initializeDatabase();
    authService = new AuthService();
    importService = new ImportService();
    dirtyRecordService = new DirtyRecordService();
    businessIssueService = new BusinessIssueService();
    exportService = new ExportService();
    logService = new OperationLogService();
  } catch (error: any) {
    console.error(chalk.red('初始化失败:'), error.message);
    process.exit(1);
  }
}

async function requireLogin(): Promise<string> {
  const user = await authService.getCurrentUser();
  if (!user) {
    console.log(chalk.yellow('请先登录'));
    const answers = await inquirer.prompt([
      { type: 'input', name: 'username', message: '用户名:' },
      { type: 'password', name: 'password', message: '密码:' }
    ]);

    const loggedInUser = await authService.authenticate(answers.username, answers.password);
    if (!loggedInUser) {
      console.log(chalk.red('用户名或密码错误'));
      process.exit(1);
    }
    console.log(chalk.green(`登录成功，欢迎 ${loggedInUser.fullName || loggedInUser.username} (${loggedInUser.role})`));
    return loggedInUser.username;
  }
  return user.username;
}

async function checkPermission(action: string): Promise<boolean> {
  const user = await authService.getCurrentUser();
  if (!user) return false;
  return canPerformAction(user.role, action);
}

program
  .name('spi-cli')
  .description('售后备件领用多源导入巡检 CLI 工具')
  .version('1.0.0');

program
  .command('init')
  .description('初始化数据库和默认用户')
  .option('--force', '强制重置数据库（会清除所有数据）')
  .action(async (options) => {
    console.log(chalk.blue('正在初始化数据库...'));
    
    try {
      await initializeDatabase(options.force);
      authService = new AuthService();
      await authService.initDefaultUsers();
      
      console.log(chalk.green('✓ 数据库初始化成功!'));
      console.log(chalk.cyan(`数据库路径: ${getDatabasePath()}`));
      console.log('');
      console.log(chalk.yellow('默认账号:'));
      console.log('  主管:    admin / admin123');
      console.log('  复核:    reviewer / review123');
      console.log('  录入:    operator / operate123');
      console.log('  只读:    viewer / view123');
    } catch (error: any) {
      console.error(chalk.red('初始化失败:'), error.message);
      process.exit(1);
    }
  });

program
  .command('login')
  .description('用户登录')
  .option('-u, --username <username>', '用户名')
  .option('-p, --password <password>', '密码')
  .action(async (options) => {
    await ensureInitialized();
    
    let username = options.username;
    let password = options.password;
    
    if (!username || !password) {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'username', message: '用户名:', default: username },
        { type: 'password', name: 'password', message: '密码:' }
      ]);
      username = answers.username;
      password = answers.password;
    }

    const user = await authService.authenticate(username, password);
    if (user) {
      console.log(chalk.green(`✓ 登录成功!`));
      console.log(`  用户: ${user.fullName || user.username}`);
      console.log(`  角色: ${user.role}`);
    } else {
      console.log(chalk.red('✗ 用户名或密码错误'));
      process.exit(1);
    }
  });

program
  .command('import')
  .description('导入数据文件')
  .argument('<file>', '数据文件路径 (CSV 或 Excel)')
  .option('-t, --type <type>', '数据类型: repair_order|spare_part_scan|customer_receipt|manual_price_adjust|shift_record')
  .action(async (file, options) => {
    await ensureInitialized();
    const operator = await requireLogin();
    
    if (!await checkPermission('import')) {
      console.log(chalk.red('✗ 权限不足，无法执行导入操作'));
      process.exit(1);
    }

    let sourceType: DataSourceType;
    
    if (options.type) {
      sourceType = options.type as DataSourceType;
    } else {
      const detectedType = importService['fileParser'].detectSourceType(file);
      if (detectedType) {
        sourceType = detectedType;
        console.log(chalk.blue(`检测到数据类型: ${sourceType}`));
      } else {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'type',
            message: '请选择数据类型:',
            choices: [
              { name: '维修单', value: DataSourceType.REPAIR_ORDER },
              { name: '备件扫码', value: DataSourceType.SPARE_PART_SCAN },
              { name: '客户签收', value: DataSourceType.CUSTOMER_RECEIPT },
              { name: '手工改价', value: DataSourceType.MANUAL_PRICE_ADJUST },
              { name: '班次记录', value: DataSourceType.SHIFT_RECORD }
            ]
          }
        ]);
        sourceType = answers.type;
      }
    }

    console.log(chalk.blue(`正在导入文件: ${file}`));
    
    try {
      const result = await importService.importFile(file, sourceType, operator);
      
      console.log(chalk.green('✓ 导入完成!'));
      console.log(`  批次号: ${result.batchNumber}`);
      console.log(`  总记录: ${result.totalRecords}`);
      console.log(`  成功: ${chalk.green(result.successCount.toString())}`);
      console.log(`  失败: ${chalk.red(result.failedCount.toString())}`);
      
      if (result.failedRecords.length > 0) {
        console.log('');
        console.log(chalk.yellow('失败记录:'));
        const table = new Table({
          head: ['行号', '错误信息'],
          colWidths: [10, 60]
        });
        result.failedRecords.slice(0, 10).forEach(r => {
          table.push([r.rowNumber, r.error]);
        });
        console.log(table.toString());
        if (result.failedRecords.length > 10) {
          console.log(chalk.gray(`... 还有 ${result.failedRecords.length - 10} 条失败记录`));
        }
      }
    } catch (error: any) {
      console.error(chalk.red('导入失败:'), error.message);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('检查数据完整性和业务问题')
  .option('-b, --batch <batchId>', '指定批次ID')
  .option('--no-business', '跳过业务问题检查')
  .action(async (options) => {
    await ensureInitialized();
    const operator = await requireLogin();
    
    if (!await checkPermission('check')) {
      console.log(chalk.red('✗ 权限不足，无法执行检查操作'));
      process.exit(1);
    }

    console.log(chalk.blue('正在进行数据完整性检查...'));
    
    const dirtyResult = await dirtyRecordService.checkAll(operator, options.batch);
    
    console.log(chalk.green('✓ 数据完整性检查完成!'));
    console.log(`  检查记录数: ${dirtyResult.totalChecked}`);
    console.log(`  脏记录数: ${chalk.yellow(dirtyResult.dirtyCount.toString())}`);
    
    if (dirtyResult.dirtyCount > 0) {
      const stats = await dirtyRecordService.getDirtyStats();
      console.log('');
      console.log(chalk.yellow('脏记录分类:'));
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }

    if (options.business !== false) {
      console.log('');
      console.log(chalk.blue('正在进行业务问题检查...'));
      
      const businessResult = await businessIssueService.checkAll(operator);
      
      console.log(chalk.green('✓ 业务问题检查完成!'));
      console.log(`  检查工单: ${businessResult.totalChecked}`);
      console.log(`  问题数: ${chalk.yellow(businessResult.issueCount.toString())}`);
      
      if (businessResult.issueCount > 0) {
        const stats = await businessIssueService.getIssueStats();
        console.log('');
        console.log(chalk.yellow('业务问题分类:'));
        Object.entries(stats.byType).forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
      }
    }
  });

program
  .command('fix')
  .description('修复脏记录')
  .option('-i, --id <id>', '指定脏记录ID')
  .option('-v, --value <value>', '修复值')
  .option('--all', '批量自动修复所有可自动修复的记录')
  .action(async (options) => {
    await ensureInitialized();
    const operator = await requireLogin();
    
    if (!await checkPermission('fix')) {
      console.log(chalk.red('✗ 权限不足，无法执行修复操作'));
      process.exit(1);
    }

    if (options.all) {
      console.log(chalk.blue('正在批量修复脏记录...'));
      
      const { records } = await dirtyRecordService.getDirtyRecords({ status: RecordStatus.DIRTY });
      const ids = records.map(r => r.id);
      const result = await dirtyRecordService.batchFix(ids, operator);
      
      console.log(chalk.green('✓ 批量修复完成!'));
      console.log(`  成功: ${chalk.green(result.fixedCount.toString())}`);
      console.log(`  失败: ${chalk.red(result.failedCount.toString())}`);
      return;
    }

    if (!options.id) {
      const { records } = await dirtyRecordService.getDirtyRecords({ 
        status: RecordStatus.DIRTY,
        pageSize: 20
      });
      
      if (records.length === 0) {
        console.log(chalk.green('没有待修复的脏记录'));
        return;
      }

      console.log(chalk.yellow('待修复的脏记录 (前20条):'));
      const table = new Table({
        head: ['ID', '类型', '字段', '描述', '建议'],
        colWidths: [38, 15, 15, 30, 25]
      });
      records.forEach(r => {
        table.push([
          r.id.substring(0, 36),
          r.dirtyType,
          r.fieldName || '-',
          r.description.substring(0, 28),
          (r.suggestedFix || '-').substring(0, 22)
        ]);
      });
      console.log(table.toString());

      const answers = await inquirer.prompt([
        { type: 'input', name: 'id', message: '请输入要修复的记录ID:' }
      ]);
      options.id = answers.id;
    }

    const { records } = await dirtyRecordService.getDirtyRecords({});
    const record = records.find(r => r.id === options.id);
    
    if (!record) {
      console.log(chalk.red('找不到指定的脏记录'));
      process.exit(1);
    }

    console.log('');
    console.log(chalk.blue('脏记录详情:'));
    console.log(`  ID: ${record.id}`);
    console.log(`  类型: ${record.dirtyType}`);
    console.log(`  字段: ${record.fieldName || '-'}`);
    console.log(`  描述: ${record.description}`);
    console.log(`  原始值: ${record.originalValue || '-'}`);
    console.log(`  建议修复: ${chalk.cyan(record.suggestedFix || '-')}`);
    console.log('');

    let fixedValue = options.value;
    if (!fixedValue) {
      const answers = await inquirer.prompt([
        { 
          type: 'input', 
          name: 'value', 
          message: '请输入修复值:',
          default: record.suggestedFix
        }
      ]);
      fixedValue = answers.value;
    }

    const result = await dirtyRecordService.fixDirtyRecord(options.id, fixedValue, operator);
    
    if (result) {
      console.log(chalk.green('✓ 修复成功!'));
    } else {
      console.log(chalk.red('✗ 修复失败'));
    }
  });

program
  .command('report')
  .description('生成巡检报告')
  .option('--brief', '简要报告')
  .action(async (options) => {
    await ensureInitialized();
    const operator = await requireLogin();
    
    if (!await checkPermission('report')) {
      console.log(chalk.red('✗ 权限不足，无法查看报告'));
      process.exit(1);
    }

    const dirtyStats = await dirtyRecordService.getDirtyStats();
    const issueStats = await businessIssueService.getIssueStats();
    const { batches } = await importService.getBatchList(1, 5);

    console.log(chalk.blue('='.repeat(60)));
    console.log(chalk.blue('            售后备件领用巡检报告'));
    console.log(chalk.blue('='.repeat(60)));
    console.log('');

    console.log(chalk.yellow('【数据导入概况】'));
    console.log(`  最近导入批次: ${batches.length} 批`);
    batches.forEach(b => {
      console.log(`    ${b.batchNumber} - ${b.sourceFileName} (${b.totalRecords}条)`);
    });
    console.log('');

    console.log(chalk.yellow('【脏记录统计】'));
    const totalDirty = Object.values(dirtyStats.byType).reduce((a: number, b: unknown) => a + (b as number), 0);
    console.log(`  脏记录总数: ${totalDirty}`);
    Object.entries(dirtyStats.byType).forEach(([type, count]) => {
      const typeName: Record<string, string> = {
        [DirtyRecordType.MISSING_FIELD]: '缺字段',
        [DirtyRecordType.CROSS_DATE]: '跨日',
        [DirtyRecordType.NAME_CHANGE]: '改名',
        [DirtyRecordType.AMOUNT_CONFLICT]: '金额冲突',
        [DirtyRecordType.QUANTITY_CONFLICT]: '数量冲突'
      };
      console.log(`    ${typeName[type] || type}: ${count}`);
    });
    console.log(`  已修复: ${dirtyStats.byStatus[RecordStatus.FIXED] || 0}`);
    console.log(`  待处理: ${dirtyStats.byStatus[RecordStatus.DIRTY] || 0}`);
    console.log('');

    console.log(chalk.yellow('【业务问题统计】'));
    const totalIssues = Object.values(issueStats.byType).reduce((a: number, b: unknown) => a + (b as number), 0);
    console.log(`  业务问题总数: ${totalIssues}`);
    Object.entries(issueStats.byType).forEach(([type, count]) => {
      const typeName: Record<string, string> = {
        [BusinessIssueType.LATE_ORDER_AFTER_PICKUP]: '先领后补单',
        [BusinessIssueType.RETURN_SCRAP_CONFUSION]: '退回报废混淆'
      };
      console.log(`    ${typeName[type] || type}: ${count}`);
    });
    console.log('');

    if (issueStats.topEngineers && issueStats.topEngineers.length > 0) {
      console.log(chalk.yellow('【问题工程师 TOP 5】'));
      issueStats.topEngineers.slice(0, 5).forEach((e: any, i: number) => {
        console.log(`  ${i + 1}. ${e.name}: ${e.count} 个问题`);
      });
    }

    console.log('');
    console.log(chalk.blue('='.repeat(60)));
    console.log(chalk.gray(`生成时间: ${new Date().toLocaleString()}`));
    console.log(chalk.gray(`操作员: ${operator}`));
  });

program
  .command('history')
  .description('查看操作历史')
  .option('-n, --limit <number>', '显示条数', '20')
  .option('-t, --type <type>', '操作类型过滤')
  .option('-u, --user <user>', '操作员过滤')
  .action(async (options) => {
    await ensureInitialized();
    const operator = await requireLogin();
    
    if (!await checkPermission('history')) {
      console.log(chalk.red('✗ 权限不足，无法查看历史记录'));
      process.exit(1);
    }

    const { logs, total } = await logService.getHistory({
      operationType: options.type as OperationType,
      operator: options.user,
      limit: parseInt(options.limit)
    });

    console.log(chalk.blue(`操作历史 (共 ${total} 条，显示前 ${logs.length} 条):`));
    console.log('');

    const table = new Table({
      head: ['时间', '操作', '操作员', '描述', '状态'],
      colWidths: [20, 12, 12, 30, 8]
    });

    logs.forEach(log => {
      table.push([
        log.createdAt.toLocaleString(),
        log.operationType,
        log.operator,
        log.description.substring(0, 28),
        log.success ? chalk.green('成功') : chalk.red('失败')
      ]);
    });

    console.log(table.toString());
  });

program
  .command('export')
  .description('导出数据')
  .argument('[type]', '导出类型: dirty|business|source|report', 'report')
  .option('-s, --source <source>', '源数据类型 (导出source时需指定)')
  .option('-b, --batch <batchId>', '批次ID')
  .option('-f, --format <format>', '格式: xlsx|csv', 'xlsx')
  .option('-o, --output <dir>', '输出目录')
  .action(async (type, options) => {
    await ensureInitialized();
    const operator = await requireLogin();
    
    if (!await checkPermission('export')) {
      console.log(chalk.red('✗ 权限不足，无法执行导出操作'));
      process.exit(1);
    }

    console.log(chalk.blue(`正在导出数据...`));
    
    let filePath: string;
    
    switch (type) {
      case 'dirty':
        filePath = await exportService.exportDirtyRecords(operator, {
          format: options.format,
          outputDir: options.output
        });
        break;
      
      case 'business':
        filePath = await exportService.exportBusinessIssues(operator, {
          format: options.format,
          outputDir: options.output
        });
        break;
      
      case 'source':
        if (!options.source) {
          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'source',
              message: '请选择源数据类型:',
              choices: [
                { name: '维修单', value: DataSourceType.REPAIR_ORDER },
                { name: '备件扫码', value: DataSourceType.SPARE_PART_SCAN },
                { name: '客户签收', value: DataSourceType.CUSTOMER_RECEIPT },
                { name: '手工改价', value: DataSourceType.MANUAL_PRICE_ADJUST },
                { name: '班次记录', value: DataSourceType.SHIFT_RECORD }
              ]
            }
          ]);
          options.source = answers.source;
        }
        filePath = await exportService.exportSourceData(options.source as DataSourceType, operator, {
          format: options.format,
          outputDir: options.output,
          batchId: options.batch
        });
        break;
      
      case 'report':
      default:
        filePath = await exportService.exportReport(operator, {
          format: options.format,
          outputDir: options.output
        });
        break;
    }

    console.log(chalk.green('✓ 导出成功!'));
    console.log(chalk.cyan(`文件路径: ${filePath}`));
  });

program
  .command('users')
  .description('管理用户 (主管权限)')
  .option('--list', '列出所有用户')
  .option('--create', '创建新用户')
  .action(async (options) => {
    await ensureInitialized();
    const operator = await requireLogin();
    
    if (!await checkPermission('create_user')) {
      console.log(chalk.red('✗ 权限不足，只有主管可以管理用户'));
      process.exit(1);
    }

    if (options.list || !options.create) {
      const users = await authService.listUsers();
      
      console.log(chalk.blue('用户列表:'));
      const table = new Table({
        head: ['用户名', '姓名', '角色', '状态', '创建时间'],
        colWidths: [15, 15, 12, 10, 20]
      });
      
      users.forEach(u => {
        table.push([
          u.username,
          u.fullName || '-',
          u.role,
          u.isActive ? chalk.green('启用') : chalk.red('禁用'),
          u.createdAt.toLocaleString()
        ]);
      });
      
      console.log(table.toString());
    }

    if (options.create) {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'username', message: '用户名:' },
        { type: 'password', name: 'password', message: '密码:' },
        { type: 'input', name: 'fullName', message: '姓名:' },
        {
          type: 'list',
          name: 'role',
          message: '角色:',
          choices: [
            { name: '录入', value: UserRole.ENTRY },
            { name: '复核', value: UserRole.REVIEW },
            { name: '主管', value: UserRole.SUPERVISOR },
            { name: '只读', value: UserRole.READONLY }
          ]
        }
      ]);

      try {
        const user = await authService.createUser(
          answers.username,
          answers.password,
          answers.role,
          answers.fullName
        );
        console.log(chalk.green(`✓ 用户创建成功: ${user.username}`));
      } catch (error: any) {
        console.log(chalk.red('✗ 创建失败:'), error.message);
      }
    }
  });

program
  .command('whoami')
  .description('显示当前登录用户')
  .action(async () => {
    await ensureInitialized();
    const user = await authService.getCurrentUser();
    
    if (user) {
      console.log(chalk.green('当前用户:'));
      console.log(`  用户名: ${user.username}`);
      console.log(`  姓名: ${user.fullName || '-'}`);
      console.log(`  角色: ${user.role}`);
    } else {
      console.log(chalk.yellow('未登录'));
    }
  });

export function runCLI(argv: string[] = process.argv): void {
  program.parse(argv);
}
