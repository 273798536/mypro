const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BillUsageLink = sequelize.define('BillUsageLink', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  bill_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '账单ID',
  },
  seat_usage_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '座席用量ID',
  },
  billing_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '该行用量计入账单的金额',
  },
  excess_seats_count: {
    type: DataTypes.INTEGER,
    comment: '超额座席数',
  },
  remarks: {
    type: DataTypes.STRING(500),
    comment: '备注',
  },
}, {
  tableName: 'bill_usage_links',
  comment: '账单用量关联表',
  indexes: [
    {
      unique: true,
      fields: ['bill_id', 'seat_usage_id'],
      name: 'uk_bill_usage',
    },
  ],
});

module.exports = BillUsageLink;
