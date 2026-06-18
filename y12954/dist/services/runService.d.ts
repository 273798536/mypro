import { AuditLogEntry, RunContext, RunStatus } from '../types';
export declare function createRun(context: Omit<RunContext, 'runId' | 'timestamp'> & {
    timestamp?: number;
}): RunContext;
export declare function updateRunStatus(runId: string, status: RunStatus, operator: string): void;
export declare function getRun(runId: string): (RunContext & {
    status: RunStatus;
}) | null;
export declare function listRuns(limit?: number): (RunContext & {
    status: RunStatus;
})[];
export declare function writeAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & {
    timestamp?: number;
}): string;
export declare function getAuditLogs(runId: string, entityType?: string): AuditLogEntry[];
