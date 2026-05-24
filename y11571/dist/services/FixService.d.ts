import { EntityType } from '../types';
export interface FixResult {
    fixedCount: number;
    skippedCount: number;
    fixes: {
        entityType: string;
        entityId: string;
        field: string;
        oldValue: unknown;
        newValue: unknown;
    }[];
}
export declare class FixService {
    fixSLAViolations(performedBy?: string): FixResult;
    fixOrphanedRecords(performedBy?: string): FixResult;
    updateEntity(entityType: EntityType, entityId: string, updates: Record<string, unknown>, performedBy?: string): boolean;
    approveCompensation(compensationId: string, approver: string, performedBy?: string): boolean;
    rejectCompensation(compensationId: string, approver: string, performedBy?: string): boolean;
}
export declare const fixService: FixService;
