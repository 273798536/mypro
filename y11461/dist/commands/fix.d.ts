import { Database, MaterialRecord } from '../types';
interface FixResult {
    success: boolean;
    recordId: string;
    message: string;
}
export declare function fixRecord(db: Database, recordId: string, fieldUpdates: Partial<MaterialRecord>, fixedBy: string, reason: string): FixResult;
export declare function autoFixRecord(db: Database, recordId: string, fixedBy: string): FixResult;
export declare function rejectRecord(db: Database, recordId: string, rejectedBy: string, reason: string): FixResult;
export declare function approveRecord(db: Database, recordId: string, approvedBy: string): FixResult;
export {};
