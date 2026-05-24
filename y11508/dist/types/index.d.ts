export declare enum Role {
    DATA_ENTRY = "data_entry",
    REVIEWER = "reviewer",
    SUPERVISOR = "supervisor",
    READ_ONLY = "read_only"
}
export declare enum DeviceStatus {
    NORMAL = "normal",
    CERT_EXPIRED = "cert_expired",
    DEACTIVATED = "deactivated",
    MAINTENANCE = "maintenance"
}
export declare enum RecordStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    REVIEWED = "reviewed",
    REJECTED = "rejected",
    CONFIRMED = "confirmed"
}
export declare enum ImportSource {
    INSPECTION = "inspection",
    CALIBRATION = "calibration",
    MAINTENANCE_QUOTE = "maintenance_quote",
    SECONDARY_CONFIRM = "secondary_confirm"
}
export interface User {
    id: string;
    username: string;
    role: Role;
    department: string;
    createdAt: Date;
}
export interface StatusChangeLog {
    id: string;
    entityType: string;
    entityId: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
    changedAt: Date;
    reason: string;
}
export interface MedicalDevice {
    id: string;
    deviceCode: string;
    deviceName: string;
    department: string;
    status: DeviceStatus;
    createdAt: Date;
    updatedAt: Date;
}
export interface InspectionRecord {
    id: string;
    recordNo: string;
    deviceId: string;
    deviceCode: string;
    inspector: string;
    inspectionDate: Date;
    inspectionItems: Record<string, any>;
    conclusion: string;
    status: RecordStatus;
    remarks: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CalibrationCertificate {
    id: string;
    certificateNo: string;
    deviceId: string;
    deviceCode: string;
    calibrationAgency: string;
    calibrationDate: Date;
    expiryDate: Date;
    calibrationItems: string[];
    conclusion: 'pass' | 'fail' | 'conditional';
    status: RecordStatus;
    fileUrl: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface MaintenanceQuote {
    id: string;
    quoteNo: string;
    deviceId: string;
    deviceCode: string;
    vendor: string;
    quoteDate: Date;
    estimatedCost: number;
    maintenanceItems: string[];
    status: RecordStatus;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface SecondaryConfirm {
    id: string;
    confirmNo: string;
    relatedRecordType: ImportSource;
    relatedRecordId: string;
    deviceId: string;
    deviceCode: string;
    confirmer: string;
    confirmDate: Date;
    confirmContent: string;
    status: RecordStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ImportFailure {
    id: string;
    source: ImportSource;
    rowNumber: number;
    rawData: string;
    errorMessage: string;
    importedAt: Date;
    importedBy: string;
}
export interface ReplaySession {
    id: string;
    name: string;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed';
    commands: ReplayCommand[];
    createdBy: string;
}
export interface ReplayCommand {
    id: string;
    sessionId: string;
    order: number;
    type: 'http' | 'db' | 'script';
    content: string;
    result?: string;
    executedAt?: Date;
    duration?: number;
}
