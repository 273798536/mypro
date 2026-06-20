const db = require('../db');

function writeHistory(trackId, fieldName, oldValue, newValue, reason, operator) {
  if (String(oldValue) === String(newValue)) return;
  const stmt = db.prepare(`
    INSERT INTO track_history (track_id, field_name, old_value, new_value, change_reason, operator)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(trackId, fieldName, oldValue ? String(oldValue) : null, newValue ? String(newValue) : null, reason || null, operator || 'system');
}

function listTracks(params = {}) {
  const { status, is_encore, anomaly_only, keyword, offset = 0, limit = 100 } = params;
  let sql = `SELECT t.*, (SELECT COUNT(*) FROM anomaly_alerts a WHERE a.track_id = t.id AND a.resolved = 0) AS open_alerts FROM tracks t WHERE 1=1`;
  const args = [];
  if (status) { sql += ` AND t.status = ?`; args.push(status); }
  if (is_encore !== undefined && is_encore !== null && is_encore !== '') { sql += ` AND t.is_encore = ?`; args.push(is_encore ? 1 : 0); }
  if (anomaly_only) { sql += ` AND EXISTS (SELECT 1 FROM anomaly_alerts a WHERE a.track_id = t.id AND a.resolved = 0)`; }
  if (keyword) {
    sql += ` AND (t.track_name LIKE ? OR t.track_aliases LIKE ? OR t.file_name LIKE ? OR t.remark LIKE ?)`;
    const kw = `%${keyword}%`;
    args.push(kw, kw, kw, kw);
  }
  sql += ` ORDER BY COALESCE(t.program_order, 99999), t.id LIMIT ? OFFSET ?`;
  args.push(limit, offset);
  return db.prepare(sql).all(...args);
}

function countTracks(params = {}) {
  const { status, is_encore, anomaly_only, keyword } = params;
  let sql = `SELECT COUNT(*) AS c FROM tracks t WHERE 1=1`;
  const args = [];
  if (status) { sql += ` AND t.status = ?`; args.push(status); }
  if (is_encore !== undefined && is_encore !== null && is_encore !== '') { sql += ` AND t.is_encore = ?`; args.push(is_encore ? 1 : 0); }
  if (anomaly_only) { sql += ` AND EXISTS (SELECT 1 FROM anomaly_alerts a WHERE a.track_id = t.id AND a.resolved = 0)`; }
  if (keyword) {
    sql += ` AND (t.track_name LIKE ? OR t.track_aliases LIKE ? OR t.file_name LIKE ? OR t.remark LIKE ?)`;
    const kw = `%${keyword}%`;
    args.push(kw, kw, kw, kw);
  }
  return db.prepare(sql).get(...args).c;
}

function getTrack(id) {
  return db.prepare(`SELECT * FROM tracks WHERE id = ?`).get(id);
}

function createTrack(data, operator = 'system') {
  const stmt = db.prepare(`
    INSERT INTO tracks (track_no, track_name, track_aliases, file_name, source, source_type, program_order, is_encore, status, remark, auth_remark, anomaly_type, anomaly_detail, operator)
    VALUES (@track_no, @track_name, @track_aliases, @file_name, @source, @source_type, @program_order, @is_encore, @status, @remark, @auth_remark, @anomaly_type, @anomaly_detail, @operator)
  `);
  const info = stmt.run({
    track_no: data.track_no || null,
    track_name: data.track_name,
    track_aliases: data.track_aliases || null,
    file_name: data.file_name || null,
    source: data.source || null,
    source_type: data.source_type || 'manual',
    program_order: data.program_order || null,
    is_encore: data.is_encore ? 1 : 0,
    status: data.status || 'pending',
    remark: data.remark || null,
    auth_remark: data.auth_remark || null,
    anomaly_type: data.anomaly_type || null,
    anomaly_detail: data.anomaly_detail || null,
    operator: operator,
  });
  return getTrack(info.lastInsertRowid);
}

function updateTrack(id, data, operator = 'system', reason = null) {
  const current = getTrack(id);
  if (!current) return null;
  const fields = ['track_no', 'track_name', 'track_aliases', 'file_name', 'source', 'source_type', 'program_order', 'is_encore', 'status', 'remark', 'auth_remark', 'anomaly_type', 'anomaly_detail'];
  const sets = [];
  const args = [];
  fields.forEach(f => {
    if (data[f] !== undefined) {
      const newVal = (f === 'is_encore') ? (data[f] ? 1 : 0) : data[f];
      sets.push(`${f} = ?`);
      args.push(newVal);
      writeHistory(id, f, current[f], newVal, reason, operator);
    }
  });
  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  sets.push(`operator = ?`);
  args.push(operator);
  args.push(id);
  db.prepare(`UPDATE tracks SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  return getTrack(id);
}

function deleteTrack(id) {
  return db.prepare(`DELETE FROM tracks WHERE id = ?`).run(id);
}

function getTrackHistory(trackId) {
  return db.prepare(`SELECT * FROM track_history WHERE track_id = ? ORDER BY created_at DESC, id DESC`).all(trackId);
}

function getStatistics() {
  const total = db.prepare(`SELECT COUNT(*) AS c FROM tracks`).get().c;
  const encore = db.prepare(`SELECT COUNT(*) AS c FROM tracks WHERE is_encore = 1`).get().c;
  const pending = db.prepare(`SELECT COUNT(*) AS c FROM tracks WHERE status = 'pending'`).get().c;
  const confirmed = db.prepare(`SELECT COUNT(*) AS c FROM tracks WHERE status = 'confirmed'`).get().c;
  const openAlerts = db.prepare(`SELECT COUNT(*) AS c FROM anomaly_alerts WHERE resolved = 0`).get().c;
  const conflictCount = db.prepare(`SELECT COUNT(*) AS c FROM alias_conflicts WHERE resolved = 0`).get().c;
  return { total, encore, pending, confirmed, openAlerts, conflictCount };
}

module.exports = {
  listTracks,
  countTracks,
  getTrack,
  createTrack,
  updateTrack,
  deleteTrack,
  getTrackHistory,
  getStatistics,
  writeHistory,
};
