const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BillingRule = sequelize.define('BillingRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  rule_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '规则编码',
  },
  rule_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '规则名称',
  },
  product_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '适用产品编码',
  },
  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '规则版本号',
  },
  effective_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '生效日期',
  },
  expiry_date: {
    type: DataTypes.DATE,
    comment: '失效日期',
  },
  over_billing_strategy: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '超额计费策略: monthly-按月结算, daily-按天折算, prorated-按实际使用天数',
  },
  excess_tier_pricing: {
    type: DataTypes.JSON,
    comment: '超额阶梯定价: [{"min_seats": 1, "max_seats": 10, "price_multiplier": 1.2}, ...]',
  },
  minimum_billing_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '最低计费天数',
  },
  grace_period_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '宽限期天数',
  },
  downgrade_cross_month_rule: {
    type: DataTypes.STRING(50),
    defaultValue: 'current_month',
    comment: '降配跨月规则: current_month-当月生效, next_month-次月生效, by_effective_date-按降配生效日',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'active',
    comment: '状态: active-有效, inactive-无效',
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
  tableName: 'billing_rules',
  comment: '计费规则表',
});

module.exports = BillingRule;
