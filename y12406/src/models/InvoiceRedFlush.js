const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceRedFlush = sequelize.define('InvoiceRedFlush', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  red_flush_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '红冲单号',
  },
  original_invoice_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '原发票号',
  },
  original_invoice_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '原发票金额',
  },
  red_flush_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '红冲金额',
  },
  contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '合同ID',
  },
  related_bill_id: {
    type: DataTypes.INTEGER,
    comment: '关联账单ID',
  },
  related_bill_no: {
    type: DataTypes.STRING(50),
    comment: '关联账单号',
  },
  original_billing_cycle: {
    type: DataTypes.STRING(7),
    comment: '原计费周期',
  },
  red_flush_reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '红冲原因',
  },
  impact_on_usage: {
    type: DataTypes.JSON,
    comment: '对用量的影响: {affected_usage_ids: [...], amount_adjustment: ...}',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    comment: '状态: pending-待处理, processed-已处理, cancelled-已取消',
  },
  processed_at: {
    type: DataTypes.DATE,
    comment: '处理时间',
  },
  processed_by: {
    type: DataTypes.STRING(50),
    comment: '处理人',
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
  tableName: 'invoice_red_flushes',
  comment: '发票红冲记录表',
});

module.exports = InvoiceRedFlush;
