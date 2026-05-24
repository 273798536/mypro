import { AttendanceRecord, SourceEvidence, StatusHistory, CheckIssue, AttendanceStatus, SourceType, CheckIssueType } from './types';
export declare class AttendanceDatabase {
    private db;
    private dbPath;
    private dataDir;
    constructor(dataDir: string);
    init(): Promise<void>;
    private createTables;
    addStatusHistory(recordId: string, fromStatus: AttendanceStatus | null, toStatus: AttendanceStatus, operator: string, reason: string): Promise<void>;
    upsertRecord(parsedData: SourceEvidence['parsedData'], sourceEvidence: Omit<SourceEvidence, 'parsedData'> & {
        parsedData: SourceEvidence['parsedData'];
    }): Promise<{
        recordId: string;
        isNew: boolean;
        previousStatus: AttendanceStatus | null;
    }>;
    updateRecordStatus(recordId: string, newStatus: AttendanceStatus, operator: string, reason: string): Promise<void>;
    freezeRecord(recordId: string, operator: string, reason: string): Promise<void>;
    unfreezeRecord(recordId: string, operator: string, reason: string): Promise<void>;
    addIssue(recordId: string, type: CheckIssueType, severity: CheckIssue['severity'], description: string, relatedRecordIds?: string[]): Promise<string>;
    resolveIssue(issueId: string, resolvedBy: string): Promise<void>;
    addImportFailure(batchId: string, sourceFile: string, sourceType: SourceType, lineNumber: number, rawData: Record<string, string>, error: string): Promise<void>;
    getRecord(recordId: string): Promise<AttendanceRecord | null>;
    getAllRecords(): Promise<AttendanceRecord[]>;
    getRecordsByTrackingNumber(trackingNumber: string): Promise<AttendanceRecord[]>;
    getRecordHistory(recordId: string): Promise<StatusHistory[]>;
    getImportFailures(): Promise<Array<{
        sourceFile: string;
        sourceType: SourceType;
        lineNumber: number;
        error: string;
        rawData: Record<string, string>;
    }>>;
    getAllIssues(): Promise<CheckIssue[]>;
    private hydrateRecord;
    close(): Promise<void>;
}
