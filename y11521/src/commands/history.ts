import chalk from 'chalk';
import Table from 'cli-table3';
import {
  getOperationLogs,
  getImportHistory,
  getCurrentUser,
  loadDb,
} from '../utils/database';
import { requirePermission } from './login';
import { formatDiff } from '../utils/diff';

const operationLabels: Record<string, string> = {
  import_batch: '批量导入',
  import_appointment: '导入预约单',
  import_location: '导入定位记录',
  import_review: '导入评价记录',
  import_price_adjustment: '导入改价记录',
  fix_dirty_record: '修复脏记录',
  approve_fix: '复核通过',
  reject_fix: '驳回修复',
  check_records: '数据巡检',
  generate_report: '生成报告',
  export_data: '导出数据',
  login: '登录',
  logout: '登出',
};

export async function handleHistory(options: { type?: string; limit?: number; diff?: boolean }): Promise<void> {
  requirePermission('history');

  const user = getCurrentUser()!;
  const logs = getOperationLogs();
  const imports = getImportHistory();

  console.log(chalk.blue('=== 操作历史 ===\n'));

  console.log(chalk.cyan('📥 导入批次历史'));
  const importTable = new Table({
    head: ['时间', '批次ID', '文件名', '总数', '成功', '脏记录', '操作人'],
    colWidths: [18, 12, 20, 8, 8, 10, 12],
  });

  const db = loadDb();
  imports.slice(0, options.limit || 10).forEach((h) => {
    const importUser = db.users.find((u) => u.id === h.importedBy);
    importTable.push([
      h.importedAt.slice(0, 16).replace('T', ' '),
      h.batchId.slice(0, 8),
      h.fileName.slice(0, 18),
      String(h.totalRecords),
      chalk.green(String(h.successCount)),
      chalk.yellow(String(h.dirtyCount)),
      importUser?.name || '-',
    ]);
  });
  console.log(importTable.toString());

  console.log(`\n${chalk.cyan('📝 操作日志')}`);
  const logTable = new Table({
    head: ['时间', '操作', '用户', '角色', '记录ID'],
    colWidths: [18, 15, 12, 10, 12],
  });

  let filteredLogs = logs;
  if (options.type) {
    filteredLogs = logs.filter((l) => l.operation.includes(options.type || ''));
  }

  filteredLogs.slice(0, options.limit || 20).forEach((log) => {
    const roleLabel = {
      entry: '录入员',
      review: '复核员',
      supervisor: '主管',
      readonly: '只读',
    }[log.role];

    logTable.push([
      log.timestamp.slice(0, 16).replace('T', ' '),
      operationLabels[log.operation] || log.operation,
      log.userName,
      roleLabel,
      log.recordId ? log.recordId.slice(0, 8) : '-',
    ]);
  });
  console.log(logTable.toString());

  if (options.diff && filteredLogs.length > 0) {
    console.log(`\n${chalk.cyan('🔄 操作差异详情')}`);
    filteredLogs.slice(0, 5).forEach((log, index) => {
      if (log.beforeData || log.afterData) {
        console.log(`\n${chalk.magenta(`[${index + 1}]`)} ${log.timestamp.slice(0, 19).replace('T', ' ')} - ${operationLabels[log.operation] || log.operation}`);
        console.log(`  操作人: ${log.userName}`);
        if (log.beforeData && log.afterData) {
          const diffs = require('../utils/diff').compareObjects(log.beforeData, log.afterData);
          console.log(formatDiff(diffs));
        }
      }
    });
  }

  console.log(`\n${chalk.gray(`共 ${logs.length} 条操作记录，${imports.length} 次导入`)}`);
}

export async function handleShowBatch(batchId: string): Promise<void> {
  requirePermission('history');

  const imports = getImportHistory();
  const logs = getOperationLogs();

  const batch = imports.find((i) => i.batchId.startsWith(batchId));
  if (!batch) {
    console.log(chalk.red(`❌ 未找到批次: ${batchId}`));
    process.exit(1);
  }

  console.log(chalk.blue('=== 批次详情 ===\n'));
  console.log(`批次ID: ${chalk.cyan(batch.batchId)}`);
  console.log(`文件名: ${batch.fileName}`);
  console.log(`导入时间: ${batch.importedAt}`);
  console.log(`记录数: ${batch.totalRecords}`);
  console.log(`成功: ${chalk.green(String(batch.successCount))}`);
  console.log(`脏记录: ${chalk.yellow(String(batch.dirtyCount))}`);

  const batchLogs = logs.filter((l) => l.batchId === batch.batchId);
  if (batchLogs.length > 0) {
    console.log(`\n${chalk.cyan('📝 批次操作记录')}`);
    batchLogs.forEach((log) => {
      console.log(`  ${log.timestamp.slice(0, 19).replace('T', ' ')} - ${operationLabels[log.operation] || log.operation} - ${log.userName}`);
    });
  }
}
