const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OperationTrace = sequelize.define('OperationTrace', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  trace_type: {
    type: DataTypes.ENUM('generate_data', 'service_start', 'service_stop', 'http_request', 'http_response', 'reconciliation', 'export', 'replay_exception', 'manual_correction'),
    allowNull: false,
    comment: '轨迹类型'
  },
  trace_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '轨迹名称'
  },
  operation: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '操作名称'
  },
  operator: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '操作人'
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '来源（API/脚本/系统）'
  },
  request_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '请求URL'
  },
  request_method: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '请求方法'
  },
  request_params: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '请求参数JSON'
  },
  request_body: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '请求体JSON'
  },
  response_status: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '响应状态码'
  },
  response_body: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '响应体JSON'
  },
  affected_record_type: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '影响的记录类型'
  },
  affected_record_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '影响的记录ID'
  },
  affected_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '影响的记录数量'
  },
  status: {
    type: DataTypes.ENUM('success', 'failed', 'partial'),
    defaultValue: 'success',
    comment: '操作状态'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '耗时(毫秒)'
  },
  extra_data: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '额外数据JSON'
  },
  async_task_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '关联的异步任务ID'
  }
}, {
  tableName: 'operation_traces',
  indexes: [
    { fields: ['trace_type'] },
    { fields: ['operation'] },
    { fields: ['operator'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
    { fields: ['affected_record_type', 'affected_record_id'] }
  ]
});

module.exports = OperationTrace;
