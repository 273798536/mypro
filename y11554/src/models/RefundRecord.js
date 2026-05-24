const mongoose = require('mongoose');

const refundRecordSchema = new mongoose.Schema({
  refundNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ledgerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ledger',
    index: true
  },
  cabinetId: {
    type: String,
    required: true,
    index: true
  },
  compartmentId: String,
  orderNo: String,
  productId: String,
  productName: String,
  refundAmount: {
    type: Number,
    required: true
  },
  refundQuantity: {
    type: Number,
    default: 1
  },
  refundReason: {
    type: String,
    enum: ['out_of_stock', 'damaged', 'wrong_product', 'payment_error', 'duplicate_deduction', 'other'],
    required: true
  },
  refundReasonDetail: String,
  refundTime: {
    type: Date,
    required: true
  },
  customerPhone: String,
  customerName: String,
  isDuplicateDeduction: {
    type: Boolean,
    default: false
  },
  relatedOrderNo: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  source: {
    type: String,
    enum: ['manual', 'system', 'import'],
    default: 'manual'
  },
  importBatchNo: String
}, {
  timestamps: true
});

refundRecordSchema.index({ cabinetId: 1, refundTime: -1 });
refundRecordSchema.index({ orderNo: 1 });
refundRecordSchema.index({ ledgerId: 1, status: 1 });

module.exports = mongoose.model('RefundRecord', refundRecordSchema);
