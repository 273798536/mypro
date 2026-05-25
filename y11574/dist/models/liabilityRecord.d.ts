import { LiabilityRecord, WorkflowStatus, DataSource, DirtyRecordType } from '../types';
interface CreateLiabilityRecordDto {
    idempotencyKey: string;
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
}
export declare const liabilityRecordModel: {
    create(dto: CreateLiabilityRecordDto): Promise<LiabilityRecord>;
    findById(id: string): Promise<LiabilityRecord | null>;
    findByIdempotencyKey(key: string): Promise<LiabilityRecord | null>;
    findByTicketId(ticketId: string): Promise<LiabilityRecord[]>;
    list(filters?: {
        status?: WorkflowStatus;
        startDate?: string;
        endDate?: string;
        department?: string;
        agentId?: string;
        isDirty?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<LiabilityRecord[]>;
    update(id: string, updates: Partial<LiabilityRecord>): Promise<LiabilityRecord | null>;
    markDirty(id: string, dirtyTypes: DirtyRecordType[], originalContent: Record<string, unknown>): Promise<LiabilityRecord | null>;
    markCorrected(id: string): Promise<LiabilityRecord | null>;
    getStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        totalAmount: number;
        dirtyCount: number;
    }>;
};
export {};
