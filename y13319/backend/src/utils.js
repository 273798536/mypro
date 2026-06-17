const db = require('./db');

const REQUIRED_FIELDS = ['source', 'status'];

function getFieldMapping() {
  const rows = db.prepare('SELECT source_name, standard_field FROM field_mapping').all();
  const map = {};
  rows.forEach(r => {
    map[r.source_name.toLowerCase()] = r.standard_field;
  });
  return map;
}

function normalizePayload(rawPayload) {
  const mapping = getFieldMapping();
  const normalized = {};
  const rawKeys = Object.keys(rawPayload);

  rawKeys.forEach(key => {
    const lowerKey = key.toLowerCase();
    const standardKey = mapping[lowerKey] || mapping[key] || key;
    normalized[standardKey] = rawPayload[key];
  });

  REQUIRED_FIELDS.forEach(f => {
    if (normalized[f] === undefined || normalized[f] === null || normalized[f] === '') {
      if (f === 'source') normalized[f] = normalized['来源'] || normalized['数据来源'] || normalized['source'] || 'unknown';
      if (f === 'status') normalized[f] = normalized['状态'] || normalized['处理状态'] || normalized['status'] || 'pending';
    }
  });

  return normalized;
}

function logHistory(entityType, entityId, versionId, changeType, fieldName, oldValue, newValue, operator, note) {
  const stmt = db.prepare(`INSERT INTO change_history
    (entity_type, entity_id, version_id, change_type, field_name, old_value, new_value, operator, change_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(entityType, entityId, versionId || null, changeType,
    fieldName || null,
    oldValue !== undefined && oldValue !== null ? String(oldValue) : null,
    newValue !== undefined && newValue !== null ? String(newValue) : null,
    operator || 'system', note || null);
}

function calculateMetrics(versionId) {
  const samples = db.prepare('SELECT * FROM samples WHERE version_id = ?').all(versionId);
  const corrections = db.prepare('SELECT * FROM manual_corrections WHERE version_id = ? AND status = ?').all(versionId, 'confirmed');

  const total = samples.length;
  const anomalySamples = samples.filter(s => s.anomaly_type && s.anomaly_type !== '');
  const normalSamples = samples.filter(s => !s.anomaly_type || s.anomaly_type === '');
  const correctCount = normalSamples.filter(s => s.is_correct === 1).length;
  const accuracy = normalSamples.length > 0 ? (correctCount / normalSamples.length) * 100 : 0;

  const categoryStats = {};
  normalSamples.forEach(s => {
    const cat = s.category_gt || 'unknown';
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, correct: 0 };
    categoryStats[cat].total++;
    if (s.is_correct === 1) categoryStats[cat].correct++;
  });

  const categoryAccuracy = {};
  Object.keys(categoryStats).forEach(cat => {
    categoryAccuracy[cat] = categoryStats[cat].total > 0
      ? (categoryStats[cat].correct / categoryStats[cat].total) * 100
      : 0;
  });

  const anomalyStats = {};
  anomalySamples.forEach(s => {
    const at = s.anomaly_type || 'unknown';
    if (!anomalyStats[at]) anomalyStats[at] = 0;
    anomalyStats[at]++;
  });

  const impactSamples = normalSamples
    .filter(s => s.is_correct === 0)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 20);

  return {
    total_samples: total,
    normal_samples: normalSamples.length,
    anomaly_samples: anomalySamples.length,
    correct_count: correctCount,
    accuracy: Number(accuracy.toFixed(2)),
    category_stats: categoryStats,
    category_accuracy: categoryAccuracy,
    anomaly_stats: anomalyStats,
    correction_count: corrections.length,
    impact_samples: impactSamples,
    category_detail: Object.keys(categoryStats).map(cat => ({
      category: cat,
      total: categoryStats[cat].total,
      correct: categoryStats[cat].correct,
      accuracy: Number(categoryAccuracy[cat].toFixed(2))
    }))
  };
}

module.exports = {
  normalizePayload,
  logHistory,
  calculateMetrics,
  getFieldMapping,
  REQUIRED_FIELDS
};
