import { Database } from '../types';
export interface HistoryEntry {
    id: string;
    recordId: string;
    batchNumber: string;
    materialName: string;
    fromStatus: string;
    toStatus: string;
    changedBy: string;
    changedAt: string;
    reason: string;
}
export declare function getRecordHistory(db: Database, recordId: string): HistoryEntry[];
export declare function getAllHistory(db: Database, limit?: number): HistoryEntry[];
