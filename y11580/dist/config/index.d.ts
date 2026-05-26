export declare const CONFIG: {
    PORT: number;
    DATABASE_URL: string;
    NODE_ENV: string;
    ROLES: {
        readonly DATA_ENTRY: "data_entry";
        readonly REVIEWER: "reviewer";
        readonly SUPERVISOR: "supervisor";
        readonly READ_ONLY: "read_only";
    };
    RECORD_TYPES: {
        readonly RECHARGE: "recharge";
        readonly REFUND: "refund";
        readonly HANDOVER: "handover";
        readonly SCAN: "scan";
    };
    DIRTY_TYPES: {
        readonly MISSING_FIELDS: "missing_fields";
        readonly CROSS_DATE: "cross_date";
        readonly NAME_CHANGED: "name_changed";
        readonly AMOUNT_CONFLICT: "amount_conflict";
        readonly QUANTITY_CONFLICT: "quantity_conflict";
    };
    BATCH_STATUS: {
        readonly DRAFT: "draft";
        readonly SUBMITTED: "submitted";
        readonly REVIEWING: "reviewing";
        readonly REVIEWED: "reviewed";
        readonly FROZEN: "frozen";
        readonly SETTLED: "settled";
        readonly REVOKED: "revoked";
        readonly ARCHIVED: "archived";
    };
    RECORD_STATUS: {
        readonly PENDING: "pending";
        readonly VALID: "valid";
        readonly DIRTY: "dirty";
        readonly REVIEWED: "reviewed";
        readonly FROZEN: "frozen";
        readonly RESOLVED: "resolved";
    };
};
export type RoleType = typeof CONFIG.ROLES[keyof typeof CONFIG.ROLES];
export type RecordType = typeof CONFIG.RECORD_TYPES[keyof typeof CONFIG.RECORD_TYPES];
export type DirtyType = typeof CONFIG.DIRTY_TYPES[keyof typeof CONFIG.DIRTY_TYPES];
export type BatchStatus = typeof CONFIG.BATCH_STATUS[keyof typeof CONFIG.BATCH_STATUS];
export type RecordStatus = typeof CONFIG.RECORD_STATUS[keyof typeof CONFIG.RECORD_STATUS];
