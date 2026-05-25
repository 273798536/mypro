import { User, UserRole } from '../types';
export interface RoleViewSummary {
    role: UserRole;
    pendingActions: number;
    totalRecords: number;
    recordsByStatus: Record<string, number>;
    keyMetrics: {
        totalCompensation: number;
        avgCompensation: number;
        dirtyRecordCount: number;
    };
}
export interface ChangeReasonSummary {
    reason: string;
    count: number;
    percentage: number;
}
export interface SensitiveFieldHandling {
    field: string;
    totalHandled: number;
    lastHandledAt?: string;
    handlings: Array<{
        timestamp: string;
        operator: string;
        operation: string;
    }>;
}
export interface DataConsistencyReport {
    listCount: number;
    detailCount: number;
    historyCount: number;
    exportLogCount: number;
    totalAmountFromList: number;
    totalAmountFromDetails: number;
    isConsistent: boolean;
    inconsistencies: string[];
}
export declare const summaryService: {
    getRoleViewSummary(user: User): Promise<RoleViewSummary>;
    getChangeReasons(): Promise<ChangeReasonSummary[]>;
    getSensitiveFieldHandling(): Promise<SensitiveFieldHandling[]>;
    getDataConsistencyReport(): Promise<DataConsistencyReport>;
    getDirtyRecordStats(): Promise<{
        type: string;
        count: number;
        unresolved: number;
    }[]>;
};
