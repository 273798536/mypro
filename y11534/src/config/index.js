module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'bank-scheduling-ledger-secret-key-2024',
  JWT_EXPIRES_IN: '24h',
  DATABASE_PATH: './data/bank_ledger.db',
  
  ROLES: {
    DATA_ENTRY: 'data_entry',
    REVIEWER: 'reviewer',
    SUPERVISOR: 'supervisor',
    VIEW_ONLY: 'view_only'
  },
  
  RECORD_STATUS: {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    REJECTED: 'rejected',
    SECOND_CONFIRM: 'second_confirm',
    APPROVED: 'approved',
    ARCHIVED: 'archived'
  },
  
  DIRTY_TYPES: {
    MISSING_FIELDS: 'missing_fields',
    CROSS_DATE: 'cross_date',
    NAME_CHANGED: 'name_changed',
    AMOUNT_CONFLICT: 'amount_conflict',
    QUANTITY_CONFLICT: 'quantity_conflict'
  },
  
  DUPLICATE_STRATEGY: {
    OVERWRITE: 'overwrite',
    IGNORE: 'ignore'
  },
  
  SENSITIVE_FIELDS: [
    'id_card', 'phone', 'salary', 'bonus', 'account_number'
  ]
};
