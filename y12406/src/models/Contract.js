const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  contract_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '合同编号',
  },
  customer_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '客户名称',
  },
  product_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '产品编码',
  },
  original_seat_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '合同约定座席数',
  },
  current_seat_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '当前有效座席数',
  },
  effective_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '合同生效日期',
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '合同到期日期',
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '单座席单价(元/月)',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'active',
    comment: '状态: active-有效, expired-已过期, terminated-已终止',
  },
  remarks: {
    type: DataTypes.TEXT,
    comment: '备注',
  },
}, {
  tableName: 'contracts',
  comment: '客户合同表',
});

module.exports = Contract;
