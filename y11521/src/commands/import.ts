import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import Table from 'cli-table3';
import {
  getCurrentUser,
  getAppointments,
  getLocations,
  getReviews,
  getPriceAdjustments,
  addAppointment,
  addLocation,
  addReview,
  addPriceAdjustment,
  addDirtyRecord,
  addImportHistory,
  addOperationLog,
} from '../utils/database';
import {
  parseCsvFile,
  detectSourceType,
  extractArchive,
  normalizeAppointment,
  normalizeLocation,
  normalizeReview,
  normalizePriceAdjustment,
  createTempDir,
  cleanupTempDir,
} from '../utils/importer';
import {
  checkAppointment,
  checkLocation,
  checkReview,
  checkPriceAdjustment,
  detectDuplicateRecords,
  detectNameChanges,
  detectAmountConflicts,
  detectQuantityConflicts,
  detectMergeConflicts,
  getSourceTypeLabel,
  getDirtyTypeLabel,
} from '../utils/dirtyChecker';
import { SourceType, AppointmentRecord } from '../types';
import { requirePermission } from './login';
import { compareObjects, formatDiff } from '../utils/diff';

interface ImportStats {
  sourceType: SourceType;
  fileName: string;
  total: number;
  success: number;
  dirty: number;
}

export async function handleImport(filePath: string, options: { type?: string; archive?: boolean }): Promise<void> {
  requirePermission('import');

  const user = getCurrentUser()!;
  const batchId = uuidv4();

  console.log(chalk.blue('=== 数据导入 ===\n'));
  console.log(chalk.gray(`批次ID: ${batchId}`));
  console.log(chalk.gray(`操作人: ${user.name}`));

  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`❌ 文件不存在: ${filePath}`));
    process.exit(1);
  }

  const allStats: ImportStats[] = [];

  if (options.archive || filePath.toLowerCase().endsWith('.zip')) {
    console.log(chalk.yellow('📦 检测到压缩包，开始解压...'));
    const tempDir = createTempDir();
    try {
      const extractedFiles = await extractArchive(filePath, tempDir);
      console.log(chalk.green(`✅ 解压完成，共发现 ${extractedFiles.length} 个文件\n`));

      for (const file of extractedFiles) {
        const stats = await importSingleFile(file, batchId, options.type as SourceType);
        if (stats) allStats.push(stats);
      }
    } finally {
      cleanupTempDir(tempDir);
    }
  } else {
    const stats = await importSingleFile(filePath, batchId, options.type as SourceType);
    if (stats) allStats.push(stats);
  }

  console.log(chalk.yellow('\n🔍 正在进行跨批次一致性检查...'));
  const crossBatchDirtyCount = await detectAndStoreCrossBatchIssues(batchId);

  addOperationLog(
    'import_batch',
    user,
    { batchId }
  );

  console.log(chalk.green('\n=== 导入完成 ==='));
  const summaryTable = new Table({
    head: ['数据源', '文件名', '总数', '成功', '脏记录'],
    colWidths: [12, 25, 8, 8, 10],
  });

  allStats.forEach((s) => {
    summaryTable.push([
      getSourceTypeLabel(s.sourceType),
      s.fileName,
      s.total,
      chalk.green(String(s.success)),
      chalk.yellow(String(s.dirty)),
    ]);
  });

  if (crossBatchDirtyCount > 0) {
    summaryTable.push([
      chalk.magenta('跨批次问题'),
      chalk.magenta('-'),
      '-',
      '-',
      chalk.magenta(String(crossBatchDirtyCount)),
    ]);
  }

  console.log(summaryTable.toString());
}

async function importSingleFile(
  filePath: string,
  batchId: string,
  forceType?: SourceType
): Promise<ImportStats | null> {
  const fileName = path.basename(filePath);
  const sourceType = forceType || detectSourceType(fileName);

  if (!sourceType) {
    console.log(chalk.yellow(`⚠️  无法识别文件类型，跳过: ${fileName}`));
    return null;
  }

  console.log(chalk.cyan(`\n📄 处理文件: ${fileName}`));
  console.log(chalk.gray(`类型: ${getSourceTypeLabel(sourceType)}`));

  const result = await parseCsvFile(filePath);

  if (result.errors.length > 0) {
    console.log(chalk.red(`❌ 解析错误 ${result.errors.length} 条:`));
    result.errors.slice(0, 5).forEach((e) => {
      console.log(`  行 ${e.row}: ${e.error}`);
    });
  }

  let successCount = 0;
  let dirtyCount = 0;

  for (const { row, data } of result.rawRecords) {
    try {
      if (sourceType === 'appointment') {
        const normalized = normalizeAppointment(data, row, fileName);
        const checkResult = checkAppointment(normalized, row, fileName);

        if (checkResult.isValid) {
          const record = addAppointment(normalized);
          successCount++;
          addOperationLog('import_appointment', getCurrentUser()!, {
            recordId: record.id,
            afterData: record,
            batchId,
          });
        } else {
          const pendingRecord = addAppointment(normalized);
          const originalDataWithId = { ...normalized, id: pendingRecord.id };
          addDirtyRecord({
            recordId: uuidv4(),
            sourceType,
            dirtyType: checkResult.dirtyType!,
            description: checkResult.description!,
            missingFields: checkResult.missingFields,
            originalData: originalDataWithId,
            suggestedFix: checkResult.suggestedFix,
            rawRow: row,
            sourceFile: fileName,
          });
          dirtyCount++;
        }
      } else if (sourceType === 'location') {
        const normalized = normalizeLocation(data, row, fileName);
        const checkResult = checkLocation(normalized, row, fileName);

        if (checkResult.isValid) {
          const record = addLocation(normalized);
          successCount++;
          addOperationLog('import_location', getCurrentUser()!, {
            recordId: record.id,
            afterData: record,
            batchId,
          });
        } else {
          const pendingRecord = addLocation(normalized);
          const originalDataWithId = { ...normalized, id: pendingRecord.id };
          addDirtyRecord({
            recordId: uuidv4(),
            sourceType,
            dirtyType: checkResult.dirtyType!,
            description: checkResult.description!,
            missingFields: checkResult.missingFields,
            originalData: originalDataWithId,
            suggestedFix: checkResult.suggestedFix,
            rawRow: row,
            sourceFile: fileName,
          });
          dirtyCount++;
        }
      } else if (sourceType === 'review') {
        const normalized = normalizeReview(data, row, fileName);
        const checkResult = checkReview(normalized, row, fileName);

        if (checkResult.isValid) {
          const record = addReview(normalized);
          successCount++;
          addOperationLog('import_review', getCurrentUser()!, {
            recordId: record.id,
            afterData: record,
            batchId,
          });
        } else {
          const pendingRecord = addReview(normalized);
          const originalDataWithId = { ...normalized, id: pendingRecord.id };
          addDirtyRecord({
            recordId: uuidv4(),
            sourceType,
            dirtyType: checkResult.dirtyType!,
            description: checkResult.description!,
            missingFields: checkResult.missingFields,
            originalData: originalDataWithId,
            suggestedFix: checkResult.suggestedFix,
            rawRow: row,
            sourceFile: fileName,
          });
          dirtyCount++;
        }
      } else if (sourceType === 'price_adjustment') {
        const normalized = normalizePriceAdjustment(data, row, fileName);
        const checkResult = checkPriceAdjustment(normalized, row, fileName);

        if (checkResult.isValid) {
          const record = addPriceAdjustment(normalized);
          successCount++;
          addOperationLog('import_price_adjustment', getCurrentUser()!, {
            recordId: record.id,
            afterData: record,
            batchId,
          });
        } else {
          const pendingRecord = addPriceAdjustment(normalized);
          const originalDataWithId = { ...normalized, id: pendingRecord.id };
          addDirtyRecord({
            recordId: uuidv4(),
            sourceType,
            dirtyType: checkResult.dirtyType!,
            description: checkResult.description!,
            missingFields: checkResult.missingFields,
            originalData: originalDataWithId,
            suggestedFix: checkResult.suggestedFix,
            rawRow: row,
            sourceFile: fileName,
          });
          dirtyCount++;
        }
      }
    } catch (err: any) {
      console.log(chalk.red(`  行 ${row}: ${err.message}`));
    }
  }

  addImportHistory({
    fileName,
    sourceType,
    importedBy: getCurrentUser()!.id,
    totalRecords: result.records.length,
    successCount,
    dirtyCount,
    batchId,
    isArchive: false,
  });

  console.log(`  总计: ${result.records.length} | 成功: ${chalk.green(String(successCount))} | 脏记录: ${chalk.yellow(String(dirtyCount))}`);

  return { sourceType, fileName, total: result.records.length, success: successCount, dirty: dirtyCount };
}

async function detectAndStoreCrossBatchIssues(batchId: string): Promise<number> {
  let crossBatchDirtyCount = 0;

  const appointments = getAppointments();
  const priceAdjustments = getPriceAdjustments();

  const duplicateAppointments = detectDuplicateRecords(appointments);
  for (const dup of duplicateAppointments) {
    const existingDirty = (await import('../utils/database')).getDirtyRecords();
    const alreadyExists = existingDirty.some(
      d => d.dirtyType === 'duplicate' &&
           d.originalData?.orderNo === dup.orderNo &&
           d.status === 'dirty'
    );
    if (!alreadyExists) {
      addDirtyRecord({
        recordId: uuidv4(),
        sourceType: 'appointment',
        dirtyType: 'duplicate',
        description: `订单号 ${dup.orderNo} 存在 ${dup.count} 条重复记录`,
        originalData: {
          orderNo: dup.orderNo,
          duplicateCount: dup.count,
          records: dup.records.map(r => ({
            row: r.rawRow,
            file: r.sourceFile,
            status: r.status,
            date: r.appointmentDate,
          })),
        },
        suggestedFix: {
          action: '合并或删除重复记录',
          keepRecord: dup.records[0]?.id,
          removeRecords: dup.records.slice(1).map(r => r.id),
        },
        sourceFile: '跨批次检测',
        rawRow: undefined,
      });
      crossBatchDirtyCount++;
    }
  }

  const nameChanges = detectNameChanges(appointments);
  for (const nc of nameChanges) {
    const existingDirty = (await import('../utils/database')).getDirtyRecords();
    const alreadyExists = existingDirty.some(
      d => d.dirtyType === 'name_changed' &&
           d.originalData?.orderNo === nc.orderNo &&
           d.status === 'dirty'
    );
    if (!alreadyExists) {
      addDirtyRecord({
        recordId: uuidv4(),
        sourceType: 'appointment',
        dirtyType: 'name_changed',
        description: `订单号 ${nc.orderNo} 客户姓名不一致: ${nc.names.join(' vs ')}`,
        originalData: { orderNo: nc.orderNo, names: nc.names },
        suggestedFix: {
          action: '确认正确的客户姓名',
          suggestion: nc.names[0],
        },
        sourceFile: '跨批次检测',
        rawRow: undefined,
      });
      crossBatchDirtyCount++;
    }
  }

  const amountConflicts = detectAmountConflicts(priceAdjustments);
  for (const ac of amountConflicts) {
    const existingDirty = (await import('../utils/database')).getDirtyRecords();
    const alreadyExists = existingDirty.some(
      d => d.dirtyType === 'amount_conflict' &&
           d.originalData?.orderNo === ac.orderNo &&
           d.status === 'dirty'
    );
    if (!alreadyExists) {
      addDirtyRecord({
        recordId: uuidv4(),
        sourceType: 'price_adjustment',
        dirtyType: 'amount_conflict',
        description: `订单号 ${ac.orderNo} 金额不一致`,
        originalData: { orderNo: ac.orderNo, amounts: ac.amounts },
        suggestedFix: {
          action: '确认正确的金额',
          amounts: ac.amounts,
        },
        sourceFile: '跨批次检测',
        rawRow: undefined,
      });
      crossBatchDirtyCount++;
    }
  }

  const quantityConflicts = detectQuantityConflicts(appointments);
  for (const qc of quantityConflicts) {
    const existingDirty = (await import('../utils/database')).getDirtyRecords();
    const alreadyExists = existingDirty.some(
      d => d.dirtyType === 'quantity_conflict' &&
           d.originalData?.orderNo === qc.orderNo &&
           d.status === 'dirty'
    );
    if (!alreadyExists) {
      addDirtyRecord({
        recordId: uuidv4(),
        sourceType: 'appointment',
        dirtyType: 'quantity_conflict',
        description: `订单号 ${qc.orderNo} 存在 ${qc.count} 条记录，家电类型: ${qc.types.join(', ')}`,
        originalData: { orderNo: qc.orderNo, count: qc.count, types: qc.types },
        suggestedFix: {
          action: '确认是否为多台家电安装或重复录入',
        },
        sourceFile: '跨批次检测',
        rawRow: undefined,
      });
      crossBatchDirtyCount++;
    }
  }

  const mergeConflicts = detectMergeConflicts(appointments);
  for (const mc of mergeConflicts) {
    const existingDirty = (await import('../utils/database')).getDirtyRecords();
    const alreadyExists = existingDirty.some(
      d => d.dirtyType === 'merge_conflict' &&
           d.originalData?.orderNo === mc.orderNo &&
           d.status === 'dirty'
    );
    if (!alreadyExists) {
      addDirtyRecord({
        recordId: uuidv4(),
        sourceType: 'appointment',
        dirtyType: 'merge_conflict',
        description: `订单号 ${mc.orderNo} 存在 ${mc.count} 条记录，状态: ${mc.statuses.join(', ')}，可能需要合并改约/二次上门`,
        originalData: { orderNo: mc.orderNo, count: mc.count, statuses: mc.statuses, dates: mc.dates },
        suggestedFix: {
          action: '确认是否为改约或二次上门，决定是否合并',
          statuses: mc.statuses,
          dates: mc.dates,
        },
        sourceFile: '跨批次检测',
        rawRow: undefined,
      });
      crossBatchDirtyCount++;
    }
  }

  if (crossBatchDirtyCount > 0) {
    console.log(chalk.yellow(`⚠️  发现 ${crossBatchDirtyCount} 个跨批次问题，已记录到脏记录`));
  }

  return crossBatchDirtyCount;
}
