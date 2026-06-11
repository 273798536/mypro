const db = require('../models/db');
const batchService = require('./batchService');

const addReviewOpinion = (batchId, anomalyId, opinion, action = '', reviewer = '') => {
  const stmt = db.prepare(`
    INSERT INTO review_opinions (batch_id, anomaly_id, reviewer, opinion, action)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(batchId, anomalyId || null, reviewer, opinion, action);
  return db.prepare('SELECT * FROM review_opinions WHERE id = ?').get(result.lastInsertRowid);
};

const listReviewOpinions = (batchId, anomalyId = null) => {
  let sql = 'SELECT * FROM review_opinions WHERE batch_id = ?';
  const params = [batchId];
  if (anomalyId) {
    sql += ' AND anomaly_id = ?';
    params.push(anomalyId);
  }
  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all(...params);
};

const submitReview = (batchId, reviewer = '') => {
  const batch = batchService.getBatchById(batchId);
  if (!batch) throw new Error('批次不存在');

  batchService.updateBatchStatus(batchId, 'reviewing');
  batchService.updateBatchStatus(batchId, 'reviewed');

  return batchService.getBatchById(batchId);
};

const getWaterGaps = (batchId) => {
  return db.prepare(`
    SELECT * FROM water_quality
    WHERE batch_id = ? AND is_missing = 1
    ORDER BY timestamp
  `).all(batchId);
};

module.exports = {
  addReviewOpinion,
  listReviewOpinions,
  submitReview,
  getWaterGaps,
};
