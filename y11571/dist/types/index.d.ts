export interface Ticket {
    id: string;
    ticketNo: string;
    title: string;
    status: TicketStatus;
    priority: 'low' | 'medium' | 'high' | 'critical';
    createdAt: string;
    updatedAt: string;
    assignee: string;
    department: string;
    source: string;
    originalRowNumber?: number;
    importBatchId: string;
}
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'escalated';
export interface SessionSummary {
    id: string;
    ticketId: string;
    summary: string;
    keyPoints: string[];
    createdAt: string;
    createdBy: string;
    importBatchId: string;
    originalRowNumber?: number;
}
export interface SLARule {
    id: string;
    ticketId: string;
    ruleName: string;
    responseTime: number;
    resolutionTime: number;
    warningTime: number;
    startTime: string;
    deadline: string;
    isViolated: boolean;
    actualResponseTime?: number;
    actualResolutionTime?: number;
    importBatchId: string;
    originalRowNumber?: number;
}
export interface CompensationApproval {
    id: string;
    ticketId: string;
    amount: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    approver?: string;
    approvedAt?: string;
    createdAt: string;
    createdBy: string;
    importBatchId: string;
    originalRowNumber?: number;
}
export interface CustomerServiceNote {
    id: string;
    ticketId: string;
    content: string;
    createdAt: string;
    createdBy: string;
    type: 'internal' | 'customer';
    importBatchId: string;
    originalRowNumber?: number;
}
export interface ExceptionPhoto {
    id: string;
    ticketId: string;
    fileName: string;
    filePath: string;
    uploadedAt: string;
    uploadedBy: string;
    description?: string;
    importBatchId: string;
    originalRowNumber?: number;
}
export interface AssignmentHistory {
    id: string;
    ticketId: string;
    fromAssignee: string;
    toAssignee: string;
    fromDepartment: string;
    toDepartment: string;
    transferredAt: string;
    reason: string;
    importBatchId: string;
    originalRowNumber?: number;
}
export interface ImportRecord {
    id: string;
    batchId: string;
    sourceType: string;
    sourceFile: string;
    importedAt: string;
    importedBy: string;
    totalRecords: number;
    successCount: number;
    failedCount: number;
    status: 'completed' | 'failed' | 'partial';
}
export interface ImportError {
    id: string;
    batchId: string;
    recordType: string;
    originalRowNumber: number;
    errorType: string;
    errorMessage: string;
    rawData: Record<string, unknown>;
    createdAt: string;
}
export interface DataDiff {
    field: string;
    oldValue: unknown;
    newValue: unknown;
    changeType: 'added' | 'removed' | 'modified';
}
export interface HistoryRecord {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    diff: DataDiff[];
    performedBy: string;
    performedAt: string;
    batchId?: string;
}
export type EntityType = 'ticket' | 'sessionSummary' | 'slaRule' | 'compensationApproval' | 'customerServiceNote' | 'exceptionPhoto' | 'assignmentHistory';
export interface ReportData {
    summary: {
        totalTickets: number;
        openTickets: number;
        escalatedTickets: number;
        slaViolations: number;
        totalCompensation: number;
        pendingApprovals: number;
    };
    tickets: Ticket[];
    slaViolations: SLARule[];
    pendingCompensations: CompensationApproval[];
    failedRecords: ImportError[];
    assignmentConflicts: AssignmentConflict[];
}
export interface AssignmentConflict {
    ticketId: string;
    ticketNo: string;
    transfers: AssignmentHistory[];
    timeoutResponsible: string[];
    compensationAmount: number;
    remarks: string;
}
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export interface ConsistencyCheckResult {
    isConsistent: boolean;
    mismatches: {
        type: string;
        entityId: string;
        field: string;
        exportValue: unknown;
        historyValue: unknown;
    }[];
}
