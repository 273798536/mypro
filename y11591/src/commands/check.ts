import path from 'path';
import fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import Table from 'cli-table3';
import { DatabaseManager } from '../database';
import { FactRecord, ValidationError, RecordStatus } from '../types';
import { logSuccess, logError, logWarning, logInfo, formatDate } from '../utils';

export interface CheckOptions {
  wave?: string;
  export?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: Omit<ValidationError, 'id' | 'createdAt'>[];
}

function validateWaveRecord(record: FactRecord): ValidationResult {
  const errors: Omit<ValidationError, 'id' | 'createdAt'>[] = [];
  const data = record.data;

  if (!data.waveNo || data.waveNo.trim() === '') {
    errors.push({
      factId: record.id,
      factKey: record.factKey,
      sourceType: record.sourceType,
      originalRowNumber: record.originalRowNumber,
      errorCode: 'W001',
      errorMessage: '波次号不能为空',
      field: 'waveNo',
      value: data.waveNo,
    });
  }

  if (!data.orderNo || data.orderNo.trim() === '') {
    errors.push({
      factId: record.id,
      factKey: record.factKey,
      sourceType: record.sourceType,
      originalRowNumber: record.originalRowNumber,
      errorCode: 'W002',
      errorMessage: '订单号不能为空',
      field: 'orderNo',
      value: data.orderNo,
    });
  }

  if (!data.skuCode || data.skuCode.trim() === '') {
    errors.push({
      factId: record.id,
      factKey: record.factKey,
      sourceType: record.sourceType,
      originalRowNumber: record.originalRowNumber,
      errorCode: 'W003',
      errorMessage: 'SKU编码不能为空',
      field: 'skuCode',
      value: data.skuCode,
    });
  }

  if (data.planQty === undefined || data.planQty < 0) {
    errors.push({
      factId: record.id,
      factKey: record.factKey,
      sourceType: record.sourceType,
      originalRowNumber: record.originalRowNumber,
      errorCode: 'W004',
      errorMessage: '计划数量不能为负数',
      field: 'planQty',
      value: data.planQty,
    });
  }

  return { isValid: errors.length === 0, errors };
}

function validatePickDiffRecord(record: FactRecord): ValidationResult {
  const errors: Omit<ValidationError, 'id' | 'createdAt'>[] = [];
  const data = record.data;

  if (!data.waveNo || data.waveNo.trim() === '') {
    errors.push({
      factId: record.id,
      factKey: record.factKey,
      sourceType: record.sourceType,
      originalRowNumber: record.originalRowNumber,
      errorCode: 'P001',
      errorMessage: '波次号不能为空',
      field: 'waveNo',
      value: data.waveNo,
    });
  }

  if (data.pickQty !== undefined && data.pickQty < 0) {
    errors.push({
      factId: record.id,
      factKey: record.factKey,
      sourceType: record.sourceType,
      originalRowNumber: record.originalRowNumber,
      errorCode: 'P002',
      errorMessage: '拣货数量不能为负数',
      field: 'pickQty',
      value: data.pickQty,
    });
  }

  return { isValid: errors.length === 0, errors };
}

function validateReviewScanRecord(record: FactRecord): ValidationResult {
  const errors: Omit<ValidationError, 'id' | 'createdAt'>[] = [];
  const data = record.data;

  if (!data.waveNo || data.waveNo.trim() === '') {
    errors.push({
      factId: record.id,
      factKey: record.factKey,
      sourceType: record.sourceType,
      originalRowNumber: record.originalRowNumber,
      errorCode: 'R001',
      errorMessage: '波次号不能为空',
      field: 'waveNo',
      value: data.waveNo,
    });
  }

  if (data.reviewQty !== undefined && data.reviewQty < 0) {
    errors.push({
      factId: record.id,
      factKey: record.factKey,
      sourceType: record.sourceType,
      originalRowNumber: record.originalRowNumber,
      errorCode: 'R002',
      errorMessage: '复核数量不能为负数',
      field: 'reviewQty',
      value: data.reviewQty,
    });
  }

  return { isValid: errors.length === 0, errors };
}

function validateCustomerNoteRecord(record: FactRecord): ValidationResult {
  const errors: Omit<ValidationError, 'id' | 'createdAt'>[] = [];
  const data = record.data;

  if (!data.noteContent || data.noteContent.trim() === '') {
    errors.push({
      factId: record.id,
      factKey: record.factKey,
      sourceType: record.sourceType,
      originalRowNumber: record.originalRowNumber,
      errorCode: 'C001',
      errorMessage: '备注内容不能为空',
      field: 'noteContent',
      value: data.noteContent,
    });
  }

  return { isValid: errors.length === 0, errors };
}

function validateRecord(record: FactRecord): ValidationResult {
  switch (record.sourceType) {
    case 'wave':
      return validateWaveRecord(record);
    case 'pick_diff':
      return validatePickDiffRecord(record);
    case 'review_scan':
      return validateReviewScanRecord(record);
    case 'customer_note':
      return validateCustomerNoteRecord(record);
    default:
      return { isValid: true, errors: [] };
  }
}

function validateCrossSource(records: FactRecord[]): Omit<ValidationError, 'id' | 'createdAt'>[] {
  const errors: Omit<ValidationError, 'id' | 'createdAt'>[] = [];

  const waveRecords = records.filter((r) => r.sourceType === 'wave');
  const pickDiffRecords = records.filter((r) => r.sourceType === 'pick_diff');
  const reviewScanRecords = records.filter((r) => r.sourceType === 'review_scan');

  const waveKeySet = new Set(waveRecords.map((r) => `${r.orderNo}:${r.skuCode}`));
  const pickKeySet = new Set(pickDiffRecords.map((r) => `${r.orderNo}:${r.skuCode}`));
  const reviewKeySet = new Set(reviewScanRecords.map((r) => `${r.orderNo}:${r.skuCode}`));

  for (const pick of pickDiffRecords) {
    const key = `${pick.orderNo}:${pick.skuCode}`;
    if (!waveKeySet.has(key)) {
      errors.push({
        factId: pick.id,
        factKey: pick.factKey,
        sourceType: pick.sourceType,
        originalRowNumber: pick.originalRowNumber,
        errorCode: 'X001',
        errorMessage: '拣货差异记录在波次单中不存在，可能是缺单或SKU不匹配',
        field: 'orderNo+skuCode',
        value: key,
      });
    }
  }

  for (const review of reviewScanRecords) {
    const key = `${review.orderNo}:${review.skuCode}`;
    if (!waveKeySet.has(key)) {
      errors.push({
        factId: review.id,
        factKey: review.factKey,
        sourceType: review.sourceType,
        originalRowNumber: review.originalRowNumber,
        errorCode: 'X002',
        errorMessage: '复核扫描记录在波次单中不存在，可能是缺单或SKU不匹配',
        field: 'orderNo+skuCode',
        value: key,
      });
    }
  }

  for (const wave of waveRecords) {
    const key = `${wave.orderNo}:${wave.skuCode}`;
    if (!pickKeySet.has(key)) {
      errors.push({
        factId: wave.id,
        factKey: wave.factKey,
        sourceType: wave.sourceType,
        originalRowNumber: wave.originalRowNumber,
        errorCode: 'X003',
        errorMessage: '波次单商品缺少拣货差异数据',
        field: 'orderNo+skuCode',
        value: key,
      });
    }
    if (!reviewKeySet.has(key)) {
      errors.push({
        factId: wave.id,
        factKey: wave.factKey,
        sourceType: wave.sourceType,
        originalRowNumber: wave.originalRowNumber,
        errorCode: 'X004',
        errorMessage: '波次单商品缺少复核扫描数据',
        field: 'orderNo+skuCode',
        value: key,
      });
    }
  }

  return errors;
}

export async function check(workspacePath: string, options: CheckOptions = {}): Promise<void> {
  const db = new DatabaseManager(workspacePath);
  await db.init();

  let records: FactRecord[];
  if (options.wave) {
    records = await db.getFactRecordsByWave(options.wave);
    logInfo(`校验波次: ${options.wave}`);
  } else {
    records = await db.getAllFactRecords();
    logInfo(`校验所有数据，共 ${records.length} 条记录`);
  }

  if (records.length === 0) {
    logWarning('没有找到数据记录');
    await db.close();
    return;
  }

  const allErrors: Omit<ValidationError, 'id' | 'createdAt'>[] = [];

  for (const record of records) {
    await db.clearValidationErrors(record.id);
    const result = validateRecord(record);
    allErrors.push(...result.errors);
    for (const error of result.errors) {
      await db.addValidationError(error);
    }
    const status: RecordStatus = result.isValid ? 'pending' : 'invalid';
    await db.updateFactStatus(record.id, status);
  }

  const waveNos = [...new Set(records.map((r) => r.waveNo))];
  for (const waveNo of waveNos) {
    const waveRecords = records.filter((r) => r.waveNo === waveNo);
    const crossErrors = validateCrossSource(waveRecords);
    allErrors.push(...crossErrors);
    for (const error of crossErrors) {
      await db.addValidationError(error);
    }
  }

  for (const record of records) {
    const recordErrors = allErrors.filter((e) => e.factId === record.id);
    if (recordErrors.length > 0 && record.status !== 'fixed') {
      await db.updateFactStatus(record.id, 'invalid');
    } else if (record.status === 'pending') {
      await db.updateFactStatus(record.id, 'valid');
    }
  }

  await db.close();

  const validCount = records.filter((r) => {
    const recordErrors = allErrors.filter((e) => e.factId === r.id);
    return recordErrors.length === 0;
  }).length;
  const invalidCount = records.length - validCount;

  console.log('');
  logInfo('校验结果汇总:');
  const summaryTable = new Table({
    head: ['状态', '数量', '占比'],
    colWidths: [20, 10, 15],
  });
  summaryTable.push(
    ['有效', validCount.toString(), ((validCount / records.length) * 100).toFixed(1) + '%'],
    ['无效', invalidCount.toString(), ((invalidCount / records.length) * 100).toFixed(1) + '%']
  );
  console.log(summaryTable.toString());

  if (allErrors.length > 0) {
    console.log('');
    logWarning(`发现 ${allErrors.length} 个问题:`);
    const errorTable = new Table({
      head: ['原始行号', '数据源', '错误码', '错误信息'],
      colWidths: [12, 12, 10, 50],
      wordWrap: true,
    });

    const sourceTypeNames: Record<string, string> = {
      wave: '波次单',
      pick_diff: '拣货差异',
      review_scan: '复核扫描',
      customer_note: '客服备注',
    };

    for (const error of allErrors.slice(0, 20)) {
      errorTable.push([
        error.originalRowNumber.toString(),
        sourceTypeNames[error.sourceType] || error.sourceType,
        error.errorCode,
        error.errorMessage,
      ]);
    }
    console.log(errorTable.toString());

    if (allErrors.length > 20) {
      logInfo(`... 还有 ${allErrors.length - 20} 个错误未显示`);
    }

    if (options.export) {
      const reportsDir = path.join(workspacePath, '.wwi', 'reports');
      const errorFile = path.join(reportsDir, `validation_errors_${Date.now()}.csv`);

      const csvWriter = createObjectCsvWriter({
        path: errorFile,
        header: [
          { id: 'originalRowNumber', title: '原始行号' },
          { id: 'sourceType', title: '数据源' },
          { id: 'factKey', title: '事实键' },
          { id: 'errorCode', title: '错误码' },
          { id: 'errorMessage', title: '错误信息' },
          { id: 'field', title: '字段' },
          { id: 'value', title: '值' },
        ],
      });

      await csvWriter.writeRecords(
        allErrors.map((e) => ({
          ...e,
          sourceType: sourceTypeNames[e.sourceType] || e.sourceType,
          value: typeof e.value === 'object' ? JSON.stringify(e.value) : e.value,
        }))
      );

      logSuccess(`失败清单已导出: ${errorFile}`);
    }
  } else {
    logSuccess('所有数据校验通过！');
  }
}
