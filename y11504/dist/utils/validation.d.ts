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
export declare const validateLedgerData: (data: Record<string, any>) => ValidationResult;
export declare const validateRepairOrder: (data: Record<string, any>) => ValidationResult;
export declare const validatePartScan: (data: Record<string, any>) => ValidationResult;
export declare const validateReceiptPhoto: (data: Record<string, any>) => ValidationResult;
export declare const validateExternalReceipt: (data: Record<string, any>) => ValidationResult;
