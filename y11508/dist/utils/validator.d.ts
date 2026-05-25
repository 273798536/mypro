import { DatabaseService } from '../db/service';
export interface ValidationError {
    field: string;
    message: string;
}
export interface ValidationResult<T = any> {
    valid: boolean;
    errors: ValidationError[];
    data?: T;
}
export declare class DataValidator {
    private dbService;
    constructor(dbService: DatabaseService);
    validateRequired(data: any, fields: string[]): ValidationError[];
    validateDate(dateStr: string | Date, fieldName: string): ValidationError | null;
    validateDateRange(startDate: string | Date, endDate: string | Date, startField: string, endField: string): ValidationError | null;
    validateEnum(value: string, allowedValues: string[], fieldName: string): ValidationError | null;
    validateNumber(value: any, fieldName: string, min?: number, max?: number): ValidationError | null;
    validateStringLength(value: string, fieldName: string, min?: number, max?: number): ValidationError | null;
    validateDeviceExists(deviceCode: string): Promise<{
        valid: boolean;
        deviceId?: string;
        error?: ValidationError;
    }>;
    validateInspectionRecord(data: any): Promise<ValidationResult>;
    validateCalibrationCertificate(data: any): Promise<ValidationResult>;
    validateMaintenanceQuote(data: any): Promise<ValidationResult>;
    validateSecondaryConfirm(data: any): Promise<ValidationResult>;
    formatValidationErrors(errors: ValidationError[]): string;
}
