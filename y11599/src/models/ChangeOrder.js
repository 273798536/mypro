const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChangeOrder = sequelize.define('ChangeOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '变更单编号'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '变更标题'
  },
  type: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'WITHDRAW', 'DELETE'),
    allowNull: false,
    comment: '变更类型'
  },
  knowledgeId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '关联知识库ID'
  },
  knowledgeTitle: {
    type: DataTypes.STRING,
    comment: '知识库标题'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'REJECTED', 'CONFIRMED', 'AUDITED'),
    defaultValue: 'DRAFT',
    comment: '状态：草稿/已提交/已驳回/二次确认/只读审计'
  },
  content: {
    type: DataTypes.TEXT,
    comment: '变更内容'
  },
  changeReason: {
    type: DataTypes.TEXT,
    comment: '变更原因'
  },
  sensitiveFields: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '敏感字段列表'
  },
  applicantId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '申请人ID'
  },
  applicantName: {
    type: DataTypes.STRING,
    comment: '申请人姓名'
  },
  applicantRole: {
    type: DataTypes.STRING,
    comment: '申请人角色'
  },
  approverId: {
    type: DataTypes.STRING,
    comment: '审批人ID'
  },
  approverName: {
    type: DataTypes.STRING,
    comment: '审批人姓名'
  },
  submittedAt: {
    type: DataTypes.DATE,
    comment: '提交时间'
  },
  rejectedAt: {
    type: DataTypes.DATE,
    comment: '驳回时间'
  },
  confirmedAt: {
    type: DataTypes.DATE,
    comment: '二次确认时间'
  },
  auditedAt: {
    type: DataTypes.DATE,
    comment: '审计时间'
  },
  rejectReason: {
    type: DataTypes.TEXT,
    comment: '驳回原因'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '版本号'
  },
  isLatest: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否最新版本'
  },
  batchId: {
    type: DataTypes.STRING,
    comment: '批次ID，用于批量处理追踪'
  },
  batchStrategy: {
    type: DataTypes.ENUM('IGNORE', 'OVERWRITE', 'APPEND'),
    defaultValue: 'IGNORE',
    comment: '批量处理策略'
  },
  extra: {
    type: DataTypes.JSON,
    comment: '扩展字段'
  }
}, {
  tableName: 'change_orders',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['orderNo'] },
    { fields: ['knowledgeId'] },
    { fields: ['status'] },
    { fields: ['applicantId'] },
    { fields: ['batchId'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = ChangeOrder;
