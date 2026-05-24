const sequelize = require('../config/database');

const ChangeOrder = require('./ChangeOrder');
const ReviewOpinion = require('./ReviewOpinion');
const ReferenceRecord = require('./ReferenceRecord');
const Snapshot = require('./Snapshot');
const AsyncTask = require('./AsyncTask');
const AuditLog = require('./AuditLog');
const IdempotentRequest = require('./IdempotentRequest');

ChangeOrder.hasMany(ReviewOpinion, { foreignKey: 'changeOrderId', as: 'reviews' });
ReviewOpinion.belongsTo(ChangeOrder, { foreignKey: 'changeOrderId', as: 'changeOrder' });

module.exports = {
  sequelize,
  ChangeOrder,
  ReviewOpinion,
  ReferenceRecord,
  Snapshot,
  AsyncTask,
  AuditLog,
  IdempotentRequest
};
