const sequelize = require('../config/database');

const Contract = require('./Contract');
const BillingRule = require('./BillingRule');
const SeatUsage = require('./SeatUsage');
const DowngradeRequest = require('./DowngradeRequest');
const Bill = require('./Bill');
const BillUsageLink = require('./BillUsageLink');
const ManualCorrection = require('./ManualCorrection');
const OperationLog = require('./OperationLog');
const InvoiceRedFlush = require('./InvoiceRedFlush');

Contract.hasMany(SeatUsage, { foreignKey: 'contract_id' });
SeatUsage.belongsTo(Contract, { foreignKey: 'contract_id' });

Contract.hasMany(DowngradeRequest, { foreignKey: 'contract_id' });
DowngradeRequest.belongsTo(Contract, { foreignKey: 'contract_id' });

Contract.hasMany(Bill, { foreignKey: 'contract_id' });
Bill.belongsTo(Contract, { foreignKey: 'contract_id' });

DowngradeRequest.hasMany(SeatUsage, { foreignKey: 'downgrade_request_id' });
SeatUsage.belongsTo(DowngradeRequest, { foreignKey: 'downgrade_request_id' });

BillingRule.hasMany(SeatUsage, { foreignKey: 'billing_rule_id' });
SeatUsage.belongsTo(BillingRule, { foreignKey: 'billing_rule_id' });

BillingRule.hasMany(Bill, { foreignKey: 'billing_rule_id' });
Bill.belongsTo(BillingRule, { foreignKey: 'billing_rule_id' });

Bill.belongsToMany(SeatUsage, { through: BillUsageLink, foreignKey: 'bill_id', otherKey: 'seat_usage_id' });
SeatUsage.belongsToMany(Bill, { through: BillUsageLink, foreignKey: 'seat_usage_id', otherKey: 'bill_id' });

SeatUsage.hasMany(ManualCorrection, {
  foreignKey: 'target_id',
  constraints: false,
  scope: {
    target_type: 'seat_usage',
  },
});

Bill.hasMany(ManualCorrection, {
  foreignKey: 'target_id',
  constraints: false,
  scope: {
    target_type: 'bill',
  },
});

ManualCorrection.belongsTo(SeatUsage, {
  foreignKey: 'target_id',
  constraints: false,
});

ManualCorrection.belongsTo(Bill, {
  foreignKey: 'target_id',
  constraints: false,
});

const db = {
  sequelize,
  Contract,
  BillingRule,
  SeatUsage,
  DowngradeRequest,
  Bill,
  BillUsageLink,
  ManualCorrection,
  OperationLog,
  InvoiceRedFlush,
};

module.exports = db;
