const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AsyncTask = sequelize.define('AsyncTask', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  taskId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '任务ID（Bull的Job ID）'
  },
  taskType: {
    type: DataTypes.ENUM('IMPORT_CHANGE_ORDERS', 'IMPORT_REVIEWS', 'IMPORT_REFERENCES', 'IMPORT_SNAPSHOTS', 'EXPORT_DATA', 'DESENSITIZE_DATA', 'BATCH_PROCESS'),
    allowNull: false,
    comment: '任务类型'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PROCESSING', 'WAITING_RETRY', 'WAITING_MANUAL', 'FAILED_PERMANENT', 'COMPLETED'),
    defaultValue: 'PENDING',
    comment: '任务状态：待处理/处理中/等待重试/等待人工/永久失败/已完成'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '优先级'
  },
  payload: {
    type: DataTypes.TEXT,
    comment: '任务载荷（JSON）'
  },
  batchId: {
    type: DataTypes.STRING,
    comment: '批次ID'
  },
  totalCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '总记录数'
  },
  successCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '成功记录数'
  },
  failedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '失败记录数'
  },
  skippedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '跳过记录数'
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '已重试次数'
  },
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    comment: '最大重试次数'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    comment: '错误信息'
  },
  errorStack: {
    type: DataTypes.TEXT,
    comment: '错误堆栈'
  },
  failedItems: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '失败项详情'
  },
  result: {
    type: DataTypes.TEXT,
    comment: '任务结果（JSON）'
  },
  createdBy: {
    type: DataTypes.STRING,
    comment: '创建人ID'
  },
  createdByName: {
    type: DataTypes.STRING,
    comment: '创建人姓名'
  },
  startedAt: {
    type: DataTypes.DATE,
    comment: '开始时间'
  },
  completedAt: {
    type: DataTypes.DATE,
    comment: '完成时间'
  },
  lastRetryAt: {
    type: DataTypes.DATE,
    comment: '最后重试时间'
  },
  nextRetryAt: {
    type: DataTypes.DATE,
    comment: '下次重试时间'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '进度百分比'
  },
  extra: {
    type: DataTypes.JSON,
    comment: '扩展字段'
  }
}, {
  tableName: 'async_tasks',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['taskId'] },
    { fields: ['taskType'] },
    { fields: ['status'] },
    { fields: ['batchId'] },
    { fields: ['createdBy'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = AsyncTask;
