export declare enum LedgerStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    REJECTED = "rejected",
    SECOND_CONFIRM = "second_confirm",
    AUDIT_ONLY = "audit_only"
}
export declare enum DataSource {
    APPOINTMENT = "appointment",
    TECHNICIAN_LOCATION = "technician_location",
    USER_REVIEW = "user_review",
    SECOND_CONFIRMATION = "second_confirmation"
}
export declare enum RoleType {
    ADMIN = "admin",
    AREA_MANAGER = "area_manager",
    AFTER_SALES = "after_sales",
    AUDITOR = "auditor"
}
export interface AppointmentOrder {
    id?: string;
    ledgerId: string;
    appointmentNo: string;
    batchNo: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    area: string;
    applianceType: string;
    appointmentTime: string;
    technicianId: string;
    technicianName: string;
    status: string;
    rawData: string;
    createdAt: string;
    updatedAt: string;
}
export interface TechnicianLocation {
    id?: string;
    ledgerId: string;
    appointmentNo: string;
    batchNo: string;
    technicianId: string;
    checkInTime: string;
    checkOutTime: string;
    locationAddress: string;
    latitude: number;
    longitude: number;
    distanceToCustomer: number;
    rawData: string;
    createdAt: string;
}
export interface UserReview {
    id?: string;
    ledgerId: string;
    appointmentNo: string;
    batchNo: string;
    rating: number;
    reviewContent: string;
    negativeReason?: string;
    reviewTime: string;
    reviewerPhone: string;
    rawData: string;
    createdAt: string;
}
export interface SecondConfirmation {
    id?: string;
    ledgerId: string;
    appointmentNo: string;
    batchNo: string;
    confirmType: 'reschedule' | 'second_visit' | 'other';
    confirmResult: string;
    confirmTime: string;
    operatorId: string;
    operatorName: string;
    remark: string;
    rawData: string;
    createdAt: string;
}
export interface Ledger {
    id: string;
    appointmentNo: string;
    batchNo: string;
    status: LedgerStatus;
    area: string;
    applianceType: string;
    currentHandler?: string;
    rejectReason?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface StatusChangeLog {
    id?: string;
    ledgerId: string;
    fromStatus: LedgerStatus;
    toStatus: LedgerStatus;
    operatorId: string;
    operatorName: string;
    changeReason: string;
    sensitiveFields?: string;
    createdAt: string;
}
export interface FailedRecord {
    id?: string;
    dataSource: DataSource;
    rawData: string;
    errorMessage: string;
    appointmentNo?: string;
    batchNo?: string;
    createdAt: string;
}
export interface LedgerDetail extends Ledger {
    appointment?: AppointmentOrder;
    technicianLocation?: TechnicianLocation;
    userReview?: UserReview;
    secondConfirmation?: SecondConfirmation;
    statusHistory: StatusChangeLog[];
}
export interface IdempotencyResult<T> {
    created: boolean;
    data: T;
}
