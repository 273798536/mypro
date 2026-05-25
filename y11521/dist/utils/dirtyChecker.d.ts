import { AppointmentRecord, LocationRecord, ReviewRecord, PriceAdjustmentRecord, DirtyType, SourceType } from '../types';
export interface ValidationResult {
    isValid: boolean;
    dirtyType?: DirtyType;
    description?: string;
    missingFields?: string[];
    suggestedFix?: Record<string, any>;
}
export declare function checkAppointment(record: Partial<AppointmentRecord>, rawRow?: number, sourceFile?: string): ValidationResult;
export declare function checkLocation(record: Partial<LocationRecord>, rawRow?: number, sourceFile?: string): ValidationResult;
export declare function checkReview(record: Partial<ReviewRecord>, rawRow?: number, sourceFile?: string): ValidationResult;
export declare function checkPriceAdjustment(record: Partial<PriceAdjustmentRecord>, rawRow?: number, sourceFile?: string): ValidationResult;
export declare function detectDuplicates<T extends {
    orderNo?: string;
}>(records: T[], keyField?: keyof T): T[][];
export declare function detectNameChanges(records: Array<{
    orderNo?: string;
    customerName?: string;
    technicianName?: string;
}>): Array<{
    orderNo: string;
    names: string[];
}>;
export declare function detectAmountConflicts(records: Array<{
    orderNo?: string;
    originalAmount?: number;
    adjustedAmount?: number;
}>): Array<{
    orderNo: string;
    amounts: Array<{
        original: number;
        adjusted: number;
    }>;
}>;
export declare function detectQuantityConflicts(records: Array<{
    orderNo?: string;
    applianceType?: string;
    status?: string;
}>): Array<{
    orderNo: string;
    count: number;
    types: string[];
}>;
export declare function detectMergeConflicts(records: Array<{
    orderNo?: string;
    status?: string;
    appointmentDate?: string;
}>): Array<{
    orderNo: string;
    count: number;
    statuses: string[];
    dates: string[];
}>;
export declare function detectDuplicateRecords<T extends {
    orderNo?: string;
}>(records: T[]): Array<{
    orderNo: string;
    count: number;
    records: T[];
}>;
export declare function getDirtyTypeLabel(type: DirtyType): string;
export declare function getSourceTypeLabel(type: SourceType): string;
