const mongoose = require('mongoose');
const dayjs = require('dayjs');

const LEDGER_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWING: 'reviewing',
  REJECTED: 'rejected',
  CONFIRMED: 'confirmed',
  SECOND_CONFIRM: 'second_confirm',
  FINALIZED: 'finalized',
  ARCHIVED: 'archived'
};

const STOCK_DIFF_TYPE = {
  NORMAL: 'normal',
  MISSING: 'missing',
  OVERSTOCK: 'overstock',
  HOT_SALE_FULL: 'hot_sale_full',
  DUPLICATE_DEDUCTION: 'duplicate_deduction'
};

const inventoryDiffSchema = new mongoose.Schema({
  compartmentId: String,
  productId: String,
  productName: String,
  expectedQuantity: Number,
  actualQuantity: Number,
  diffQuantity: Number,
  diffType: {
    type: String,
    enum: Object.values(STOCK_DIFF_TYPE)
  },
  isHot: Boolean,
  remark: String
});

const ledgerSchema = new mongoose.Schema({
  ledgerNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  cabinetId: {
    type: String,
    required: true,
    index: true
  },
  cabinetName: String,
  city: {
    type: String,
    required: true,
    index: true
  },
  address: String,
  restockDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(LEDGER_STATUS),
    default: LEDGER_STATUS.DRAFT,
    index: true
  },
  inventoryBefore: [{
    compartmentId: String,
    productId: String,
    productName: String,
    quantity: Number,
    isHot: Boolean
  }],
  inventoryAfter: [{
    compartmentId: String,
    productId: String,
    productName: String,
    quantity: Number,
    isHot: Boolean
  }],
  restockQuantity: {
    type: Number,
    default: 0
  },
  inventoryDiffs: [inventoryDiffSchema],
  totalDiffQuantity: {
    type: Number,
    default: 0
  },
  hasDuplicateDeduction: {
    type: Boolean,
    default: false
  },
  duplicateDeductionCount: {
    type: Number,
    default: 0
  },
  hasHotSaleFull: {
    type: Boolean,
    default: false
  },
  photoIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestockPhoto'
  }],
  refundRecordIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RefundRecord'
  }],
  totalRefundAmount: {
    type: Number,
    default: 0
  },
  totalRefundCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewRemark: String,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectReason: String,
  secondConfirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  secondConfirmedAt: Date,
  secondConfirmRemark: String,
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  finalizedAt: Date,
  remark: String,
  isDirty: {
    type: Boolean,
    default: false
  },
  dirtyRecordIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DirtyRecord'
  }],
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    snapshot: Object,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: Date,
    changeReason: String
  }]
}, {
  timestamps: true
});

ledgerSchema.index({ city: 1, restockDate: -1 });
ledgerSchema.index({ status: 1, createdAt: -1 });
ledgerSchema.index({ createdBy: 1, createdAt: -1 });

ledgerSchema.pre('save', function(next) {
  if (!this.ledgerNo) {
    const dateStr = dayjs().format('YYYYMMDD');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.ledgerNo = `LDG${dateStr}${random}`;
  }
  next();
});

module.exports = {
  Ledger: mongoose.model('Ledger', ledgerSchema),
  LEDGER_STATUS,
  STOCK_DIFF_TYPE
};
