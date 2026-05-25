const WORKFLOW_STATES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REJECTED: 'rejected',
  CONFIRMED: 'confirmed',
  FROZEN: 'frozen'
};

const RECORD_TYPES = {
  MATERIAL_LIST: 'material_list',
  LOGISTICS_RECEIPT: 'logistics_receipt',
  BORROW_RECORD: 'borrow_record',
  SHIFT_RECORD: 'shift_record',
  PRICE_ADJUSTMENT: 'price_adjustment'
};

const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  AUDITOR: 'auditor',
  VIEWER: 'viewer'
};

const BORROW_STATUS = {
  BORROWED: 'borrowed',
  RETURNED: 'returned',
  LOST: 'lost',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved'
};

const SENSITIVE_FIELDS = [
  'borrower_phone',
  'sender_phone', 
  'receiver_phone',
  'handler_contact',
  'estimated_value',
  'original_price',
  'adjusted_price',
  'total_value'
];

module.exports = {
  WORKFLOW_STATES,
  RECORD_TYPES,
  ROLES,
  BORROW_STATUS,
  SENSITIVE_FIELDS
};
