const mongoose = require('mongoose');

const OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  SUBMIT: 'submit',
  REVIEW: 'review',
  REJECT: 'reject',
  CONFIRM: 'confirm',
  SECOND_CONFIRM: 'second_confirm',
  FINALIZE: 'finalize',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import',
  LOGIN: 'login',
  LOGOUT: 'logout'
};

const operationLogSchema = new mongoose.Schema({
  operationType: {
    type: String,
    enum: Object.values(OPERATION_TYPES),
    required: true,
    index: true
  },
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  operatorName: String,
  operatorRole: String,
  targetType: {
    type: String,
    enum: ['ledger', 'inventory', 'refund', 'photo', 'user'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  targetNo: String,
  beforeData: Object,
  afterData: Object,
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  changeReason: String,
  ip: String,
  userAgent: String,
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String
}, {
  timestamps: true
});

operationLogSchema.index({ operator: 1, createdAt: -1 });
operationLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
operationLogSchema.index({ operationType: 1, createdAt: -1 });

module.exports = {
  OperationLog: mongoose.model('OperationLog', operationLogSchema),
  OPERATION_TYPES
};
