import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import { DatabaseManager } from '../database';
import { SourceType, WaveRecord, PickDiffRecord, ReviewScanRecord, CustomerNoteRecord } from '../types';
import { parseNumber, parseBoolean, logSuccess, logError, logWarning, logInfo } from '../utils';
import { v4 as uuidv4 } from 'uuid';

export interface ImportOptions {
  sourceType?: SourceType;
  file?: string;
  operator?: string;
}

interface ImportStats {
  total: number;
  success: number;
  update: number;
  fail: number;
}

const SOURCE_CONFIGS: Record<SourceType, {
  pattern: RegExp;
  requiredFields: string[];
  displayName: string;
}> = {
  wave: {
    pattern: /^wave_.*\.csv$/i,
    requiredFields: ['waveNo', 'orderNo', 'skuCode', 'skuName', 'planQty', 'storeCode', 'storeName'],
    displayName: '波次单',
  },
  pick_diff: {
    pattern: /^pick_diff_.*\.csv$/i,
    requiredFields: ['waveNo', 'orderNo', 'skuCode', 'pickQty', 'diffQty', 'diffType'],
    displayName: '拣货差异',
  },
  review_scan: {
    pattern: /^review_scan_.*\.csv$/i,
    requiredFields: ['waveNo', 'orderNo', 'skuCode', 'reviewQty', 'isException'],
    displayName: '复核扫描',
  },
  customer_note: {
    pattern: /^customer_note_.*\.csv$/i,
    requiredFields: ['waveNo', 'orderNo', 'noteType', 'noteContent', 'isUrgent'],
    displayName: '客服备注',
  },
};

function detectSourceType(fileName: string): SourceType | null {
  for (const [type, config] of Object.entries(SOURCE_CONFIGS)) {
    if (config.pattern.test(fileName)) {
      return type as SourceType;
    }
  }
  return null;
}

function validateFields(row: Record<string, string>, requiredFields: string[]): string[] {
  const missing: string[] = [];
  for (const field of requiredFields) {
    if (!row[field] && row[field] !== '0') {
      missing.push(field);
    }
  }
  return missing;
}

function transformRow(row: Record<string, string>, sourceType: SourceType): Record<string, any> {
  switch (sourceType) {
    case 'wave':
      return {
        waveNo: row.waveNo?.trim() || '',
        orderNo: row.orderNo?.trim() || '',
        skuCode: row.skuCode?.trim() || '',
        skuName: row.skuName?.trim() || '',
        planQty: parseNumber(row.planQty),
        storeCode: row.storeCode?.trim() || '',
        storeName: row.storeName?.trim() || '',
        picker: row.picker?.trim(),
        area: row.area?.trim(),
      } as WaveRecord;
    case 'pick_diff':
      return {
        waveNo: row.waveNo?.trim() || '',
        orderNo: row.orderNo?.trim() || '',
        skuCode: row.skuCode?.trim() || '',
        pickQty: parseNumber(row.pickQty),
        diffQty: parseNumber(row.diffQty),
        diffType: row.diffType?.trim() || '',
        diffReason: row.diffReason?.trim(),
        picker: row.picker?.trim(),
        pickTime: row.pickTime?.trim(),
      } as PickDiffRecord;
    case 'review_scan':
      return {
        waveNo: row.waveNo?.trim() || '',
        orderNo: row.orderNo?.trim() || '',
        skuCode: row.skuCode?.trim() || '',
        reviewQty: parseNumber(row.reviewQty),
        reviewer: row.reviewer?.trim(),
        reviewTime: row.reviewTime?.trim(),
        isException: parseBoolean(row.isException),
        exceptionReason: row.exceptionReason?.trim(),
      } as ReviewScanRecord;
    case 'customer_note':
      return {
        waveNo: row.waveNo?.trim() || '',
        orderNo: row.orderNo?.trim() || '',
        skuCode: row.skuCode?.trim() || '',
        noteType: row.noteType?.trim() || '',
        noteContent: row.noteContent?.trim() || '',
        operator: row.operator?.trim(),
        noteTime: row.noteTime?.trim(),
        isUrgent: parseBoolean(row.isUrgent),
      } as CustomerNoteRecord;
  }
}

async function importFile(
  filePath: string,
  sourceType: SourceType,
  db: DatabaseManager,
  operator?: string
): Promise<ImportStats & { batchId: string }> {
  const stats: ImportStats = { total: 0, success: 0, update: 0, fail: 0 };
  const batchId = uuidv4();
  const config = SOURCE_CONFIGS[sourceType];
  const fileName = path.basename(filePath);

  const rows: { row: Record<string, string>; rowNum: number }[] = [];

  await new Promise<void>((resolve) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        stats.total++;
        rows.push({ row, rowNum: stats.total + 1 });
      })
      .on('end', () => resolve())
      .on('error', (err) => {
        logError(`读取文件失败: ${err.message}`);
        resolve();
      });
  });

  for (const { row, rowNum } of rows) {
    try {
      const missing = validateFields(row, config.requiredFields);
      if (missing.length > 0) {
        stats.fail++;
        logWarning(`第${rowNum}行缺少必填字段: ${missing.join(', ')}`);
        continue;
      }

      const data = transformRow(row, sourceType);
      const skuCode = data.skuCode || data.noteType || 'general';

      const result = await db.upsertFactRecord(
        sourceType,
        data.waveNo,
        data.orderNo,
        skuCode,
        data,
        rowNum,
        fileName,
        batchId
      );

      stats.success++;
      if (!result.isNew) {
        stats.update++;
      }
    } catch (e: any) {
      stats.fail++;
      logError(`第${rowNum}行导入失败: ${e.message}`);
    }
  }

  await db.createImportBatch(
    sourceType,
    fileName,
    stats.total,
    stats.success,
    stats.update,
    stats.fail,
    operator
  );

  return { ...stats, batchId };
}

export async function importData(workspacePath: string, options: ImportOptions = {}): Promise<void> {
  const dataDir = path.join(workspacePath, '.wwi', 'data');

  if (!fs.existsSync(dataDir)) {
    logError('数据目录不存在，请先运行 wwi init');
    return;
  }

  const db = new DatabaseManager(workspacePath);
  await db.init();

  let filesToProcess: { filePath: string; sourceType: SourceType }[] = [];

  if (options.file) {
    const filePath = path.isAbsolute(options.file) ? options.file : path.join(dataDir, options.file);
    if (!fs.existsSync(filePath)) {
      logError(`文件不存在: ${filePath}`);
      await db.close();
      return;
    }
    const sourceType = options.sourceType || detectSourceType(path.basename(filePath));
    if (!sourceType) {
      logError('无法自动识别数据源类型，请使用 --type 参数指定');
      await db.close();
      return;
    }
    filesToProcess.push({ filePath, sourceType });
  } else {
    const allFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.csv'));
    for (const file of allFiles) {
      const sourceType = detectSourceType(file);
      if (sourceType) {
        if (!options.sourceType || options.sourceType === sourceType) {
          filesToProcess.push({ filePath: path.join(dataDir, file), sourceType });
        }
      }
    }
  }

  if (filesToProcess.length === 0) {
    logWarning('没有找到可导入的文件');
    await db.close();
    return;
  }

  logInfo(`找到 ${filesToProcess.length} 个文件待导入`);
  console.log('');

  for (const { filePath, sourceType } of filesToProcess) {
    const config = SOURCE_CONFIGS[sourceType];
    const fileName = path.basename(filePath);

    logInfo(`正在导入 [${config.displayName}]: ${fileName}`);
    const stats = await importFile(filePath, sourceType, db, options.operator);

    console.log(`  总计: ${stats.total} 条`);
    console.log(`  成功: ${stats.success} 条 (更新: ${stats.update} 条)`);
    console.log(`  失败: ${stats.fail} 条`);
    console.log(`  批次ID: ${stats.batchId}`);
    console.log('');
  }

  await db.close();
  logSuccess('导入完成');
}
