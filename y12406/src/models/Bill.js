const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bill = sequelize.define('Bill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  bill_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '账单编号',
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
  customer_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '客户名称',
  },
  original_contracted_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '原始合同约定座席数',
  },
  current_contracted_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '当前合同约定座席数',
  },
  original_peak_active_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '原始峰值在用座席数',
  },
  current_peak_active_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '当前峰值在用座席数',
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
  original_base_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '原始基础服务费',
  },
  current_base_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '当前基础服务费',
  },
  original_excess_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '原始超额服务费',
  },
  current_excess_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '当前超额服务费',
  },
  original_total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '原始账单总金额',
  },
  current_total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '当前账单总金额',
  },
  has_red_flush: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否包含红冲',
  },
  red_flush_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: '红冲金额',
  },
  related_bill_id: {
    type: DataTypes.INTEGER,
    comment: '关联账单ID(红冲/被红冲)',
  },
  is_red_flush: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为红冲账单',
  },
  billing_rule_id: {
    type: DataTypes.INTEGER,
    comment: '使用的计费规则ID',
  },
  billing_rule_version: {
    type: DataTypes.STRING(20),
    comment: '使用的计费规则版本',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'draft',
    comment: '状态: draft-草稿, confirmed-已确认, invoiced-已开票, paid-已收款, cancelled-已取消',
  },
  has_manual_correction: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否有人工修正',
  },
  export_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '导出次数',
  },
  last_exported_at: {
    type: DataTypes.DATE,
    comment: '最后导出时间',
  },
  last_exported_by: {
    type: DataTypes.STRING(50),
    comment: '最后导出人',
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
  tableName: 'bills',
  comment: '账单表',
});

module.exports = Bill;
