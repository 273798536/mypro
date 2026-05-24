import chalk from 'chalk';
import Table from 'cli-table3';
import {
  getDirtyRecords,
  getAppointments,
  getLocations,
  getReviews,
  getPriceAdjustments,
  getCurrentUser,
  addOperationLog,
} from '../utils/database';
import {
  getDirtyTypeLabel,
  getSourceTypeLabel,
  detectDuplicates,
  detectNameChanges,
  detectAmountConflicts,
} from '../utils/dirtyChecker';
import { requirePermission } from './login';
import { DirtyType, SourceType } from '../types';

export async function handleCheck(options: { type?: string; status?: string }): Promise<void> {
  requirePermission('view');

  const user = getCurrentUser()!;

  console.log(chalk.blue('=== 数据巡检 ===\n'));

  const dirtyRecords = getDirtyRecords();

  let filtered = dirtyRecords;

  if (options.type) {
    filtered = filtered.filter((r) => r.sourceType === options.type);
  }

  if (options.status) {
    filtered = filtered.filter((r) => r.status === options.status);
  }

  const byDirtyType: Record<DirtyType, number> = {} as any;
  const bySourceType: Record<SourceType, number> = {} as any;

  filtered.forEach((r) => {
    byDirtyType[r.dirtyType] = (byDirtyType[r.dirtyType] || 0) + 1;
    bySourceType[r.sourceType] = (bySourceType[r.sourceType] || 0) + 1;
  });

  console.log(chalk.cyan('📊 巡检统计'));
  console.log(`总记录数: ${dirtyRecords.length}`);
  console.log(`待处理: ${chalk.yellow(filtered.filter((r) => r.status === 'dirty').length)}`);
  console.log(`已修复: ${chalk.green(filtered.filter((r) => r.status === 'fixed').length)}`);
  console.log(`已通过: ${chalk.green(filtered.filter((r) => r.status === 'approved').length)}`);

  console.log(`\n${chalk.cyan('📋 按问题类型分布')}`);
  const typeTable = new Table({
    head: ['问题类型', '数量'],
    colWidths: [20, 10],
  });
  Object.entries(byDirtyType).forEach(([type, count]) => {
    typeTable.push([getDirtyTypeLabel(type as DirtyType), String(count)]);
  });
  console.log(typeTable.toString());

  console.log(`\n${chalk.cyan('📋 按数据源分布')}`);
  const sourceTable = new Table({
    head: ['数据源', '数量'],
    colWidths: [15, 10],
  });
  Object.entries(bySourceType).forEach(([type, count]) => {
    sourceTable.push([getSourceTypeLabel(type as SourceType), String(count)]);
  });
  console.log(sourceTable.toString());

  console.log(`\n${chalk.cyan('📋 脏记录明细')}`);
  const detailTable = new Table({
    head: ['ID', '行号', '数据源', '问题类型', '状态', '描述'],
    colWidths: [10, 8, 12, 12, 10, 30],
  });

  filtered.slice(0, 20).forEach((r) => {
    const statusColor =
      r.status === 'dirty'
        ? chalk.yellow
        : r.status === 'fixed'
        ? chalk.blue
        : r.status === 'approved'
        ? chalk.green
        : r.status === 'rejected'
        ? chalk.red
        : chalk.gray;

    detailTable.push([
      r.id.slice(0, 8),
      String(r.rawRow || '-'),
      getSourceTypeLabel(r.sourceType),
      getDirtyTypeLabel(r.dirtyType),
      statusColor(r.status),
      r.description.slice(0, 28),
    ]);
  });

  console.log(detailTable.toString());
  if (filtered.length > 20) {
    console.log(chalk.gray(`... 还有 ${filtered.length - 20} 条记录，使用 hai check --detail 查看全部`));
  }

  console.log(`\n${chalk.cyan('🔍 重复检测')}`);
  const appointments = getAppointments();
  const duplicates = detectDuplicates(appointments);
  if (duplicates.length > 0) {
    console.log(chalk.yellow(`发现 ${duplicates.length} 组重复订单:`));
    duplicates.slice(0, 5).forEach((group) => {
      console.log(`  订单号 ${group[0].orderNo}: ${group.length} 条重复`);
    });
  } else {
    console.log(chalk.green('未发现重复记录'));
  }

  console.log(`\n${chalk.cyan('🔍 客户改名检测')}`);
  const nameChanges = detectNameChanges(appointments);
  if (nameChanges.length > 0) {
    console.log(chalk.yellow(`发现 ${nameChanges.length} 个客户姓名不一致:`));
    nameChanges.slice(0, 5).forEach((item) => {
      console.log(`  订单号 ${item.orderNo}: ${item.names.join(' vs ')}`);
    });
  } else {
    console.log(chalk.green('未发现客户改名情况'));
  }

  console.log(`\n${chalk.cyan('🔍 金额冲突检测')}`);
  const priceAdjustments = getPriceAdjustments();
  const amountConflicts = detectAmountConflicts(priceAdjustments);
  if (amountConflicts.length > 0) {
    console.log(chalk.yellow(`发现 ${amountConflicts.length} 组金额冲突:`));
    amountConflicts.slice(0, 5).forEach((item) => {
      console.log(`  订单号 ${item.orderNo}: 有多组不同金额`);
    });
  } else {
    console.log(chalk.green('未发现金额冲突'));
  }

  addOperationLog('check_records', user, {});

  console.log(`\n${chalk.gray('使用 hai fix <dirtyId> 修复脏记录')}`);
}
