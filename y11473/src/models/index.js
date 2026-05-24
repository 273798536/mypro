const sequelize = require('../config/database');

const ImportRecord = require('./ImportRecord');
const ReturnApplication = require('./ReturnApplication');
const QualityPhoto = require('./QualityPhoto');
const LogisticsReceipt = require('./LogisticsReceipt');
const PriceAdjustment = require('./PriceAdjustment');
const AsyncTask = require('./AsyncTask');
const OperationTrace = require('./OperationTrace');
const ExceptionRecord = require('./ExceptionRecord');
const CorrectionHistory = require('./CorrectionHistory');

ReturnApplication.belongsTo(ImportRecord, { foreignKey: 'import_record_id', as: 'importRecord' });
QualityPhoto.belongsTo(ImportRecord, { foreignKey: 'import_record_id', as: 'importRecord' });
LogisticsReceipt.belongsTo(ImportRecord, { foreignKey: 'import_record_id', as: 'importRecord' });
PriceAdjustment.belongsTo(ImportRecord, { foreignKey: 'import_record_id', as: 'importRecord' });

QualityPhoto.belongsTo(ReturnApplication, { foreignKey: 'return_apply_id', as: 'returnApplication' });
LogisticsReceipt.belongsTo(ReturnApplication, { foreignKey: 'return_apply_id', as: 'returnApplication' });
PriceAdjustment.belongsTo(ReturnApplication, { foreignKey: 'return_apply_id', as: 'returnApplication' });

ReturnApplication.hasMany(QualityPhoto, { foreignKey: 'return_apply_id', as: 'qualityPhotos' });
ReturnApplication.hasMany(LogisticsReceipt, { foreignKey: 'return_apply_id', as: 'logisticsReceipts' });
ReturnApplication.hasMany(PriceAdjustment, { foreignKey: 'return_apply_id', as: 'priceAdjustments' });

ExceptionRecord.belongsTo(ImportRecord, { foreignKey: 'import_record_id', as: 'importRecord' });
ExceptionRecord.belongsTo(AsyncTask, { foreignKey: 'async_task_id', as: 'asyncTask' });

CorrectionHistory.belongsTo(ExceptionRecord, { foreignKey: 'related_exception_id', as: 'exceptionRecord' });
CorrectionHistory.belongsTo(ImportRecord, { foreignKey: 'related_import_id', as: 'importRecord' });

module.exports = {
  sequelize,
  ImportRecord,
  ReturnApplication,
  QualityPhoto,
  LogisticsReceipt,
  PriceAdjustment,
  AsyncTask,
  OperationTrace,
  ExceptionRecord,
  CorrectionHistory
};
