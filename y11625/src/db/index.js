const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const adapter = new FileSync(path.join(dbDir, 'sybil-db.json'));
const db = low(adapter);

db.defaults({
  addresses: [],
  tasks: [],
  onChainInteractions: [],
  exchangeTags: [],
  communityLists: [],
  whitelist: [],
  filterRules: [],
  filterReports: [],
  auditLogs: [],
  clusters: [],
  systemConfig: {
    riskThreshold: 60,
    highRiskThreshold: 80,
    clusterSimilarityThreshold: 0.7,
    createdAt: new Date().toISOString()
  }
}).write();

module.exports = db;
