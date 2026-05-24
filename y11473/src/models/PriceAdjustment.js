const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PriceAdjustment = sequelize.define('PriceAdjustment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  import_record_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '关联的导入记录ID'
  },
  adjust_no: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '改价单号'
  },
  batch_no: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '批次号'
  },
  supplier_code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '供应商编码'
  },
  sku_code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '商品编码'
  },
  original_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '原价'
  },
  adjusted_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '调整后价格'
  },
  adjust_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '调整数量'
  },
  adjust_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: '调整金额'
  },
  adjust_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '改价日期'
  },
  adjust_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '改价原因'
  },
  operator: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '操作人'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'executed'),
    defaultValue: 'pending',
    comment: '状态'
  },
  return_apply_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '关联的退供申请ID'
  },
  data_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '数据哈希，用于去重'
  },
  is_duplicate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否重复'
  },
  duplicate_of_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '重复的记录ID'
  }
}, {
  tableName: 'price_adjustments',
  indexes: [
    { fields: ['adjust_no'], unique: true },
    { fields: ['batch_no'] },
    { fields: ['supplier_code'] },
    { fields: ['sku_code'] },
    { fields: ['return_apply_id'] }
  ]
});

module.exports = PriceAdjustment;
