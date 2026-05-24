const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ImportRecord = sequelize.define('ImportRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  source_file: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '来源文件名'
  },
  source_file_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '来源文件哈希，用于去重'
  },
  source_type: {
    type: DataTypes.ENUM('return_apply', 'quality_photo', 'logistics_receipt', 'price_adjustment', 'history_archive'),
    allowNull: false,
    comment: '来源类型'
  },
  raw_row_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '原始行号'
  },
  raw_data: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '原始数据JSON'
  },
  parsed_data: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '解析后的标准值JSON'
  },
  parse_status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    comment: '解析状态: pending, success, failed'
  },
  parse_error: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '解析错误信息'
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
  },
  batch_no: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '批次号'
  },
  supplier_code: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '供应商编码'
  },
  process_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '处理原因'
  },
  imported_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '导入人'
  }
}, {
  tableName: 'import_records',
  indexes: [
    { name: 'import_records_hash_type_row_unique', fields: ['source_file_hash', 'source_type', 'raw_row_number'], unique: true },
    { fields: ['batch_no'] },
    { fields: ['supplier_code'] },
    { fields: ['is_duplicate'] },
    { fields: ['parse_status'] }
  ]
});

module.exports = ImportRecord;
