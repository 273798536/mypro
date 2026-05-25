export declare enum MaterialStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    REJECTED = "rejected",
    SECONDARY_CONFIRMED = "secondary_confirmed",
    AUDIT_ONLY = "audit_only",
    EXPORTED = "exported"
}
export declare enum UserRole {
    OPERATOR = "operator",
    REVIEWER = "reviewer",
    MANAGER = "manager",
    AUDITOR = "auditor",
    ADMIN = "admin"
}
export interface Material {
    id: string;
    materialId: string;
    name: string;
    platform: string;
    originalName: string;
    status: MaterialStatus;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    version: number;
}
export interface AuditRecord {
    id: string;
    materialId: string;
    auditResult: 'pass' | 'reject' | 'pending';
    auditComment: string;
    auditedBy: string;
    auditedAt: string;
}
export interface DailyCost {
    id: string;
    materialId: string;
    date: string;
    cost: number;
    impressions: number;
    clicks: number;
    importedAt: string;
    isValid: boolean;
    validationError?: string;
}
export interface ManagerComment {
    id: string;
    materialId: string;
    comment: string;
    evidence?: string;
    commentedBy: string;
    commentedAt: string;
}
export interface StatusChangeLog {
    id: string;
    materialId: string;
    fromStatus: MaterialStatus | null;
    toStatus: MaterialStatus;
    changedBy: string;
    changedAt: string;
    reason: string;
}
export interface FailedRecord {
    id: string;
    recordType: 'cost_import' | 'audit' | 'material';
    originalData: string;
    errorReason: string;
    failedAt: string;
    source: string;
}
export interface CreateMaterialRequest {
    materialId: string;
    name: string;
    platform: string;
    originalName: string;
    createdBy: string;
}
export interface StatusChangeRequest {
    materialId: string;
    toStatus: MaterialStatus;
    changedBy: string;
    reason: string;
}
export interface CostImportRequest {
    materialId: string;
    date: string;
    cost: number;
    impressions: number;
    clicks: number;
    source: string;
}
export interface AuditRequest {
    materialId: string;
    auditResult: 'pass' | 'reject';
    auditComment: string;
    auditedBy: string;
}
export interface ManagerCommentRequest {
    materialId: string;
    comment: string;
    evidence?: string;
    commentedBy: string;
}
