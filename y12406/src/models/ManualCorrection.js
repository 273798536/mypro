const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ManualCorrection = sequelize.define('ManualCorrection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  correction_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '修正单号',
  },
  correction_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '修正类型: usage-用量修正, bill-账单修正, price-单价修正, rule-规则修正',
  },
  target_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '修正对象类型: seat_usage-座席用量, bill-账单',
  },
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '修正对象ID',
  },
  before_value: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '修正前数据(JSON格式，保存所有变更字段的原始值)',
  },
  after_value: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '修正后数据(JSON格式，保存所有变更字段的新值)',
  },
  change_summary: {
    type: DataTypes.JSON,
    comment: '变更摘要: {"field": {"before": "", "after": "", "diff": ""}}',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '修正原因',
  },
  exception_type: {
    type: DataTypes.STRING(50),
    comment: '异常类型: duplicate_seat-座席重复, cross_month_downgrade-跨月降配, rule_mismatch-规则不符, data_error-数据错误, other-其他',
  },
  affected_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: '影响金额',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    comment: '状态: pending-待复核, approved-已批准, rejected-已拒绝, executed-已执行',
  },
  approved_by: {
    type: DataTypes.STRING(50),
    comment: '审批人',
  },
  approved_at: {
    type: DataTypes.DATE,
    comment: '审批时间',
  },
  executed_at: {
    type: DataTypes.DATE,
    comment: '执行时间',
  },
  created_by: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '申请人',
  },
  remarks: {
    type: DataTypes.TEXT,
    comment: '备注',
  },
}, {
  tableName: 'manual_corrections',
  comment: '人工修正记录表',
});

module.exports = ManualCorrection;
