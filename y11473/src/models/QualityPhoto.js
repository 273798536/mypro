const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QualityPhoto = sequelize.define('QualityPhoto', {
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
  photo_no: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '质检照片编号'
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
  photo_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '照片URL'
  },
  photo_file_path: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '照片存储路径'
  },
  photo_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '照片哈希值'
  },
  inspection_result: {
    type: DataTypes.ENUM('qualified', 'unqualified', 'pending'),
    defaultValue: 'pending',
    comment: '质检结果'
  },
  inspector: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '质检员'
  },
  inspection_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '质检日期'
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
  tableName: 'quality_photos',
  indexes: [
    { fields: ['photo_no'], unique: true },
    { fields: ['batch_no'] },
    { fields: ['supplier_code'] },
    { fields: ['photo_hash'] },
    { fields: ['return_apply_id'] }
  ]
});

module.exports = QualityPhoto;
