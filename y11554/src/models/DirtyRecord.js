const mongoose = require('mongoose');

const DIRTY_TYPES = {
  MISSING_FIELD: 'missing_field',
  CROSS_DATE: 'cross_date',
  NAME_CHANGED: 'name_changed',
  AMOUNT_CONFLICT: 'amount_conflict',
  QUANTITY_CONFLICT: 'quantity_conflict',
  DUPLICATE_IMPORT: 'duplicate_import',
  NETWORK_ISSUES: 'network_issues',
  HOT_SALE_ANOMALY: 'hot_sale_anomaly',
  OTHER: 'other'
};

const PROCESS_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  RESOLVED: 'resolved',
  IGNORED: 'ignored'
};

const dirtyRecordSchema = new mongoose.Schema({
  dirtyType: {
    type: String,
    enum: Object.values(DIRTY_TYPES),
    required: true,
    index: true
  },
  sourceType: {
    type: String,
    enum: ['inventory', 'refund', 'photo', 'ledger'],
    required: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  sourceNo: String,
  ledgerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ledger',
    index: true
  },
  cabinetId: String,
  originalData: {
    type: Object,
    required: true
  },
  missingFields: [String],
  conflictFields: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  crossDateInfo: {
    originalDate: Date,
    detectedDate: Date
  },
  nameChangeInfo: {
    oldName: String,
    newName: String,
    productId: String
  },
  processStatus: {
    type: String,
    enum: Object.values(PROCESS_STATUS),
    default: PROCESS_STATUS.PENDING,
    index: true
  },
  processOpinion: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  correctionData: Object,
  correctionRemark: String,
  isResummarized: {
    type: Boolean,
    default: false
  },
  resummarizedAt: Date,
  detectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  detectedAt: {
    type: Date,
    default: Date.now
  },
  remark: String
}, {
  timestamps: true
});

dirtyRecordSchema.index({ ledgerId: 1, dirtyType: 1 });
dirtyRecordSchema.index({ processStatus: 1, detectedAt: -1 });
dirtyRecordSchema.index({ cabinetId: 1, detectedAt: -1 });

module.exports = {
  DirtyRecord: mongoose.model('DirtyRecord', dirtyRecordSchema),
  DIRTY_TYPES,
  PROCESS_STATUS
};
