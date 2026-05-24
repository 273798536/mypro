const mongoose = require('mongoose');

const compartmentSchema = new mongoose.Schema({
  compartmentId: {
    type: String,
    required: true
  },
  productId: String,
  productName: String,
  quantity: {
    type: Number,
    default: 0
  },
  maxCapacity: {
    type: Number,
    default: 10
  },
  isHot: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['normal', 'full', 'empty', 'fault'],
    default: 'normal'
  }
});

const cabinetInventorySchema = new mongoose.Schema({
  cabinetId: {
    type: String,
    required: true,
    index: true
  },
  cabinetName: String,
  city: String,
  address: String,
  compartments: [compartmentSchema],
  totalQuantity: {
    type: Number,
    default: 0
  },
  lastSyncTime: Date,
  syncSource: String,
  networkStatus: {
    type: String,
    enum: ['online', 'offline'],
    default: 'online'
  },
  hasDuplicateDeduction: {
    type: Boolean,
    default: false
  },
  duplicateDeductionNote: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

cabinetInventorySchema.index({ cabinetId: 1, createdAt: -1 });

module.exports = mongoose.model('CabinetInventory', cabinetInventorySchema);
