import { DirtyType, RecordType } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

export interface DirtyCheckResult {
  isDirty: boolean;
  type: DirtyType;
  details: string;
}

export interface DirtyRecordContext {
  existingRecords?: any[];
  currentDate: string;
}

export const checkMissingFields = (
  data: any,
  recordType: RecordType
): DirtyCheckResult => {
  const requiredFields: Record<RecordType, string[]> = {
    inspection: ['deviceId', 'deviceName', 'department', 'inspectionDate', 'inspector', 'result'],
    calibration: ['deviceId', 'deviceName', 'certificateNo', 'calibrationDate', 'validUntil', 'calibrationOrg', 'status'],
    repair: ['deviceId', 'deviceName', 'quoteNo', 'repairDate', 'description', 'amount', 'quantity', 'status'],
  };

  const missing = requiredFields[recordType].filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  );

  if (missing.length > 0) {
    return {
      isDirty: true,
      type: 'missing_fields',
      details: `缺少必填字段: ${missing.join(', ')}`,
    };
  }

  return { isDirty: false, type: 'none', details: '' };
};

export const checkCrossDay = (
  data: any,
  recordType: RecordType,
  context: DirtyRecordContext
): DirtyCheckResult => {
  const dateField = {
    inspection: 'inspectionDate',
    calibration: 'calibrationDate',
    repair: 'repairDate',
  }[recordType];

  if (!data[dateField]) {
    return { isDirty: false, type: 'none', details: '' };
  }

  try {
    const recordDate = parseISO(data[dateField]);
    const today = parseISO(context.currentDate);
    const daysDiff = differenceInDays(today, recordDate);

    if (daysDiff > 1) {
      return {
        isDirty: true,
        type: 'cross_day',
        details: `记录日期(${data[dateField]})与当前日期相差${daysDiff}天`,
      };
    }
  } catch (e) {
    // 日期格式错误，由 missing_fields 处理
  }

  return { isDirty: false, type: 'none', details: '' };
};

export const checkNameChanged = (
  data: any,
  recordType: RecordType,
  context: DirtyRecordContext
): DirtyCheckResult => {
  if (!context.existingRecords || context.existingRecords.length === 0) {
    return { isDirty: false, type: 'none', details: '' };
  }

  const existingNames = new Set(
    context.existingRecords
      .filter((r: any) => r.deviceId === data.deviceId)
      .map((r: any) => r.deviceName)
  );

  if (existingNames.size > 0 && !existingNames.has(data.deviceName)) {
    const names = Array.from(existingNames).join(', ');
    return {
      isDirty: true,
      type: 'name_changed',
      details: `设备名称不匹配，历史名称: ${names}, 当前名称: ${data.deviceName}`,
    };
  }

  return { isDirty: false, type: 'none', details: '' };
};

export const checkAmountConflict = (
  data: any,
  recordType: RecordType,
  context: DirtyRecordContext
): DirtyCheckResult => {
  if (recordType !== 'repair' || !context.existingRecords) {
    return { isDirty: false, type: 'none', details: '' };
  }

  const sameDeviceRecords = context.existingRecords.filter(
    (r: any) => r.deviceId === data.deviceId && r.quoteNo === data.quoteNo
  );

  if (sameDeviceRecords.length > 0) {
    const existing = sameDeviceRecords[0];
    if (Math.abs(existing.amount - data.amount) > 0.01) {
      return {
        isDirty: true,
        type: 'amount_conflict',
        details: `金额冲突，历史金额: ${existing.amount}, 当前金额: ${data.amount}`,
      };
    }
  }

  return { isDirty: false, type: 'none', details: '' };
};

export const checkQuantityConflict = (
  data: any,
  recordType: RecordType,
  context: DirtyRecordContext
): DirtyCheckResult => {
  if (recordType !== 'repair' || !context.existingRecords) {
    return { isDirty: false, type: 'none', details: '' };
  }

  const sameDeviceRecords = context.existingRecords.filter(
    (r: any) => r.deviceId === data.deviceId && r.quoteNo === data.quoteNo
  );

  if (sameDeviceRecords.length > 0) {
    const existing = sameDeviceRecords[0];
    if (existing.quantity !== data.quantity) {
      return {
        isDirty: true,
        type: 'quantity_conflict',
        details: `数量冲突，历史数量: ${existing.quantity}, 当前数量: ${data.quantity}`,
      };
    }
  }

  return { isDirty: false, type: 'none', details: '' };
};

export const detectDirtyRecord = (
  data: any,
  recordType: RecordType,
  context: DirtyRecordContext
): DirtyCheckResult => {
  const checks = [
    checkMissingFields(data, recordType),
    checkCrossDay(data, recordType, context),
    checkNameChanged(data, recordType, context),
    checkAmountConflict(data, recordType, context),
    checkQuantityConflict(data, recordType, context),
  ];

  const dirty = checks.find(c => c.isDirty);
  return dirty || { isDirty: false, type: 'none', details: '' };
};
