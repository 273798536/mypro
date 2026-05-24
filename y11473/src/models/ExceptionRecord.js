const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExceptionRecord = sequelize.define('ExceptionRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  exception_type: {
    type: DataTypes.ENUM('data_mismatch', 'quantity_mismatch', 'price_mismatch', 'missing_document', 'duplicate_data', 'parse_error', 'system_error'),
    allowNull: false,
    comment: '异常类型'
  },
  exception_code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '异常编码'
  },
  exception_message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '异常信息'
  },
  record_type: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '关联记录类型'
  },
  record_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '关联记录ID'
  },
  batch_no: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '批次号'
  },
  supplier_code: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '供应商编码'
  },
  exception_data: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '异常数据JSON'
  },
  expected_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '期望值JSON'
  },
  actual_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '实际值JSON'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'resolved', 'ignored'),
    defaultValue: 'pending',
    comment: '状态'
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '解决方案'
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '解决时间'
  },
  resolved_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '解决人'
  },
  replay_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '回放次数'
  },
  last_replay_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '上次回放时间'
  },
  import_record_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '关联的导入记录ID'
  },
  async_task_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '关联的异步任务ID'
  }
}, {
  tableName: 'exception_records',
  indexes: [
    { fields: ['exception_type'] },
    { fields: ['exception_code'] },
    { fields: ['status'] },
    { fields: ['batch_no'] },
    { fields: ['supplier_code'] },
    { fields: ['record_type', 'record_id'] }
  ]
});

module.exports = ExceptionRecord;
