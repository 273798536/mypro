export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000'),
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  ROLES: {
    DATA_ENTRY: 'data_entry',
    REVIEWER: 'reviewer',
    SUPERVISOR: 'supervisor',
    READ_ONLY: 'read_only'
  } as const,
  
  RECORD_TYPES: {
    RECHARGE: 'recharge',
    REFUND: 'refund',
    HANDOVER: 'handover',
    SCAN: 'scan'
  } as const,
  
  DIRTY_TYPES: {
    MISSING_FIELDS: 'missing_fields',
    CROSS_DATE: 'cross_date',
    NAME_CHANGED: 'name_changed',
    AMOUNT_CONFLICT: 'amount_conflict',
    QUANTITY_CONFLICT: 'quantity_conflict'
  } as const,
  
  BATCH_STATUS: {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    REVIEWING: 'reviewing',
    REVIEWED: 'reviewed',
    FROZEN: 'frozen',
    SETTLED: 'settled',
    REVOKED: 'revoked',
    ARCHIVED: 'archived'
  } as const,
  
  RECORD_STATUS: {
    PENDING: 'pending',
    VALID: 'valid',
    DIRTY: 'dirty',
    REVIEWED: 'reviewed',
    FROZEN: 'frozen',
    RESOLVED: 'resolved'
  } as const
}

export type RoleType = typeof CONFIG.ROLES[keyof typeof CONFIG.ROLES]
export type RecordType = typeof CONFIG.RECORD_TYPES[keyof typeof CONFIG.RECORD_TYPES]
export type DirtyType = typeof CONFIG.DIRTY_TYPES[keyof typeof CONFIG.DIRTY_TYPES]
export type BatchStatus = typeof CONFIG.BATCH_STATUS[keyof typeof CONFIG.BATCH_STATUS]
export type RecordStatus = typeof CONFIG.RECORD_STATUS[keyof typeof CONFIG.RECORD_STATUS]
