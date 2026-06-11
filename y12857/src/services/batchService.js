const db = require('../models/db');
const dayjs = require('dayjs');

const STATUS_FLOW = ['imported', 'cleaning', 'cleaned', 'reviewing', 'reviewed', 'exported'];

const STATUS_TIME_FIELDS = {
  imported: 'imported_at',
  cleaned: 'cleaned_at',
  reviewed: 'reviewed_at',
  exported: 'exported_at',
};

const createBatch = (name, notes = '') => {
  const stmt = db.prepare(`
    INSERT INTO batches (name, status, notes)
    VALUES (?, 'imported', ?)
  `);
  const result = stmt.run(name, notes);
  return getBatchById(result.lastInsertRowid);
};

const getBatchById = (id) => {
  return db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
};

const listBatches = (limit = 20, offset = 0) => {
  return db.prepare(`
    SELECT * FROM batches
    ORDER BY imported_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
};

const updateBatchStatus = (id, status) => {
  if (!STATUS_FLOW.includes(status)) {
    throw new Error(`无效状态: ${status}`);
  }
  const timeField = STATUS_TIME_FIELDS[status];
  let sql = 'UPDATE batches SET status = ?';
  const params = [status];
  if (timeField) {
    sql += `, ${timeField} = datetime('now')`;
  }
  sql += ' WHERE id = ?';
  params.push(id);
  const stmt = db.prepare(sql);
  stmt.run(...params);
  return getBatchById(id);
};

const updateBatchStats = (id, stats) => {
  const fields = Object.keys(stats).map(k => `${k} = ?`).join(', ');
  const values = Object.values(stats);
  values.push(id);
  const stmt = db.prepare(`UPDATE batches SET ${fields} WHERE id = ?`);
  stmt.run(...values);
  return getBatchById(id);
};

const deleteBatch = (id) => {
  const stmt = db.prepare('DELETE FROM batches WHERE id = ?');
  return stmt.run(id);
};

const canTransition = (currentStatus, targetStatus) => {
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);
  const targetIdx = STATUS_FLOW.indexOf(targetStatus);
  return targetIdx >= 0 && targetIdx >= currentIdx;
};

module.exports = {
  STATUS_FLOW,
  createBatch,
  getBatchById,
  listBatches,
  updateBatchStatus,
  updateBatchStats,
  deleteBatch,
  canTransition,
};
