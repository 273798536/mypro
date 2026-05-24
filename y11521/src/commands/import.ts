import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import Table from 'cli-table3';
import {
  getCurrentUser,
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
  detectDuplicates,
  detectNameChanges,
  detectAmountConflicts,
  getSourceTypeLabel,
  getDirtyTypeLabel,
} from '../utils/dirtyChecker';
import { SourceType } from '../types';
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
          const beforeData = { ...normalized };
          const record = addAppointment(normalized);
          successCount++;
          addOperationLog('import_appointment', getCurrentUser()!, {
            recordId: record.id,
            afterData: record,
            batchId,
          });
        } else {
          addDirtyRecord({
            recordId: uuidv4(),
            sourceType,
            dirtyType: checkResult.dirtyType!,
            description: checkResult.description!,
            missingFields: checkResult.missingFields,
            originalData: normalized,
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
          addDirtyRecord({
            recordId: uuidv4(),
            sourceType,
            dirtyType: checkResult.dirtyType!,
            description: checkResult.description!,
            missingFields: checkResult.missingFields,
            originalData: normalized,
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
          addDirtyRecord({
            recordId: uuidv4(),
            sourceType,
            dirtyType: checkResult.dirtyType!,
            description: checkResult.description!,
            missingFields: checkResult.missingFields,
            originalData: normalized,
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
          addDirtyRecord({
            recordId: uuidv4(),
            sourceType,
            dirtyType: checkResult.dirtyType!,
            description: checkResult.description!,
            missingFields: checkResult.missingFields,
            originalData: normalized,
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
