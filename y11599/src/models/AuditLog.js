const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  logNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '日志编号'
  },
  entityType: {
    type: DataTypes.ENUM('CHANGE_ORDER', 'REVIEW_OPINION', 'REFERENCE_RECORD', 'SNAPSHOT', 'ASYNC_TASK', 'USER', 'ROLE', 'CONFIG'),
    allowNull: false,
    comment: '实体类型'
  },
  entityId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '实体ID'
  },
  entityNo: {
    type: DataTypes.STRING,
    comment: '实体编号'
  },
  action: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'CONFIRM', 'AUDIT', 'EXPORT', 'IMPORT'),
    allowNull: false,
    comment: '操作类型'
  },
  operatorId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '操作人ID'
  },
  operatorName: {
    type: DataTypes.STRING,
    comment: '操作人姓名'
  },
  operatorRole: {
    type: DataTypes.STRING,
    comment: '操作人角色'
  },
  beforeData: {
    type: DataTypes.TEXT,
    comment: '操作前数据（JSON）'
  },
  afterData: {
    type: DataTypes.TEXT,
    comment: '操作后数据（JSON）'
  },
  changedFields: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '变更字段列表'
  },
  changeReason: {
    type: DataTypes.TEXT,
    comment: '变更原因'
  },
  ipAddress: {
    type: DataTypes.STRING,
    comment: 'IP地址'
  },
  userAgent: {
    type: DataTypes.STRING,
    comment: '用户代理'
  },
  requestId: {
    type: DataTypes.STRING,
    comment: '请求ID'
  },
  idempotentKey: {
    type: DataTypes.STRING,
    comment: '幂等键'
  },
  batchId: {
    type: DataTypes.STRING,
    comment: '批次ID'
  },
  isSensitive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否敏感操作'
  },
  riskLevel: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    defaultValue: 'LOW',
    comment: '风险等级'
  },
  remark: {
    type: DataTypes.TEXT,
    comment: '备注'
  },
  extra: {
    type: DataTypes.JSON,
    comment: '扩展字段'
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  indexes: [
    { fields: ['logNo'] },
    { fields: ['entityType', 'entityId'] },
    { fields: ['action'] },
    { fields: ['operatorId'] },
    { fields: ['operatorRole'] },
    { fields: ['idempotentKey'] },
    { fields: ['batchId'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = AuditLog;
