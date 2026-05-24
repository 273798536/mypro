const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CorrectionHistory = sequelize.define('CorrectionHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  record_type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '记录类型'
  },
  record_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '记录ID'
  },
  field_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '修改的字段名'
  },
  old_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '旧值'
  },
  new_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '新值'
  },
  old_raw: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '旧值原始数据'
  },
  new_raw: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '新值原始数据'
  },
  correction_reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '修正原因'
  },
  corrected_by: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '修正人'
  },
  correction_method: {
    type: DataTypes.ENUM('manual', 'system', 'replay'),
    defaultValue: 'manual',
    comment: '修正方式'
  },
  related_exception_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '关联的异常记录ID'
  },
  related_import_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '关联的导入记录ID'
  },
  difference_summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '差异摘要'
  }
}, {
  tableName: 'correction_histories',
  indexes: [
    { fields: ['record_type', 'record_id'] },
    { fields: ['field_name'] },
    { fields: ['corrected_by'] },
    { fields: ['created_at'] },
    { fields: ['related_exception_id'] }
  ]
});

module.exports = CorrectionHistory;
