export declare enum DataSource {
    REGISTRATION_FORM = "registration_form",
    SIGNIN_QRCODE = "signin_qrcode",
    HOMEWORK = "homework",
    MANUAL_PRICE = "manual_price",
    HISTORY_ARCHIVE = "history_archive"
}
export declare enum SigninType {
    NORMAL = "normal",
    RETRY = "retry",
    MANUAL = "manual",
    COMPENSATION = "compensation"
}
export declare enum QueueStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    RETRYING = "retrying",
    SUCCESS = "success",
    FAILED = "failed",
    DEAD_LETTER = "dead_letter",
    MANUAL_REVIEW = "manual_review",
    COMPENSATED = "compensated",
    CLOSED = "closed"
}
export declare enum RetryCategory {
    NETWORK_ERROR = "network_error",
    DATA_CONFLICT = "data_conflict",
    VALIDATION_ERROR = "validation_error",
    DUPLICATE_RECORD = "duplicate_record",
    MISSING_DATA = "missing_data",
    SYSTEM_ERROR = "system_error",
    UNKNOWN = "unknown"
}
export declare enum UserRole {
    DATA_ENTRY = "data_entry",
    REVIEWER = "reviewer",
    SUPERVISOR = "supervisor",
    READ_ONLY = "read_only"
}
export declare enum AuditAction {
    SUBMIT = "submit",
    QUEUE = "queue",
    RETRY = "retry",
    MANUAL_TAKEOVER = "manual_takeover",
    COMPENSATE = "compensate",
    CLOSE = "close",
    APPROVE = "approve",
    REJECT = "reject",
    UPDATE = "update",
    DELETE = "delete",
    EXPORT = "export"
}
export interface PermissionConfig {
    visibleFields: string[];
    allowedActions: AuditAction[];
}
