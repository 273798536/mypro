const { generateMockSnapshots, generateMockVersions } = require('../data/mockData');

let snapshots = [];
let versions = [];

function initializeData() {
  const mock = generateMockSnapshots();
  snapshots = mock.snapshots;
  versions = generateMockVersions(snapshots);
}

function getSnapshots(filters = {}) {
  let result = [...snapshots];
  
  if (filters.version_id) {
    result = result.filter(s => s.version_id === filters.version_id);
  }
  if (filters.status) {
    result = result.filter(s => s.status === filters.status);
  }
  if (filters.anomaly_type) {
    result = result.filter(s => s.anomaly_type === filters.anomaly_type);
  }
  
  return result;
}

function getSnapshotById(id) {
  return snapshots.find(s => s.id === id);
}

function updateSnapshotStatus(id, status, notes = '') {
  const snapshot = snapshots.find(s => s.id === id);
  if (snapshot) {
    snapshot.status = status;
    snapshot.notes = notes;
    snapshot.updated_at = new Date().toISOString();
    
    const version = versions.find(v => v.id === snapshot.version_id);
    if (version) {
      recalculateVersionStats(version);
    }
  }
  return snapshot;
}

function getVersions() {
  return versions;
}

function getVersionById(id) {
  return versions.find(v => v.id === id);
}

function createVersion(versionName) {
  const newVersion = {
    id: 'v_' + Date.now(),
    version_name: versionName,
    status: 'processing',
    total_count: 0,
    confirmed_count: 0,
    anomaly_count: 0,
    needs_evidence_count: 0,
    overall_metric: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notes: ''
  };
  versions.unshift(newVersion);
  return newVersion;
}

function updateVersionStatus(id, status, notes = '') {
  const version = versions.find(v => v.id === id);
  if (version) {
    version.status = status;
    version.notes = notes;
    version.updated_at = new Date().toISOString();
  }
  return version;
}

function recalculateVersionStats(version) {
  const versionSnapshots = snapshots.filter(s => s.version_id === version.id);
  version.total_count = versionSnapshots.length;
  version.confirmed_count = versionSnapshots.filter(s => s.status === 'confirmed').length;
  version.anomaly_count = versionSnapshots.filter(s => s.anomaly_type !== 'none').length;
  version.needs_evidence_count = versionSnapshots.filter(s => s.status === 'needs_evidence').length;
  
  const confirmedSnapshots = versionSnapshots.filter(s => s.status === 'confirmed');
  if (confirmedSnapshots.length > 0) {
    const totalScore = confirmedSnapshots.reduce((sum, s) => sum + s.metric_score, 0);
    version.overall_metric = Math.round(totalScore / confirmedSnapshots.length * 100) / 100;
  }
  
  if (version.anomaly_count > 0 && version.status === 'processing') {
    version.status = 'pending_confirmation';
  }
  
  version.updated_at = new Date().toISOString();
}

function getDuplicateRunIds(versionId) {
  const versionSnapshots = snapshots.filter(s => s.version_id === versionId);
  const runIdMap = {};
  
  versionSnapshots.forEach(s => {
    if (!runIdMap[s.run_id]) {
      runIdMap[s.run_id] = [];
    }
    runIdMap[s.run_id].push(s);
  });
  
  const duplicates = {};
  Object.keys(runIdMap).forEach(runId => {
    if (runIdMap[runId].length > 1) {
      duplicates[runId] = runIdMap[runId];
    }
  });
  
  return duplicates;
}

function getInfluentialSamples(versionId, threshold = 0.8) {
  const versionSnapshots = snapshots.filter(s => s.version_id === versionId && s.status === 'confirmed');
  if (versionSnapshots.length === 0) return [];
  
  const avgScore = versionSnapshots.reduce((sum, s) => sum + s.metric_score, 0) / versionSnapshots.length;
  
  const influential = versionSnapshots
    .filter(s => Math.abs(s.metric_score - avgScore) / avgScore > (1 - threshold))
    .sort((a, b) => Math.abs(b.metric_score - avgScore) - Math.abs(a.metric_score - avgScore));
  
  return influential.map(s => ({
    ...s,
    deviation_from_avg: Math.round((s.metric_score - avgScore) * 100) / 100,
    deviation_percent: Math.round((s.metric_score - avgScore) / avgScore * 10000) / 100
  }));
}

function detectAnomalies(versionId) {
  const versionSnapshots = snapshots.filter(s => s.version_id === versionId);
  const anomalies = [];
  
  versionSnapshots.forEach(s => {
    if (s.anomaly_type !== 'none') {
      anomalies.push({
        snapshot_id: s.id,
        run_id: s.run_id,
        type: s.anomaly_type,
        detail: s.anomaly_detail,
        name: s.name,
        expected_name: s.expected_name
      });
    }
  });
  
  const duplicates = getDuplicateRunIds(versionId);
  Object.keys(duplicates).forEach(runId => {
    const dupSnapshots = duplicates[runId];
    anomalies.push({
      type: 'duplicate_run_id',
      run_id: runId,
      snapshot_ids: dupSnapshots.map(s => s.id),
      count: dupSnapshots.length,
      detail: `run_id ${runId} 出现 ${dupSnapshots.length} 次，可能为重复执行或数据冲突`
    });
  });
  
  return anomalies;
}

module.exports = {
  initializeData,
  getSnapshots,
  getSnapshotById,
  updateSnapshotStatus,
  getVersions,
  getVersionById,
  createVersion,
  updateVersionStatus,
  getDuplicateRunIds,
  getInfluentialSamples,
  detectAnomalies
};
