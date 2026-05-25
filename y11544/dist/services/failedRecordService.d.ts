import { Database } from '../database';
import { FailedRecord } from '../types';
export declare class FailedRecordService {
    private db;
    constructor(db?: Database);
    getFailedRecords(recordType?: string, page?: number, pageSize?: number): Promise<{
        items: FailedRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getFailedRecordStats(): Promise<{
        total: number;
        byType: {
            type: string;
            count: number;
        }[];
    }>;
}
export declare const failedRecordService: FailedRecordService;
