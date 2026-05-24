const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReviewOpinion = sequelize.define('ReviewOpinion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  changeOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '关联变更单ID'
  },
  orderNo: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '变更单编号'
  },
  reviewerId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '审核人ID'
  },
  reviewerName: {
    type: DataTypes.STRING,
    comment: '审核人姓名'
  },
  reviewerRole: {
    type: DataTypes.STRING,
    comment: '审核人角色'
  },
  reviewType: {
    type: DataTypes.ENUM('FIRST_REVIEW', 'SECOND_REVIEW', 'AUDIT'),
    allowNull: false,
    comment: '审核类型：一审/二审/审计'
  },
  result: {
    type: DataTypes.ENUM('PASS', 'REJECT', 'NEED_MODIFY'),
    allowNull: false,
    comment: '审核结果'
  },
  opinion: {
    type: DataTypes.TEXT,
    comment: '审核意见'
  },
  riskLevel: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    defaultValue: 'LOW',
    comment: '风险等级'
  },
  sensitiveComments: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '敏感意见标记'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '审核时间'
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
  extra: {
    type: DataTypes.JSON,
    comment: '扩展字段'
  }
}, {
  tableName: 'review_opinions',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['changeOrderId'] },
    { fields: ['orderNo'] },
    { fields: ['reviewerId'] },
    { fields: ['result'] },
    { fields: ['reviewedAt'] }
  ]
});

module.exports = ReviewOpinion;
