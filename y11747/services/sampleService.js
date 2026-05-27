const store = require('../models/store');
const path = require('path');
const fs = require('fs');

function importSamples(db) {
  const samplesPath = path.join(__dirname, '..', 'data', 'samples.json');
  if (!fs.existsSync(samplesPath)) {
    throw new Error('样例文件不存在: ' + samplesPath);
  }

  const samples = JSON.parse(fs.readFileSync(samplesPath, 'utf8'));

  const existingOrderIds = new Set(db.orders.map(o => o.id));
  const importedOrders = [];
  const importedFlows = [];
  const importedDamages = [];
  const importedReceipts = [];

  for (const order of samples.orders) {
    if (!existingOrderIds.has(order.id)) {
      db.orders.push(order);
      importedOrders.push(order.id);
    }
  }

  const existingFlowIds = new Set(db.depositFlows.map(f => f.id));
  for (const flow of samples.depositFlows) {
    if (!existingFlowIds.has(flow.id)) {
      db.depositFlows.push(flow);
      importedFlows.push(flow.id);
    }
  }

  const existingDmgIds = new Set(db.damageReports.map(d => d.id));
  for (const dmg of samples.damageReports) {
    if (!existingDmgIds.has(dmg.id)) {
      db.damageReports.push(dmg);
      importedDamages.push(dmg.id);
    }
  }

  const existingRecIds = new Set(db.channelReceipts.map(r => r.id));
  for (const rec of samples.channelReceipts) {
    if (!existingRecIds.has(rec.id)) {
      db.channelReceipts.push(rec);
      importedReceipts.push(rec.id);
    }
  }

  store.audit(db, 'import', 'batch', 'import_samples', {
    orders: importedOrders,
    flows: importedFlows,
    damages: importedDamages,
    receipts: importedReceipts
  });

  return {
    imported: {
      orders: importedOrders.length,
      flows: importedFlows.length,
      damages: importedDamages.length,
      receipts: importedReceipts.length
    }
  };
}

function clearAll(db) {
  db.orders = [];
  db.depositFlows = [];
  db.damageReports = [];
  db.channelReceipts = [];
  db.releaseRecords = [];
  db.alerts = [];
  db.auditLogs = [];
  store.saveDB(db);
}

module.exports = {
  importSamples,
  clearAll
};