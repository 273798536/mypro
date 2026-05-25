import { DataSource } from '../types';
export declare function generateIdempotencyKey(ticketId: string, dataSources: DataSource[], sourceIds?: {
    sessionSummaryId?: string;
    slaRuleId?: string;
    compensationApprovalId?: string;
    supplierStatementId?: string;
    approvalEmailId?: string;
}): string;
export declare function generateIdempotencyKeyFromBatch(batchIdentifier: string, batchDate: string): string;
