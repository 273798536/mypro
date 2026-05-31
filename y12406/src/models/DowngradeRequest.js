const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DowngradeRequest = sequelize.define('DowngradeRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  request_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '申请单号',
  },
  contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '合同ID',
  },
  original_seat_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '降配前座席数',
  },
  new_seat_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '降配后座席数',
  },
  original_caliber: {
    type: DataTypes.JSON,
    comment: '原始口径配置',
  },
  new_caliber: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '新口径配置',
  },
  caliber_change_description: {
    type: DataTypes.TEXT,
    comment: '口径变更说明',
  },
  effective_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '降配生效日期',
  },
  is_cross_month: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否跨月降配',
  },
  cross_month_handling_rule: {
    type: DataTypes.STRING(50),
    comment: '跨月处理规则',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    comment: '状态: pending-待审批, approved-已批准, rejected-已拒绝, executed-已执行, cancelled-已取消',
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
  affected_usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '影响的用量记录数',
  },
  affected_billing_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: '影响的计费金额',
  },
  created_by: {
    type: DataTypes.STRING(50),
    comment: '申请人',
  },
  remarks: {
    type: DataTypes.TEXT,
    comment: '备注',
  },
}, {
  tableName: 'downgrade_requests',
  comment: '降配申请表',
});

module.exports = DowngradeRequest;
