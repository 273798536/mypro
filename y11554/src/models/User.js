const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = {
  DATA_ENTRY: 'data_entry',
  REVIEWER: 'reviewer',
  SUPERVISOR: 'supervisor',
  READ_ONLY: 'read_only'
};

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    required: true
  },
  city: {
    type: String,
    required: true
  },
  department: String,
  phone: String,
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const ROLE_PERMISSIONS = {
  [ROLES.DATA_ENTRY]: {
    canView: ['basic', 'inventory', 'refund', 'photos'],
    canEdit: ['draft', 'submit'],
    fields: {
      visible: ['ledgerNo', 'cabinetId', 'inventory', 'photos', 'status', 'createdAt'],
      editable: ['inventory', 'photos', 'remark']
    }
  },
  [ROLES.REVIEWER]: {
    canView: ['basic', 'inventory', 'refund', 'photos', 'audit'],
    canEdit: ['review', 'reject', 'confirm'],
    fields: {
      visible: ['ledgerNo', 'cabinetId', 'inventory', 'photos', 'refund', 'status', 'auditLog', 'createdAt', 'submittedBy'],
      editable: ['reviewRemark', 'status']
    }
  },
  [ROLES.SUPERVISOR]: {
    canView: ['*'],
    canEdit: ['*'],
    fields: {
      visible: ['*'],
      editable: ['*']
    }
  },
  [ROLES.READ_ONLY]: {
    canView: ['basic', 'summary'],
    canEdit: [],
    fields: {
      visible: ['ledgerNo', 'cabinetId', 'status', 'summary', 'city', 'createdAt'],
      editable: []
    }
  }
};

module.exports = {
  User: mongoose.model('User', userSchema),
  ROLES,
  ROLE_PERMISSIONS
};
