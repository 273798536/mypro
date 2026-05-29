import type { BadRowErrorType, SourceType } from '@/types';
import { isValidPlateNumber } from '@/utils/format';

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errorType?: BadRowErrorType;
  errorMessage?: string;
}

export const isEmptyRow = (row: Record<string, unknown>): boolean => {
  return Object.values(row).every(
    (value) => value === null || value === undefined || value === '' || String(value).trim() === ''
  );
};

export const hasRequiredColumns = (
  row: Record<string, unknown>,
  requiredColumns: string[]
): { valid: boolean; missingColumns: string[] } => {
  const missingColumns = requiredColumns.filter(
    (col) =>
      row[col] === null ||
      row[col] === undefined ||
      String(row[col]).trim() === ''
  );
  return {
    valid: missingColumns.length === 0,
    missingColumns,
  };
};

export const validateLicensePlateRow = (
  row: Record<string, string>,
  rowNumber: number
): ValidationResult<Record<string, string>> => {
  if (isEmptyRow(row)) {
    return {
      valid: false,
      errorType: 'emptyRow',
      errorMessage: `第${rowNumber}行：空行`,
    };
  }

  const requiredColumns = ['plateNumber', 'ownerName', 'building', 'roomNumber', 'phone'];
  const columnCheck = hasRequiredColumns(row, requiredColumns);
  if (!columnCheck.valid) {
    return {
      valid: false,
      errorType: 'missingColumn',
      errorMessage: `第${rowNumber}行：缺少必填列 [${columnCheck.missingColumns.join(', ')}]`,
    };
  }

  if (!isValidPlateNumber(row.plateNumber)) {
    return {
      valid: false,
      errorType: 'invalidFormat',
      errorMessage: `第${rowNumber}行：车牌号格式错误`,
    };
  }

  return { valid: true, data: row };
};

export const validateTempParkingRow = (
  row: Record<string, string>,
  rowNumber: number
): ValidationResult<Record<string, string>> => {
  if (isEmptyRow(row)) {
    return {
      valid: false,
      errorType: 'emptyRow',
      errorMessage: `第${rowNumber}行：空行`,
    };
  }

  const requiredColumns = ['plateNumber', 'entryTime', 'exitTime', 'feeAmount'];
  const columnCheck = hasRequiredColumns(row, requiredColumns);
  if (!columnCheck.valid) {
    return {
      valid: false,
      errorType: 'missingColumn',
      errorMessage: `第${rowNumber}行：缺少必填列 [${columnCheck.missingColumns.join(', ')}]`,
    };
  }

  const fee = parseFloat(row.feeAmount);
  if (isNaN(fee) || fee < 0) {
    return {
      valid: false,
      errorType: 'invalidFormat',
      errorMessage: `第${rowNumber}行：费用金额格式错误`,
    };
  }

  return { valid: true, data: row };
};

export const validateDiscountRow = (
  row: Record<string, string>,
  rowNumber: number
): ValidationResult<Record<string, string>> => {
  if (isEmptyRow(row)) {
    return {
      valid: false,
      errorType: 'emptyRow',
      errorMessage: `第${rowNumber}行：空行`,
    };
  }

  const requiredColumns = ['ownerId', 'name', 'type', 'value', 'effectiveDate', 'expiryDate'];
  const columnCheck = hasRequiredColumns(row, requiredColumns);
  if (!columnCheck.valid) {
    return {
      valid: false,
      errorType: 'missingColumn',
      errorMessage: `第${rowNumber}行：缺少必填列 [${columnCheck.missingColumns.join(', ')}]`,
    };
  }

  const validTypes = ['percentage', 'fixed', 'freeMonths'];
  if (!validTypes.includes(row.type)) {
    return {
      valid: false,
      errorType: 'invalidFormat',
      errorMessage: `第${rowNumber}行：优惠类型错误`,
    };
  }

  const value = parseInt(row.value, 10);
  if (isNaN(value) || value < 0) {
    return {
      valid: false,
      errorType: 'invalidFormat',
      errorMessage: `第${rowNumber}行：优惠值格式错误`,
    };
  }

  return { valid: true, data: row };
};

export const getValidator = (sourceType: SourceType) => {
  switch (sourceType) {
    case 'licensePlate':
      return validateLicensePlateRow;
    case 'tempParking':
      return validateTempParkingRow;
    case 'discount':
      return validateDiscountRow;
    case 'refund':
      return validateTempParkingRow;
    default:
      return validateLicensePlateRow;
  }
};
