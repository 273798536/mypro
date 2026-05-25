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
        message: `${field} is required`,
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }
  }

  if (data.engineerId && !/^[A-Za-z0-9]{3,20}$/.test(data.engineerId)) {
    warnings.push({
      field: 'engineerId',
      message: 'Engineer ID format may be incorrect',
      code: 'FORMAT_WARNING',
      severity: 'warning',
    });
  }

  if (data.partScans && Array.isArray(data.partScans)) {
    data.partScans.forEach((scan: any, index: number) => {
      if (!scan.partCode) {
        errors.push({
          field: `partScans[${index}].partCode`,
          message: `Part scan ${index + 1} missing part code`,
          code: 'REQUIRED_FIELD',
          severity: 'error',
        });
      }
      if (scan.quantity !== undefined && (typeof scan.quantity !== 'number' || scan.quantity <= 0)) {
        errors.push({
          field: `partScans[${index}].quantity`,
          message: `Part scan ${index + 1} quantity must be greater than 0`,
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
          message: `Receipt photo ${index + 1} missing photo URL`,
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
      message: 'Order number is required',
      code: 'REQUIRED_FIELD',
      severity: 'error',
    });
  }

  if (data.customerPhone && !/^1[3-9]\d{9}$/.test(data.customerPhone)) {
    warnings.push({
      field: 'customerPhone',
      message: 'Customer phone format may be incorrect',
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
      message: 'Part code is required',
      code: 'REQUIRED_FIELD',
      severity: 'error',
    });
  }

  if (data.quantity !== undefined && (typeof data.quantity !== 'number' || data.quantity <= 0)) {
    errors.push({
      field: 'quantity',
      message: 'Quantity must be greater than 0',
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

export const validateReceiptPhoto = (data: Record<string, any>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!data.photoUrl) {
    errors.push({
      field: 'photoUrl',
      message: 'Photo URL is required',
      code: 'REQUIRED_FIELD',
      severity: 'error',
    });
  }

  if (data.photoUrl && !/^https?:\/\/.+/.test(data.photoUrl)) {
    warnings.push({
      field: 'photoUrl',
      message: 'Photo URL format may be incorrect',
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

export const validateExternalReceipt = (data: Record<string, any>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!data.receiptNo && !data.content) {
    warnings.push({
      field: 'receiptNo/content',
      message: 'At least one of receipt number or content is required',
      code: 'MISSING_CONTENT',
      severity: 'warning',
    });
  }

  if (data.source && !['internal', 'external'].includes(data.source)) {
    errors.push({
      field: 'source',
      message: 'Source type must be internal or external',
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
