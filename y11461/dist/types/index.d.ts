export declare enum UserRole {
    DATA_ENTRY = "data_entry",
    REVIEWER = "reviewer",
    SUPERVISOR = "supervisor",
    READ_ONLY = "read_only"
}
export declare enum RecordStatus {
    PENDING = "pending",
    IMPORTED = "imported",
    DIRTY = "dirty",
    REVIEWED = "reviewed",
    FIXED = "fixed",
    REJECTED = "rejected",
    APPROVED = "approved"
}
export declare enum DirtyType {
    MISSING_FIELD = "missing_field",
    CROSS_DATE = "cross_date",
    NAME_CHANGED = "name_changed",
    AMOUNT_CONFLICT = "amount_conflict",
    QUANTITY_CONFLICT = "quantity_conflict"
}
export declare enum DataSource {
    IMPLANT_BATCH = "implant_batch",
    APPOINTMENT = "appointment",
    SUPPLIER_INVOICE = "supplier_invoice",
    MANUAL_ENTRY = "manual_entry"
}
export interface User {
    id: string;
    username: string;
    role: UserRole;
    name: string;
    createdAt: string;
}
export interface MaterialRecord {
    id: string;
    source: DataSource;
    sourceLine: number;
    sourceFile: string;
    batchNumber: string;
    materialName: string;
    materialType: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    supplier: string;
    patientId?: string;
    patientName?: string;
    appointmentDate?: string;
    invoiceNumber?: string;
    importDate: string;
    importedBy: string;
    status: RecordStatus;
    createdAt: string;
    updatedAt: string;
    rawData: Record<string, any>;
}
export interface DirtyRecord {
    id: string;
    recordId: string;
    dirtyType: DirtyType;
    fieldName?: string;
    expectedValue?: string;
    actualValue?: string;
    description: string;
    suggestion: string;
    createdAt: string;
    resolved: boolean;
    resolvedAt?: string;
    resolvedBy?: string;
}
export interface StateChange {
    id: string;
    recordId: string;
    fromStatus: RecordStatus;
    toStatus: RecordStatus;
    changedBy: string;
    changedAt: string;
    reason: string;
}
export interface Database {
    users: User[];
    records: MaterialRecord[];
    dirtyRecords: DirtyRecord[];
    stateChanges: StateChange[];
    settings: {
        initialized: boolean;
        initializedAt?: string;
        initializedBy?: string;
    };
}
export interface ImportResult {
    total: number;
    success: number;
    failed: number;
    dirty: number;
    records: MaterialRecord[];
    errors: string[];
}
export interface CheckResult {
    total: number;
    dirtyCount: number;
    dirtyByType: Record<DirtyType, number>;
    dirtyRecords: DirtyRecord[];
}
export interface FixOptions {
    recordId: string;
    fieldName?: string;
    newValue?: string;
    autoFix?: boolean;
}
