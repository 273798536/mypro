import { CheckinRecord, DepositRecord, RoomChangeRecord, ShiftRecord, DirtyRecord, RecordSource } from '../types';
export interface ValidationResult {
    isValid: boolean;
    dirtyRecords: Omit<DirtyRecord, 'id'>[];
}
export declare class DataValidator {
    private db;
    validateCheckinRecord(record: CheckinRecord, sourceRowNumber: number, detectedBy: string, importBatch: string): ValidationResult;
    validateDepositRecord(record: DepositRecord, sourceRowNumber: number, detectedBy: string, importBatch: string): ValidationResult;
    validateRoomChangeRecord(record: RoomChangeRecord, sourceRowNumber: number, detectedBy: string, importBatch: string): ValidationResult;
    validateShiftRecord(record: ShiftRecord, sourceRowNumber: number, detectedBy: string, importBatch: string): ValidationResult;
    checkCrossSourceConsistency(batchId: string, detectedBy: string, includeAllBatches?: boolean): Omit<DirtyRecord, 'id'>[];
    checkDuplicates(batchId: string, source: RecordSource, detectedBy: string): Omit<DirtyRecord, 'id'>[];
}
