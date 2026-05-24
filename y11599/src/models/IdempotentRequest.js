const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IdempotentRequest = sequelize.define('IdempotentRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  idempotentKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '幂等键'
  },
  requestHash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '请求内容哈希'
  },
  endpoint: {
    type: DataTypes.STRING,
    comment: '请求端点'
  },
  method: {
    type: DataTypes.STRING,
    comment: '请求方法'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'),
    defaultValue: 'PENDING',
    comment: '处理状态'
  },
  responseData: {
    type: DataTypes.TEXT,
    comment: '响应数据（JSON）'
  },
  responseStatus: {
    type: DataTypes.INTEGER,
    comment: '响应状态码'
  },
  entityType: {
    type: DataTypes.STRING,
    comment: '关联实体类型'
  },
  entityId: {
    type: DataTypes.STRING,
    comment: '关联实体ID'
  },
  batchId: {
    type: DataTypes.STRING,
    comment: '批次ID'
  },
  userId: {
    type: DataTypes.STRING,
    comment: '用户ID'
  },
  expiredAt: {
    type: DataTypes.DATE,
    comment: '过期时间'
  },
  firstRequestedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '首次请求时间'
  },
  lastRequestedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '最后请求时间'
  },
  requestCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '请求次数'
  },
  extra: {
    type: DataTypes.JSON,
    comment: '扩展字段'
  }
}, {
  tableName: 'idempotent_requests',
  timestamps: true,
  indexes: [
    { fields: ['idempotentKey'] },
    { fields: ['requestHash'] },
    { fields: ['entityType', 'entityId'] },
    { fields: ['batchId'] },
    { fields: ['userId'] },
    { fields: ['expiredAt'] }
  ]
});

module.exports = IdempotentRequest;
