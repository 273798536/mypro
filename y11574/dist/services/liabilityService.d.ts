import { LiabilityRecord, User, DataSource, DuplicateStrategy } from '../types';
import { DetectionResult } from '../utils/dirtyRecordDetector';
interface CreateRecordParams {
    ticketId: string;
    ticketNumber?: string;
    customerName?: string;
    customerPhone?: string;
    agentName?: string;
    agentId?: string;
    department?: string;
    slaBreachType?: string;
    slaBreachDuration?: number;
    compensationAmount: number;
    compensationType?: string;
    escalationLevel?: number;
    transferCount?: number;
    responsibleParty?: string;
    liabilityReason?: string;
    dataSources: DataSource[];
    sourceSessionSummaryId?: string;
    sourceSlaRuleId?: string;
    sourceCompensationApprovalId?: string;
    sourceSupplierStatementId?: string;
    sourceApprovalEmailId?: string;
    occurrenceDate: string;
    idempotencyKey: string;
    duplicateStrategy?: DuplicateStrategy;
    changeReason?: string;
}
export declare const liabilityService: {
    createRecord(params: CreateRecordParams, user: User, ipAddress?: string): Promise<{
        record: LiabilityRecord;
        isDuplicate: boolean;
        duplicateStrategy?: DuplicateStrategy;
    }>;
    updateRecord(id: string, updates: Partial<LiabilityRecord>, user: User, changeReason?: string, ipAddress?: string): Promise<LiabilityRecord | null>;
    submitRecord(id: string, user: User, ipAddress?: string): Promise<LiabilityRecord | null>;
    approveRecord(id: string, user: User, requestSecondConfirmation?: boolean, ipAddress?: string): Promise<LiabilityRecord | null>;
    rejectRecord(id: string, user: User, reason: string, ipAddress?: string): Promise<LiabilityRecord | null>;
    secondConfirmRecord(id: string, user: User, ipAddress?: string): Promise<LiabilityRecord | null>;
    markRecordDirty(id: string, detectionResult: DetectionResult, user: User): Promise<void>;
    resolveDirtyRecord(recordId: string, dirtyLogId: string, user: User, resolution: string, corrections?: Partial<LiabilityRecord>): Promise<LiabilityRecord | null>;
    addHandlingOpinion(id: string, user: User, opinion: string): Promise<LiabilityRecord | null>;
    supplementDataSource(id: string, user: User, dataSource: DataSource, sourceId: string, sourceIdField: string): Promise<LiabilityRecord | null>;
};
export {};
