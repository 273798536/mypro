import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Parser } from 'json2csv';
import {
  getAppointments,
  getLocations,
  getReviews,
  getPriceAdjustments,
  getDirtyRecords,
  getCurrentUser,
  addOperationLog,
} from '../utils/database';
import { requirePermission } from './login';
import { getSourceTypeLabel, getDirtyTypeLabel } from '../utils/dirtyChecker';

export async function handleExport(options: {
  format?: 'csv' | 'json';
  output?: string;
  type?: string;
  includeDirty?: boolean;
}): Promise<void> {
  requirePermission('export');

  const user = getCurrentUser()!;
  const format = options.format || 'csv';
  const outputDir = options.output || './exports';

  console.log(chalk.blue('=== 数据导出 ===\n'));

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const exportedFiles: string[] = [];

  if (!options.type || options.type === 'appointment') {
    const appointments = getAppointments();
    const filePath = path.join(outputDir, `appointments_${timestamp}.${format}`);
    await exportData(appointments, filePath, format);
    exportedFiles.push(filePath);
    console.log(chalk.green(`✅ 预约单: ${appointments.length} 条`));
  }

  if (!options.type || options.type === 'location') {
    const locations = getLocations();
    const filePath = path.join(outputDir, `locations_${timestamp}.${format}`);
    await exportData(locations, filePath, format);
    exportedFiles.push(filePath);
    console.log(chalk.green(`✅ 师傅定位: ${locations.length} 条`));
  }

  if (!options.type || options.type === 'review') {
    const reviews = getReviews();
    const filePath = path.join(outputDir, `reviews_${timestamp}.${format}`);
    await exportData(reviews, filePath, format);
    exportedFiles.push(filePath);
    console.log(chalk.green(`✅ 用户评价: ${reviews.length} 条`));
  }

  if (!options.type || options.type === 'price_adjustment') {
    const priceAdjustments = getPriceAdjustments();
    const filePath = path.join(outputDir, `price_adjustments_${timestamp}.${format}`);
    await exportData(priceAdjustments, filePath, format);
    exportedFiles.push(filePath);
    console.log(chalk.green(`✅ 手工改价: ${priceAdjustments.length} 条`));
  }

  if (options.includeDirty) {
    const dirtyRecords = getDirtyRecords().map((r) => ({
      ...r,
      dirtyTypeLabel: getDirtyTypeLabel(r.dirtyType),
      sourceTypeLabel: getSourceTypeLabel(r.sourceType),
    }));
    const filePath = path.join(outputDir, `dirty_records_${timestamp}.${format}`);
    await exportData(dirtyRecords, filePath, format);
    exportedFiles.push(filePath);
    console.log(chalk.yellow(`✅ 脏记录: ${dirtyRecords.length} 条`));
  }

  addOperationLog('export_data', user, {});

  console.log(`\n${chalk.cyan('📁 导出文件:')}`);
  exportedFiles.forEach((f) => {
    console.log(`  ${f}`);
  });
}

async function exportData(data: any[], filePath: string, format: 'csv' | 'json'): Promise<void> {
  if (format === 'csv') {
    try {
      const parser = new Parser();
      const csv = parser.parse(data);
      fs.writeFileSync(filePath, '\uFEFF' + csv, 'utf-8');
    } catch (err: any) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
  } else {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

export async function handleExportDirty(filePath: string): Promise<void> {
  requirePermission('export');

  const user = getCurrentUser()!;
  const dirtyRecords = getDirtyRecords().filter((r) => r.status !== 'approved');

  console.log(chalk.blue('=== 导出失败清单 ===\n'));

  const exportData = dirtyRecords.map((r) => ({
    记录ID: r.id,
    原始文件: r.sourceFile,
    原始行号: r.rawRow,
    数据源: getSourceTypeLabel(r.sourceType),
    问题类型: getDirtyTypeLabel(r.dirtyType),
    问题描述: r.description,
    状态: r.status,
    原始数据: JSON.stringify(r.originalData),
    建议修复: JSON.stringify(r.suggestedFix || {}),
    修复说明: r.fixNote || '',
    创建时间: r.createdAt,
  }));

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const parser = new Parser();
  const csv = parser.parse(exportData);
  fs.writeFileSync(filePath, '\uFEFF' + csv, 'utf-8');

  addOperationLog('export_dirty_records', user, {});

  console.log(chalk.green(`✅ 已导出 ${dirtyRecords.length} 条待处理记录`));
  console.log(`文件路径: ${filePath}`);
}
