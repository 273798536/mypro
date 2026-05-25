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
  detectQuantityConflicts,
  detectMergeConflicts,
} from '../utils/dirtyChecker';
import { requirePermission } from './login';
import { maskDataByRole, canViewField } from '../config/permissions';
import { DirtyType, SourceType, Role } from '../types';

const roleLabels: Record<Role, string> = {
  entry: '录入员',
  review: '复核员',
  supervisor: '主管',
  readonly: '只读',
};

export async function handleCheck(options: { type?: string; status?: string; detail?: boolean }): Promise<void> {
  requirePermission('view');

  const user = getCurrentUser()!;

  console.log(chalk.blue('=== 数据巡检 ===\n'));
  console.log(chalk.gray(`当前用户: ${user.name} (${roleLabels[user.role]})`));

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

  console.log(`\n${chalk.cyan('📋 脏记录明细 (按角色权限过滤显示)')}`);
  const detailColWidths = options.detail
    ? [12, 8, 12, 12, 10, 14, 50]
    : [10, 8, 12, 12, 10, 12, 28];
  const detailTable = new Table({
    head: ['ID', '行号', '数据源', '问题类型', '状态', '订单号', '描述'],
    colWidths: detailColWidths,
  });

  const displayLimit = options.detail ? filtered.length : 20;
  filtered.slice(0, displayLimit).forEach((r) => {
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

    const orderNo = canViewField(user.role, 'orderNo')
      ? (r.originalData?.orderNo || '-').toString().slice(0, 10)
      : '******';

    const desc = options.detail ? r.description : r.description.slice(0, 26);

    detailTable.push([
      r.id.slice(0, 8),
      String(r.rawRow || '-'),
      getSourceTypeLabel(r.sourceType),
      getDirtyTypeLabel(r.dirtyType),
      statusColor(r.status),
      orderNo,
      desc,
    ]);
  });

  console.log(detailTable.toString());
  if (!options.detail && filtered.length > 20) {
    console.log(chalk.gray(`... 还有 ${filtered.length - 20} 条记录，使用 hai check --detail 查看全部`));
  } else if (options.detail) {
    console.log(chalk.green(`共显示 ${filtered.length} 条记录（完整明细）`));
  }

  console.log(`\n${chalk.cyan('🔍 重复检测 (跨源订单号)')}`);
  const appointments = getAppointments();
  const locations = getLocations();
  const reviews = getReviews();
  const priceAdjustments = getPriceAdjustments();

  const allRecords = [
    ...appointments.map(a => ({ orderNo: a.orderNo, source: '预约单', rawRow: a.rawRow, data: a })),
    ...locations.map(l => ({ orderNo: l.orderNo, source: '师傅定位', rawRow: l.rawRow, data: l })),
    ...reviews.map(r => ({ orderNo: r.orderNo, source: '用户评价', rawRow: r.rawRow, data: r })),
    ...priceAdjustments.map(p => ({ orderNo: p.orderNo, source: '手工改价', rawRow: p.rawRow, data: p })),
  ];

  const duplicates = detectDuplicates(allRecords as any);
  if (duplicates.length > 0) {
    console.log(chalk.yellow(`发现 ${duplicates.length} 组订单号在多源中出现:`));
    duplicates.slice(0, 5).forEach((group) => {
      const sources = [...new Set(group.map(g => (g as any).source))];
      const orderNo = canViewField(user.role, 'orderNo')
        ? (group[0] as any).orderNo
        : '******';
      console.log(`  订单号 ${orderNo}: 出现于 ${sources.join(', ')}`);
    });
  } else {
    console.log(chalk.green('未发现跨源重复订单号'));
  }

  console.log(`\n${chalk.cyan('🔍 客户改名检测')}`);
  const nameChanges = detectNameChanges(appointments);
  if (nameChanges.length > 0) {
    console.log(chalk.yellow(`发现 ${nameChanges.length} 个客户姓名不一致:`));
    nameChanges.slice(0, 5).forEach((item) => {
      const orderNo = canViewField(user.role, 'orderNo') ? item.orderNo : '******';
      const names = item.names.map(n => canViewField(user.role, 'customerName') ? n : '******');
      console.log(`  订单号 ${orderNo}: ${names.join(' vs ')}`);
    });
  } else {
    console.log(chalk.green('未发现客户改名情况'));
  }

  console.log(`\n${chalk.cyan('🔍 金额冲突检测')}`);
  const amountConflicts = detectAmountConflicts(priceAdjustments);
  if (amountConflicts.length > 0) {
    console.log(chalk.yellow(`发现 ${amountConflicts.length} 组金额冲突:`));
    amountConflicts.slice(0, 5).forEach((item) => {
      const orderNo = canViewField(user.role, 'orderNo') ? item.orderNo : '******';
      console.log(`  订单号 ${orderNo}: 有多组不同金额`);
    });
  } else {
    console.log(chalk.green('未发现金额冲突'));
  }

  console.log(`\n${chalk.cyan('🔍 数量冲突检测 (同一订单多台家电)')}`);
  const quantityConflicts = detectQuantityConflicts(appointments);
  if (quantityConflicts.length > 0) {
    console.log(chalk.yellow(`发现 ${quantityConflicts.length} 组数量冲突:`));
    quantityConflicts.slice(0, 5).forEach((item) => {
      const orderNo = canViewField(user.role, 'orderNo') ? item.orderNo : '******';
      console.log(`  订单号 ${orderNo}: ${item.count} 条记录, 家电类型: ${item.types.join(', ')}`);
    });
  } else {
    console.log(chalk.green('未发现数量冲突'));
  }

  console.log(`\n${chalk.cyan('🔍 改约/二次上门合并检测')}`);
  const mergeConflicts = detectMergeConflicts(appointments);
  if (mergeConflicts.length > 0) {
    console.log(chalk.yellow(`发现 ${mergeConflicts.length} 组可能需要合并的改约/二次上门:`));
    mergeConflicts.slice(0, 5).forEach((item) => {
      const orderNo = canViewField(user.role, 'orderNo') ? item.orderNo : '******';
      console.log(`  订单号 ${orderNo}: ${item.count} 条记录, 状态: ${item.statuses.join(', ')}`);
    });
  } else {
    console.log(chalk.green('未发现改约/二次上门合并问题'));
  }

  addOperationLog('check_records', user, {});

  console.log(`\n${chalk.gray('使用 hai fix <dirtyId> 修复脏记录')}`);
  console.log(`${chalk.gray('使用 hai report --detail 查看失败清单')}`);
}
