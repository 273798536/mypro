const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReturnApplication = sequelize.define('ReturnApplication', {
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
  apply_no: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '退供申请单号'
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
  supplier_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '供应商名称'
  },
  sku_code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '商品编码'
  },
  sku_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '商品名称'
  },
  apply_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '申请数量'
  },
  supplier_confirm_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '供应商确认数量'
  },
  remaining_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '剩余未确认数量'
  },
  apply_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: '申请金额'
  },
  apply_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '申请日期'
  },
  status: {
    type: DataTypes.ENUM('pending', 'part_confirmed', 'fully_confirmed', 'rejected', 'exception'),
    defaultValue: 'pending',
    comment: '状态'
  },
  process_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '处理原因（供应商只认部分批次，剩余货品状态没人维护）'
  },
  is_processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已处理'
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '处理时间'
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
  tableName: 'return_applications',
  indexes: [
    { fields: ['apply_no'], unique: true },
    { fields: ['batch_no'] },
    { fields: ['supplier_code'] },
    { fields: ['data_hash'] },
    { fields: ['status'] }
  ]
});

module.exports = ReturnApplication;
