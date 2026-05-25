export declare enum LedgerStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    REJECTED = "rejected",
    CONFIRMED = "confirmed",
    AUDITED = "audited"
}
export declare enum PartType {
    NORMAL = "normal",
    RETURNED = "returned",
    SCRAPPED = "scrapped"
}
export declare enum UserRole {
    ENGINEER = "engineer",
    SERVICE_MANAGER = "service_manager",
    AUDITOR = "auditor",
    ADMIN = "admin"
}
export declare enum DataQuality {
    VALID = "valid",
    INVALID = "invalid",
    SUSPICIOUS = "suspicious"
}
export declare enum ChangeAction {
    CREATE = "create",
    UPDATE = "update",
    SUBMIT = "submit",
    REJECT = "reject",
    CONFIRM = "confirm",
    AUDIT = "audit"
}
export declare enum ReceiptSource {
    INTERNAL = "internal",
    EXTERNAL = "external"
}
export declare enum SensitiveFieldLevel {
    NONE = "none",
    MASK = "mask",
    HIDE = "hide"
}
