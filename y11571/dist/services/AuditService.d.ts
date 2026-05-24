import { HistoryRecord, EntityType } from '../types';
export interface AuditCheckResult {
    name: string;
    passed: boolean;
    message: string;
    details?: string[];
}
export declare class AuditService {
    runAllAuditChecks(): AuditCheckResult[];
    checkDuplicateImports(): AuditCheckResult;
    checkPermissionConsistency(): AuditCheckResult;
    checkExceptionRetention(): AuditCheckResult;
    checkHistoryExportConsistency(): AuditCheckResult;
    checkDataIntegrity(): AuditCheckResult;
    getEntityHistory(entityType: EntityType, entityId: string): HistoryRecord[];
    getBatchHistory(batchId: string): HistoryRecord[];
    getRecentHistory(limit?: number): HistoryRecord[];
}
export declare const auditService: AuditService;
