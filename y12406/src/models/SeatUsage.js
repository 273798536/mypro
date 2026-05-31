const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SeatUsage = sequelize.define('SeatUsage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  usage_batch_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '用量批次号',
  },
  contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '合同ID',
  },
  billing_cycle: {
    type: DataTypes.STRING(7),
    allowNull: false,
    comment: '计费周期 YYYY-MM',
  },
  usage_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '用量统计日期',
  },
  employee_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '员工工号',
  },
  employee_name: {
    type: DataTypes.STRING(50),
    comment: '员工姓名',
  },
  department: {
    type: DataTypes.STRING(100),
    comment: '所属部门',
  },
  original_active_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '原始报活座席数',
  },
  current_active_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '当前确认座席数',
  },
  original_contracted_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '原始合同座席数',
  },
  current_contracted_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '当前合同座席数',
  },
  original_excess_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '原始超额座席数',
  },
  current_excess_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '当前超额座席数',
  },
  original_unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '原始单价',
  },
  current_unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '当前单价',
  },
  original_billing_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '原始计费金额',
  },
  current_billing_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '当前计费金额',
  },
  billing_rule_id: {
    type: DataTypes.INTEGER,
    comment: '使用的计费规则ID',
  },
  billing_rule_version: {
    type: DataTypes.STRING(20),
    comment: '使用的计费规则版本',
  },
  is_duplicate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否座席重复',
  },
  duplicate_of_id: {
    type: DataTypes.INTEGER,
    comment: '重复指向的主记录ID',
  },
  duplicate_reason: {
    type: DataTypes.STRING(200),
    comment: '座席重复原因',
  },
  is_downgrade_cross_month: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否涉及降配跨月',
  },
  downgrade_request_id: {
    type: DataTypes.INTEGER,
    comment: '关联降配申请ID',
  },
  is_invoice_red_flush: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否涉及发票红冲',
  },
  related_invoice_id: {
    type: DataTypes.STRING(50),
    comment: '关联发票号',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'draft',
    comment: '状态: draft-草稿, pending_review-待复核, reviewed-已复核, billing-计费中, billed-已出账, corrected-已人工修正, cancelled-已取消',
  },
  review_status: {
    type: DataTypes.STRING(20),
    comment: '复核状态: pending-待复核, passed-复核通过, rejected-复核驳回',
  },
  reviewed_by: {
    type: DataTypes.STRING(50),
    comment: '复核人',
  },
  reviewed_at: {
    type: DataTypes.DATE,
    comment: '复核时间',
  },
  review_comments: {
    type: DataTypes.TEXT,
    comment: '复核意见',
  },
  has_manual_correction: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否有人工修正',
  },
  last_correction_id: {
    type: DataTypes.INTEGER,
    comment: '最后一次人工修正ID',
  },
  created_by: {
    type: DataTypes.STRING(50),
    comment: '创建人',
  },
  remarks: {
    type: DataTypes.TEXT,
    comment: '备注',
  },
}, {
  tableName: 'seat_usages',
  comment: '座席用量表',
  indexes: [
    {
      unique: true,
      fields: ['contract_id', 'billing_cycle', 'employee_id', 'usage_date'],
      name: 'idx_contract_cycle_emp_date',
    },
    {
      fields: ['contract_id', 'billing_cycle'],
      name: 'idx_contract_cycle',
    },
    {
      fields: ['is_duplicate'],
      name: 'idx_is_duplicate',
    },
    {
      fields: ['status'],
      name: 'idx_status',
    },
  ],
});

module.exports = SeatUsage;
