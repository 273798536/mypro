const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const BATCHES_FILE = path.join(DATA_DIR, 'batches.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'versions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadBatches() {
  ensureDataDir();
  if (!fs.existsSync(BATCHES_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(BATCHES_FILE, 'utf8'));
}

function saveBatches(batches) {
  ensureDataDir();
  fs.writeFileSync(BATCHES_FILE, JSON.stringify(batches, null, 2));
}

function loadVersions() {
  ensureDataDir();
  if (!fs.existsSync(VERSIONS_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(VERSIONS_FILE, 'utf8'));
}

function saveVersions(versions) {
  ensureDataDir();
  fs.writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2));
}

function generateId() {
  return 'BAT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function createBatch(initialData) {
  const batches = loadBatches();
  const versions = loadVersions();
  
  const batchId = generateId();
  const now = new Date().toISOString();
  
  const batch = {
    id: batchId,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    version: 1,
    temperaturePoints: initialData.temperaturePoints || [],
    powerLevel: initialData.powerLevel || null,
    turntableRotation: initialData.turntableRotation !== undefined ? initialData.turntableRotation : true,
    foodDimensions: null,
    analysis: null,
    reviewNotes: null,
    anomalies: [],
    history: []
  };
  
  batches[batchId] = batch;
  saveBatches(batches);
  
  versions[batchId] = [{
    version: 1,
    timestamp: now,
    data: JSON.parse(JSON.stringify(batch))
  }];
  saveVersions(versions);
  
  return batch;
}

function getBatch(batchId) {
  const batches = loadBatches();
  return batches[batchId] || null;
}

function updateBatch(batchId, updates) {
  const batches = loadBatches();
  const versions = loadVersions();
  
  if (!batches[batchId]) {
    return null;
  }
  
  const oldBatch = JSON.parse(JSON.stringify(batches[batchId]));
  
  const now = new Date().toISOString();
  const newVersion = oldBatch.version + 1;
  
  const updatedBatch = {
    ...oldBatch,
    ...updates,
    version: newVersion,
    updatedAt: now,
    history: [...oldBatch.history, {
      version: oldBatch.version,
      timestamp: now,
      changes: Object.keys(updates)
    }]
  };
  
  batches[batchId] = updatedBatch;
  saveBatches(batches);
  
  if (!versions[batchId]) {
    versions[batchId] = [];
  }
  versions[batchId].push({
    version: newVersion,
    timestamp: now,
    data: JSON.parse(JSON.stringify(updatedBatch))
  });
  saveVersions(versions);
  
  return updatedBatch;
}

function listBatches() {
  const batches = loadBatches();
  return Object.values(batches).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getBatchVersions(batchId) {
  const versions = loadVersions();
  return versions[batchId] || [];
}

function compareVersions(batchId, v1, v2) {
  const versions = loadVersions();
  const batchVersions = versions[batchId] || [];
  
  const version1 = batchVersions.find(v => v.version === v1);
  const version2 = batchVersions.find(v => v.version === v2);
  
  if (!version1 || !version2) {
    return null;
  }
  
  const changes = [];
  const fields = ['temperaturePoints', 'powerLevel', 'turntableRotation', 'foodDimensions', 'status'];
  
  fields.forEach(field => {
    const oldVal1 = JSON.stringify(version1.data[field]);
    const oldVal2 = JSON.stringify(version2.data[field]);
    if (oldVal1 !== oldVal2) {
      changes.push({
        field,
        oldValue: version1.data[field],
        newValue: version2.data[field]
      });
    }
  });
  
  return {
    batchId,
    fromVersion: v1,
    toVersion: v2,
    changes
  };
}

module.exports = {
  createBatch,
  getBatch,
  updateBatch,
  listBatches,
  getBatchVersions,
  compareVersions
};
