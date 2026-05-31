const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OperationLog = sequelize.define('OperationLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  trace_id: {
    type: DataTypes.STRING(36),
    comment: '链路追踪ID',
  },
  operation_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '操作类型: create-创建, update-更新, delete-删除, review-复核, approve-审批, correct-修正, export-导出, status_change-状态变更',
  },
  module: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '模块: contract-合同, billing_rule-计费规则, seat_usage-座席用量, downgrade_request-降配申请, bill-账单, manual_correction-人工修正',
  },
  target_id: {
    type: DataTypes.INTEGER,
    comment: '操作对象ID',
  },
  target_no: {
    type: DataTypes.STRING(50),
    comment: '操作对象编号',
  },
  before_snapshot: {
    type: DataTypes.JSON,
    comment: '操作前快照',
  },
  after_snapshot: {
    type: DataTypes.JSON,
    comment: '操作后快照',
  },
  change_details: {
    type: DataTypes.JSON,
    comment: '变更详情',
  },
  old_status: {
    type: DataTypes.STRING(20),
    comment: '变更前状态',
  },
  new_status: {
    type: DataTypes.STRING(20),
    comment: '变更后状态',
  },
  operator: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '操作人',
  },
  operation_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '操作时间',
  },
  client_ip: {
    type: DataTypes.STRING(50),
    comment: '客户端IP',
  },
  user_agent: {
    type: DataTypes.STRING(500),
    comment: '客户端UA',
  },
  success: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '操作是否成功',
  },
  error_message: {
    type: DataTypes.TEXT,
    comment: '错误信息',
  },
  remarks: {
    type: DataTypes.TEXT,
    comment: '备注',
  },
}, {
  tableName: 'operation_logs',
  comment: '操作日志表',
  indexes: [
    {
      fields: ['module', 'target_id'],
      name: 'idx_module_target',
    },
    {
      fields: ['operation_type'],
      name: 'idx_operation_type',
    },
    {
      fields: ['operator'],
      name: 'idx_operator',
    },
    {
      fields: ['operation_time'],
      name: 'idx_operation_time',
    },
  ],
});

module.exports = OperationLog;
