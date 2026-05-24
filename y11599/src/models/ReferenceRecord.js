const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReferenceRecord = sequelize.define('ReferenceRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  recordNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '引用记录编号'
  },
  knowledgeId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '知识库ID'
  },
  knowledgeTitle: {
    type: DataTypes.STRING,
    comment: '知识库标题'
  },
  knowledgeVersion: {
    type: DataTypes.INTEGER,
    comment: '知识库版本'
  },
  agentId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '坐席ID'
  },
  agentName: {
    type: DataTypes.STRING,
    comment: '坐席姓名'
  },
  agentRole: {
    type: DataTypes.STRING,
    comment: '坐席角色'
  },
  customerId: {
    type: DataTypes.STRING,
    comment: '客户ID'
  },
  customerPhone: {
    type: DataTypes.STRING,
    comment: '客户电话（敏感字段）'
  },
  sessionId: {
    type: DataTypes.STRING,
    comment: '会话ID'
  },
  referenceTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '引用时间'
  },
  referenceType: {
    type: DataTypes.ENUM('COPY', 'VIEW', 'SEND', 'APPLY'),
    defaultValue: 'VIEW',
    comment: '引用类型：复制/查看/发送/应用'
  },
  isOfflineContent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为已下线内容'
  },
  relatedOrderNo: {
    type: DataTypes.STRING,
    comment: '关联工单/订单号'
  },
  errorClaimAmount: {
    type: DataTypes.DECIMAL(12, 2),
    comment: '错赔金额'
  },
  isErrorClaim: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否涉及错赔'
  },
  errorClaimReason: {
    type: DataTypes.TEXT,
    comment: '错赔原因说明'
  },
  sensitiveFields: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '敏感字段列表'
  },
  contentSnapshot: {
    type: DataTypes.TEXT,
    comment: '引用时的内容快照'
  },
  batchId: {
    type: DataTypes.STRING,
    comment: '批次ID'
  },
  batchStrategy: {
    type: DataTypes.ENUM('IGNORE', 'OVERWRITE', 'APPEND'),
    defaultValue: 'IGNORE',
    comment: '批量处理策略'
  },
  source: {
    type: DataTypes.STRING,
    comment: '数据来源'
  },
  extra: {
    type: DataTypes.JSON,
    comment: '扩展字段'
  }
}, {
  tableName: 'reference_records',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['recordNo'] },
    { fields: ['knowledgeId'] },
    { fields: ['agentId'] },
    { fields: ['isOfflineContent'] },
    { fields: ['isErrorClaim'] },
    { fields: ['referenceTime'] },
    { fields: ['batchId'] }
  ]
});

module.exports = ReferenceRecord;
