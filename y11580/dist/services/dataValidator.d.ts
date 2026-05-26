import { DirtyType, RecordType } from '../config';
export interface ValidationResult {
    isValid: boolean;
    dirtyType?: DirtyType;
    dirtyRemark?: string;
    missingFields?: string[];
}
export interface RecordData {
    recordType: RecordType;
    storeId: string;
    memberId?: string;
    memberName?: string;
    phone?: string;
    amount: number;
    quantity?: number;
    transactionDate?: Date;
    operator?: string;
    [key: string]: any;
}
export declare function checkMissingFields(data: RecordData): string[];
export declare function checkCrossDate(transactionDate: Date, batchDate: Date): boolean;
export declare function checkNameChange(existingName?: string, newName?: string): boolean;
export declare function checkAmountConflict(existingAmount: number, newAmount: number): boolean;
export declare function checkQuantityConflict(existingQty?: number | null, newQty?: number | null): boolean;
export interface ValidationContext {
    existingRecord?: {
        memberName?: string;
        amount?: number;
        quantity?: number;
    };
    batchDate?: Date;
}
export declare function validateRecord(data: RecordData, context?: ValidationContext): ValidationResult;
export declare function serializeJson(data: any): string;
export declare function deserializeJson<T = any>(str: string | null | undefined): T | null;
