import { IndexSuggestion, AnomalyRecord, SchemaSnapshot, MetricsSupplement, AuditLogEntry, RunContext, RunStatus } from '../types';
export interface DataStoreSchema {
    runs: Array<RunContext & {
        status: RunStatus;
    }>;
    suggestions: IndexSuggestion[];
    anomalies: AnomalyRecord[];
    schemas: SchemaSnapshot[];
    supplements: MetricsSupplement[];
    auditLogs: AuditLogEntry[];
}
export declare function getStore(): DataStoreSchema;
export declare function saveStore(): void;
export declare function resetStoreForTest(): void;
export declare function closeDb(): void;
