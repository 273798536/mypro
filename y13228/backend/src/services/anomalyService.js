const db = require('../db');

function createAlert(trackId, alertType, alertLevel, alertDetail) {
  const stmt = db.prepare(`
    INSERT INTO anomaly_alerts (track_id, alert_type, alert_level, alert_detail)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(trackId || null, alertType, alertLevel || 'warning', alertDetail);
  return info.lastInsertRowid;
}

function listAlerts(params = {}) {
  const { resolved, alert_level, track_id, offset = 0, limit = 200 } = params;
  let sql = `SELECT a.*, t.track_name, t.file_name, t.status AS track_status FROM anomaly_alerts a LEFT JOIN tracks t ON a.track_id = t.id WHERE 1=1`;
  const args = [];
  if (resolved !== undefined && resolved !== null && resolved !== '') { sql += ` AND a.resolved = ?`; args.push(resolved ? 1 : 0); }
  if (alert_level) { sql += ` AND a.alert_level = ?`; args.push(alert_level); }
  if (track_id) { sql += ` AND a.track_id = ?`; args.push(track_id); }
  sql += ` ORDER BY a.resolved ASC, a.created_at DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);
  return db.prepare(sql).all(...args);
}

function resolveAlert(id, resolvedBy, resolvedRemark) {
  return db.prepare(`
    UPDATE anomaly_alerts SET resolved = 1, resolved_by = ?, resolved_remark = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(resolvedBy || 'system', resolvedRemark || null, id);
}

function detectFileMismatch() {
  db.prepare(`DELETE FROM anomaly_alerts WHERE alert_type = 'file_mismatch' AND resolved = 0`).run();
  const rows = db.prepare(`SELECT id, track_name, file_name, track_no FROM tracks WHERE track_name IS NOT NULL`).all();
  let count = 0;
  rows.forEach(r => {
    if (!r.file_name) {
      createAlert(r.id, 'file_mismatch', 'warning', `曲目【${r.track_name}】未关联文件名`);
      db.prepare(`UPDATE tracks SET anomaly_type = 'file_mismatch', anomaly_detail = ? WHERE id = ?`).run('未关联文件名', r.id);
      count++;
      return;
    }
    const cleanTrack = (r.track_name || '').replace(/[\s\-_\.【】\[\]\(\)（）]/g, '').toLowerCase();
    const cleanFile = (r.file_name || '').replace(/[\s\-_\.【】\[\]\(\)（）]/g, '').toLowerCase().replace(/\.(mp3|wav|flac|m4a|aac)$/i, '');
    if (cleanTrack && cleanFile && cleanFile.indexOf(cleanTrack) === -1 && cleanTrack.indexOf(cleanFile) === -1) {
      createAlert(r.id, 'file_mismatch', 'warning', `曲目【${r.track_name}】与文件名【${r.file_name}】疑似不匹配`);
      db.prepare(`UPDATE tracks SET anomaly_type = 'file_mismatch', anomaly_detail = ? WHERE id = ?`).run(`与文件名${r.file_name}疑似不匹配`, r.id);
      count++;
    }
  });
  return count;
}

function detectAliasConflicts() {
  db.prepare(`DELETE FROM alias_conflicts WHERE resolved = 0`).run();
  const rows = db.prepare(`SELECT id, track_name, track_aliases FROM tracks WHERE track_aliases IS NOT NULL AND track_aliases != ''`).all();
  const aliasMap = new Map();
  rows.forEach(r => {
    const aliases = (r.track_aliases || '').split(/[,，;；、\s]+/).filter(Boolean);
    aliases.forEach(a => {
      const key = a.trim().toLowerCase();
      if (!aliasMap.has(key)) aliasMap.set(key, []);
      aliasMap.get(key).push({ id: r.id, name: r.track_name, alias: a.trim() });
    });
    const mainKey = (r.track_name || '').trim().toLowerCase();
    if (mainKey) {
      if (!aliasMap.has(mainKey)) aliasMap.set(mainKey, []);
      aliasMap.get(mainKey).push({ id: r.id, name: r.track_name, alias: r.track_name, isMain: true });
    }
  });
  let conflictCount = 0;
  aliasMap.forEach((items, key) => {
    const ids = [...new Set(items.map(i => i.id))];
    if (ids.length >= 2) {
      const stmt = db.prepare(`INSERT INTO alias_conflicts (alias_name, track_ids, conflict_type) VALUES (?, ?, 'duplicate_alias')`);
      stmt.run(key, JSON.stringify(ids));
      ids.forEach(tid => {
        const track = db.prepare(`SELECT track_name FROM tracks WHERE id = ?`).get(tid);
        const otherNames = items.filter(i => i.id !== tid).map(i => i.name).filter((v, i, a) => a.indexOf(v) === i).join('、');
        createAlert(tid, 'duplicate_alias', 'danger', `别名【${key}】与其他曲目【${otherNames}】重复，已单独拎出，请核查`);
        db.prepare(`UPDATE tracks SET anomaly_type = 'duplicate_alias', anomaly_detail = ? WHERE id = ?`).run(`别名${key}与其他曲目重复`, tid);
      });
      conflictCount++;
    }
  });
  return conflictCount;
}

function detectProgramOrderIssues() {
  db.prepare(`DELETE FROM anomaly_alerts WHERE alert_type = 'program_order' AND resolved = 0`).run();
  const missing = db.prepare(`SELECT id, track_name FROM tracks WHERE program_order IS NULL AND is_encore = 0`).all();
  let count = 0;
  missing.forEach(r => {
    createAlert(r.id, 'program_order', 'info', `曲目【${r.track_name}】缺少演出顺序`);
    count++;
  });
  return count;
}

function detectSourceMissing() {
  db.prepare(`DELETE FROM anomaly_alerts WHERE alert_type = 'source_missing' AND resolved = 0`).run();
  const rows = db.prepare(`SELECT id, track_name FROM tracks WHERE source IS NULL OR source = ''`).all();
  let count = 0;
  rows.forEach(r => {
    createAlert(r.id, 'source_missing', 'warning', `曲目【${r.track_name}】缺少来源信息（排练群截图/曲目表等），请补齐`);
    db.prepare(`UPDATE tracks SET anomaly_type = 'source_missing', anomaly_detail = ? WHERE id = ?`).run('缺少来源信息', r.id);
    count++;
  });
  return count;
}

function runAllChecks() {
  const a = detectFileMismatch();
  const b = detectAliasConflicts();
  const c = detectProgramOrderIssues();
  const d = detectSourceMissing();
  return { file_mismatch: a, alias_conflicts: b, program_order: c, source_missing: d, total: a + b + c + d };
}

function listConflicts(params = {}) {
  const { resolved } = params;
  let sql = `SELECT * FROM alias_conflicts WHERE 1=1`;
  const args = [];
  if (resolved !== undefined && resolved !== null && resolved !== '') { sql += ` AND resolved = ?`; args.push(resolved ? 1 : 0); }
  sql += ` ORDER BY resolved ASC, created_at DESC`;
  const conflicts = db.prepare(sql).all(...args);
  return conflicts.map(cf => {
    try {
      const ids = JSON.parse(cf.track_ids);
      const tracks = ids.map(id => db.prepare(`SELECT id, track_name, file_name, status FROM tracks WHERE id = ?`).get(id)).filter(Boolean);
      return { ...cf, tracks, track_ids_raw: cf.track_ids };
    } catch {
      return { ...cf, tracks: [] };
    }
  });
}

function resolveConflict(id, resolvedRemark, keepTrackId) {
  const cf = db.prepare(`SELECT * FROM alias_conflicts WHERE id = ?`).get(id);
  if (!cf) return null;
  db.prepare(`UPDATE alias_conflicts SET resolved = 1, resolved_remark = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(resolvedRemark || null, id);
  try {
    const ids = JSON.parse(cf.track_ids);
    ids.forEach(tid => {
      db.prepare(`UPDATE anomaly_alerts SET resolved = 1, resolved_remark = ?, resolved_at = CURRENT_TIMESTAMP WHERE track_id = ? AND alert_type = 'duplicate_alias' AND resolved = 0`).run(resolvedRemark || `冲突已解决，保留曲目ID=${keepTrackId || '未指定'}`, tid);
      if (keepTrackId && Number(tid) !== Number(keepTrackId)) {
        db.prepare(`UPDATE tracks SET anomaly_type = COALESCE(NULLIF(anomaly_type,'duplicate_alias'), anomaly_type), anomaly_detail = CASE WHEN anomaly_type = 'duplicate_alias' THEN NULL ELSE anomaly_detail END WHERE id = ?`).run(tid);
      }
    });
  } catch {}
  return true;
}

module.exports = {
  createAlert,
  listAlerts,
  resolveAlert,
  detectFileMismatch,
  detectAliasConflicts,
  detectProgramOrderIssues,
  detectSourceMissing,
  runAllChecks,
  listConflicts,
  resolveConflict,
};
