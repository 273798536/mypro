import { HistoryRecord, UserRole, DuplicateStrategy } from '../types';
interface CreateHistoryRecordDto {
    recordId: string;
    operation: string;
    operationType: HistoryRecord['operationType'];
    operatorId: string;
    operatorName: string;
    operatorRole: UserRole;
    previousValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    changedFields: string[];
    changeReason?: string;
    duplicateStrategy?: DuplicateStrategy;
    sensitiveFieldsHandled?: string[];
    ipAddress?: string;
}
export declare const historyRecordModel: {
    create(dto: CreateHistoryRecordDto): Promise<HistoryRecord>;
    findById(id: string): Promise<HistoryRecord | null>;
    findByRecordId(recordId: string): Promise<HistoryRecord[]>;
    list(filters?: {
        operatorId?: string;
        operationType?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<HistoryRecord[]>;
    getChangeReasons(): Promise<Array<{
        reason: string;
        count: number;
    }>>;
};
export {};
