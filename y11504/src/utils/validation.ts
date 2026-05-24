import { DataQuality } from '../types/enums';

export interface ValidationResult {
  isValid: boolean;
  quality: DataQuality;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any, data: Record<string, any>) => boolean;
  errorMessage?: string;
}

export const validateLedgerData = (data: Record<string, any>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const requiredFields = ['ledgerNo', 'engineerId'];
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push({
        field,
        message: `${field} 是必填字段`,
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }
  }

  if (data.engineerId && !/^[A-Za-z0-9]{3,20}$/.test(data.engineerId)) {
    warnings.push({
      field: 'engineerId',
      message: '工程师ID格式可能不正确',
      code: 'FORMAT_WARNING',
      severity: 'warning',
    });
  }

  if (data.partScans && Array.isArray(data.partScans)) {
    data.partScans.forEach((scan: any, index: number) => {
      if (!scan.partCode) {
        errors.push({
          field: `partScans[${index}].partCode`,
          message: `备件扫码记录第 ${index + 1} 条缺少备件编码`,
          code: 'REQUIRED_FIELD',
          severity: 'error',
        });
      }
      if (scan.quantity !== undefined && (typeof scan.quantity !== 'number' || scan.quantity <= 0)) {
        errors.push({
          field: `partScans[${index}].quantity`,
          message: `备件扫码记录第 ${index + 1} 条数量必须大于0`,
          code: 'INVALID_VALUE',
          severity: 'error',
        });
      }
    });
  }

  if (data.receiptPhotos && Array.isArray(data.receiptPhotos)) {
    data.receiptPhotos.forEach((photo: any, index: number) => {
      if (!photo.photoUrl) {
        warnings.push({
          field: `receiptPhotos[${index}].photoUrl`,
          message: `签收照第 ${index + 1} 条缺少照片链接`,
          code: 'MISSING_PHOTO',
          severity: 'warning',
        });
      }
    });
  }

  let quality = DataQuality.VALID;
  if (errors.length > 0) {
    quality = DataQuality.INVALID;
  } else if (warnings.length > 0) {
    quality = DataQuality.SUSPICIOUS;
  }

  return {
    isValid: errors.length === 0,
    quality,
    errors,
    warnings,
  };
};

export const validateRepairOrder = (data: Record<string, any>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!data.orderNo) {
    errors.push({
      field: 'orderNo',
      message: '维修单号是必填字段',
      code: 'REQUIRED_FIELD',
      severity: 'error',
    });
  }

  if (data.customerPhone && !/^1[3-9]\d{9}$/.test(data.customerPhone)) {
    warnings.push({
      field: 'customerPhone',
      message: '客户手机号格式可能不正确',
      code: 'FORMAT_WARNING',
      severity: 'warning',
    });
  }

  let quality = DataQuality.VALID;
  if (errors.length > 0) {
    quality = DataQuality.INVALID;
  } else if (warnings.length > 0) {
    quality = DataQuality.SUSPICIOUS;
  }

  return {
    isValid: errors.length === 0,
    quality,
    errors,
    warnings,
  };
};

export const validatePartScan = (data: Record<string, any>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!data.partCode) {
    errors.push({
      field: 'partCode',
      message: '备件编码是必填字段',
      code: 'REQUIRED_FIELD',
      severity: 'error',
    });
  }

  if (data.quantity !== undefined && (typeof data.quantity !== 'number' || data.quantity <= 0)) {
    errors.push({
      field: 'quantity',
      message: '数量必须大于0',
      code: 'INVALID_VALUE',
      severity: 'error',
    });
  }

  let quality = DataQuality.VALID;
  if (errors.length > 0) {
    quality = DataQuality.INVALID;
  } else if (warnings.length > 0) {
    quality = DataQuality.SUSPICIOUS;
  }

  return {
    isValid: errors.length === 0,
    quality,
    errors,
    warnings,
  };
};
