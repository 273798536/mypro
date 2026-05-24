const mongoose = require('mongoose');

const restockPhotoSchema = new mongoose.Schema({
  photoId: {
    type: String,
    required: true,
    unique: true
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
  photoType: {
    type: String,
    enum: ['before_restock', 'after_restock', 'compartment_closeup', 'inventory_list'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: String,
  fileSize: Number,
  fileHash: String,
  uploadTime: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  compartmentId: String,
  remark: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  exifData: {
    cameraModel: String,
    captureTime: Date,
    gps: {
      lat: Number,
      lng: Number
    }
  }
}, {
  timestamps: true
});

restockPhotoSchema.index({ cabinetId: 1, uploadTime: -1 });
restockPhotoSchema.index({ ledgerId: 1, photoType: 1 });

module.exports = mongoose.model('RestockPhoto', restockPhotoSchema);
