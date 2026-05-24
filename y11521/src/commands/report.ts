import chalk from 'chalk';
import Table from 'cli-table3';
import {
  getAppointments,
  getLocations,
  getReviews,
  getPriceAdjustments,
  getDirtyRecords,
  getImportHistory,
  getCurrentUser,
  addOperationLog,
} from '../utils/database';
import { getSourceTypeLabel, getDirtyTypeLabel } from '../utils/dirtyChecker';
import { requirePermission } from './login';
import { SourceType, DirtyType } from '../types';

export async function handleReport(options: { type?: string; detail?: boolean }): Promise<void> {
  requirePermission('report');

  const user = getCurrentUser()!;

  console.log(chalk.blue('=== 巡检报告 ===\n'));

  const appointments = getAppointments();
  const locations = getLocations();
  const reviews = getReviews();
  const priceAdjustments = getPriceAdjustments();
  const dirtyRecords = getDirtyRecords();
  const importHistory = getImportHistory();

  console.log(chalk.cyan('📊 数据汇总'));
  const summaryTable = new Table({
    head: ['数据源', '记录数'],
    colWidths: [15, 10],
  });
  summaryTable.push(['预约单', String(appointments.length)]);
  summaryTable.push(['师傅定位', String(locations.length)]);
  summaryTable.push(['用户评价', String(reviews.length)]);
  summaryTable.push(['手工改价', String(priceAdjustments.length)]);
  summaryTable.push(['脏记录', chalk.yellow(String(dirtyRecords.length))]);
  console.log(summaryTable.toString());

  console.log(`\n${chalk.cyan('📋 用户评价分析')}`);
  const goodReviews = reviews.filter((r) => r.rating >= 4).length;
  const neutralReviews = reviews.filter((r) => r.rating === 3).length;
  const badReviews = reviews.filter((r) => r.rating <= 2).length;
  const badWithReason = reviews.filter((r) => r.rating <= 2 && r.badReason).length;

  const reviewTable = new Table({
    head: ['评价类型', '数量', '占比'],
    colWidths: [15, 10, 15],
  });
  reviewTable.push([
    chalk.green('好评(4-5星)'),
    String(goodReviews),
    `${((goodReviews / reviews.length) * 100).toFixed(1)}%`,
  ]);
  reviewTable.push([
    chalk.yellow('中评(3星)'),
    String(neutralReviews),
    `${((neutralReviews / reviews.length) * 100).toFixed(1)}%`,
  ]);
  reviewTable.push([
    chalk.red('差评(1-2星)'),
    String(badReviews),
    `${((badReviews / reviews.length) * 100).toFixed(1)}%`,
  ]);
  reviewTable.push([
    chalk.magenta('差评有原因'),
    String(badWithReason),
    badReviews > 0 ? `${((badWithReason / badReviews) * 100).toFixed(1)}%` : 'N/A',
  ]);
  console.log(reviewTable.toString());

  console.log(`\n${chalk.cyan('⚠️  差评原因缺失清单')}`);
  const missingBadReason = reviews.filter((r) => r.rating <= 2 && !r.badReason);
  if (missingBadReason.length > 0) {
    const missingTable = new Table({
      head: ['订单号', '评分', '评价内容', '原始行号'],
      colWidths: [15, 8, 30, 10],
    });
    missingBadReason.slice(0, 10).forEach((r) => {
      missingTable.push([r.orderNo, String(r.rating), r.reviewContent.slice(0, 28), String(r.rawRow || '-')]);
    });
    console.log(missingTable.toString());
    if (missingBadReason.length > 10) {
      console.log(chalk.gray(`... 还有 ${missingBadReason.length - 10} 条`));
    }
  } else {
    console.log(chalk.green('✅ 所有差评都有原因说明'));
  }

  console.log(`\n${chalk.cyan('🔍 脏记录分类统计')}`);
  const dirtyByType: Record<DirtyType, number> = {} as any;
  dirtyRecords.forEach((r) => {
    dirtyByType[r.dirtyType] = (dirtyByType[r.dirtyType] || 0) + 1;
  });
  const dirtyTypeTable = new Table({
    head: ['问题类型', '数量', '状态分布'],
    colWidths: [15, 8, 30],
  });
  Object.entries(dirtyByType).forEach(([type, count]) => {
    const typeRecords = dirtyRecords.filter((r) => r.dirtyType === type);
    const dirtyCount = typeRecords.filter((r) => r.status === 'dirty').length;
    const fixedCount = typeRecords.filter((r) => r.status === 'fixed').length;
    const approvedCount = typeRecords.filter((r) => r.status === 'approved').length;
    dirtyTypeTable.push([
      getDirtyTypeLabel(type as DirtyType),
      String(count),
      `待处理:${dirtyCount} 已修复:${fixedCount} 已复核:${approvedCount}`,
    ]);
  });
  console.log(dirtyTypeTable.toString());

  console.log(`\n${chalk.cyan('📥 导入历史')}`);
  const importTable = new Table({
    head: ['时间', '文件名', '类型', '总数', '成功', '脏记录'],
    colWidths: [20, 20, 10, 8, 8, 10],
  });
  importHistory.slice(0, 10).forEach((h) => {
    importTable.push([
      h.importedAt.slice(0, 19).replace('T', ' '),
      h.fileName.slice(0, 18),
      getSourceTypeLabel(h.sourceType),
      String(h.totalRecords),
      chalk.green(String(h.successCount)),
      chalk.yellow(String(h.dirtyCount)),
    ]);
  });
  console.log(importTable.toString());

  if (options.detail) {
    console.log(`\n${chalk.cyan('📋 失败清单 (带原始行号)')}`);
    const failedRecords = dirtyRecords.filter((r) => r.status !== 'approved');
    const failedTable = new Table({
      head: ['ID', '原始文件', '行号', '问题类型', '状态'],
      colWidths: [12, 20, 8, 12, 10],
    });
    failedRecords.slice(0, 20).forEach((r) => {
      failedTable.push([
        r.id.slice(0, 10),
        r.sourceFile || '-',
        String(r.rawRow || '-'),
        getDirtyTypeLabel(r.dirtyType),
        r.status,
      ]);
    });
    console.log(failedTable.toString());
  }

  addOperationLog('generate_report', user, {});

  console.log(`\n${chalk.gray('提示: 使用 hai export 导出详细报告')}`);
}
