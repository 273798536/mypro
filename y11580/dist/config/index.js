"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
exports.CONFIG = {
    PORT: parseInt(process.env.PORT || '3000'),
    DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
    NODE_ENV: process.env.NODE_ENV || 'development',
    ROLES: {
        DATA_ENTRY: 'data_entry',
        REVIEWER: 'reviewer',
        SUPERVISOR: 'supervisor',
        READ_ONLY: 'read_only'
    },
    RECORD_TYPES: {
        RECHARGE: 'recharge',
        REFUND: 'refund',
        HANDOVER: 'handover',
        SCAN: 'scan'
    },
    DIRTY_TYPES: {
        MISSING_FIELDS: 'missing_fields',
        CROSS_DATE: 'cross_date',
        NAME_CHANGED: 'name_changed',
        AMOUNT_CONFLICT: 'amount_conflict',
        QUANTITY_CONFLICT: 'quantity_conflict'
    },
    BATCH_STATUS: {
        DRAFT: 'draft',
        SUBMITTED: 'submitted',
        REVIEWING: 'reviewing',
        REVIEWED: 'reviewed',
        FROZEN: 'frozen',
        SETTLED: 'settled',
        REVOKED: 'revoked',
        ARCHIVED: 'archived'
    },
    RECORD_STATUS: {
        PENDING: 'pending',
        VALID: 'valid',
        DIRTY: 'dirty',
        REVIEWED: 'reviewed',
        FROZEN: 'frozen',
        RESOLVED: 'resolved'
    }
};
//# sourceMappingURL=index.js.map