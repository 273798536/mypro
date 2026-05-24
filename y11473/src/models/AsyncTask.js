const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AsyncTask = sequelize.define('AsyncTask', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  task_type: {
    type: DataTypes.ENUM('import_parse', 'duplicate_check', 'data_match', 'reconciliation', 'export', 'replay_exception'),
    allowNull: false,
    comment: '任务类型'
  },
  task_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '任务名称'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'success', 'retry', 'manual', 'failed'),
    defaultValue: 'pending',
    comment: '任务状态: pending-待处理, processing-处理中, success-成功, retry-待重试, manual-待人工, failed-永久失败'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: '优先级 1-10'
  },
  input_params: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '输入参数JSON'
  },
  result_data: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '结果数据JSON'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  error_stack: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误堆栈'
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '重试次数'
  },
  max_retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    comment: '最大重试次数'
  },
  last_retry_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '上次重试时间'
  },
  next_retry_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '下次重试时间'
  },
  process_started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '开始处理时间'
  },
  process_ended_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '处理结束时间'
  },
  process_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '处理耗时(毫秒)'
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '创建人'
  },
  processed_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '处理人(人工处理时)'
  },
  parent_task_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '父任务ID'
  }
}, {
  tableName: 'async_tasks',
  indexes: [
    { fields: ['status'] },
    { fields: ['task_type'] },
    { fields: ['next_retry_at'] },
    { fields: ['priority', 'created_at'] }
  ]
});

module.exports = AsyncTask;
