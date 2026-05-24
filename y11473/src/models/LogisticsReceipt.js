const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LogisticsReceipt = sequelize.define('LogisticsReceipt', {
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
  receipt_no: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '物流回单号'
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
  waybill_no: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '运单号'
  },
  logistics_company: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '物流公司'
  },
  delivery_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '发货数量'
  },
  sign_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '签收数量'
  },
  delivery_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '发货日期'
  },
  sign_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '签收日期'
  },
  sign_status: {
    type: DataTypes.ENUM('pending', 'signed', 'rejected', 'lost'),
    defaultValue: 'pending',
    comment: '签收状态'
  },
  signatory: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '签收人'
  },
  receipt_image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '回单图片URL'
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
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
  tableName: 'logistics_receipts',
  indexes: [
    { fields: ['receipt_no'], unique: true },
    { fields: ['batch_no'] },
    { fields: ['supplier_code'] },
    { fields: ['waybill_no'] },
    { fields: ['return_apply_id'] }
  ]
});

module.exports = LogisticsReceipt;
