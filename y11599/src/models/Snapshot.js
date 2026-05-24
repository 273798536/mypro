const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Snapshot = sequelize.define('Snapshot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  snapshotNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '快照编号'
  },
  snapshotType: {
    type: DataTypes.ENUM('SMS', 'IMAGE', 'SCREENSHOT', 'CHAT_HISTORY'),
    allowNull: false,
    comment: '快照类型：短信/图片/截图/聊天记录'
  },
  relatedType: {
    type: DataTypes.ENUM('CHANGE_ORDER', 'REFERENCE', 'ERROR_CLAIM', 'AUDIT'),
    allowNull: false,
    comment: '关联类型'
  },
  relatedId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '关联ID'
  },
  relatedNo: {
    type: DataTypes.STRING,
    comment: '关联编号'
  },
  fileUrl: {
    type: DataTypes.STRING,
    comment: '文件URL'
  },
  fileName: {
    type: DataTypes.STRING,
    comment: '文件名'
  },
  fileHash: {
    type: DataTypes.STRING,
    comment: '文件哈希（用于去重）'
  },
  fileSize: {
    type: DataTypes.BIGINT,
    comment: '文件大小（字节）'
  },
  mimeType: {
    type: DataTypes.STRING,
    comment: 'MIME类型'
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
    comment: '缩略图URL'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '描述'
  },
  ocrContent: {
    type: DataTypes.TEXT,
    comment: 'OCR识别内容'
  },
  uploaderId: {
    type: DataTypes.STRING,
    comment: '上传人ID'
  },
  uploaderName: {
    type: DataTypes.STRING,
    comment: '上传人姓名'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '上传时间'
  },
  isSensitive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否含敏感内容'
  },
  sensitiveFields: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '敏感字段标记'
  },
  desensitizedUrl: {
    type: DataTypes.STRING,
    comment: '脱敏后文件URL'
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
  tableName: 'snapshots',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['snapshotNo'] },
    { fields: ['snapshotType'] },
    { fields: ['relatedType', 'relatedId'] },
    { fields: ['fileHash'] },
    { fields: ['uploaderId'] },
    { fields: ['isSensitive'] },
    { fields: ['batchId'] }
  ]
});

module.exports = Snapshot;
