const db = require('../db');
const trackService = require('./trackService');
const anomalyService = require('./anomalyService');

function realignByAuthRemark(authRemarkPattern, operator = 'system') {
  if (!authRemarkPattern) return { aligned: 0, details: [] };
  const allTracks = db.prepare(`SELECT * FROM tracks`).all();
  const pattern = authRemarkPattern.toLowerCase();
  const details = [];
  let aligned = 0;

  allTracks.forEach(t => {
    const remark = (t.auth_remark || t.remark || '').toLowerCase();
    if (!remark.includes(pattern)) return;

    const changes = {};
    const reasons = [];

    if (!t.source) {
      changes.source = '授权备注对齐';
      reasons.push('补齐来源');
    }
    if (!t.status || t.status === 'pending') {
      changes.status = 'confirmed';
      reasons.push('状态改为已确认');
    }
    if (!t.file_name && t.track_name) {
      const guessed = guessFilenameFromTrack(t.track_name, allTracks);
      if (guessed) {
        changes.file_name = guessed;
        reasons.push(`文件名对齐为${guessed}`);
      }
    }
    if (!t.program_order) {
      changes.program_order = null;
    }

    if (Object.keys(changes).length > 0) {
      trackService.updateTrack(t.id, { ...changes, auth_remark: t.auth_remark || authRemarkPattern }, operator, `授权备注对齐: ${reasons.join('；')}`);
      details.push({ id: t.id, track_name: t.track_name, changes });
      aligned++;
    }
  });

  anomalyService.detectFileMismatch();
  return { aligned, details };
}

function guessFilenameFromTrack(trackName, allTracks) {
  const existingFiles = allTracks.map(t => t.file_name).filter(Boolean);
  const cleanName = (trackName || '').replace(/[\s\-_\.【】\[\]\(\)（）]/g, '').toLowerCase();
  for (const f of existingFiles) {
    const cleanF = (f || '').replace(/[\s\-_\.【】\[\]\(\)（）]/g, '').toLowerCase().replace(/\.(mp3|wav|flac|m4a|aac)$/i, '');
    if (cleanF === cleanName || cleanF.includes(cleanName)) return f;
  }
  return null;
}

function reconcileAll(operator = 'system') {
  const allTracks = db.prepare(`SELECT * FROM tracks`).all();
  const fileMap = new Map();
  allTracks.forEach(t => {
    if (t.file_name) fileMap.set(String(t.file_name).trim().toLowerCase(), t);
  });
  let count = 0;
  allTracks.forEach(t => {
    if (t.file_name) return;
    const candidates = [];
    for (const [fn, ft] of fileMap.entries()) {
      if (ft.id === t.id) continue;
      const cleanName = (t.track_name || '').replace(/[\s\-_\.【】\[\]\(\)（）]/g, '').toLowerCase();
      const cleanF = fn.replace(/\.(mp3|wav|flac|m4a|aac)$/i, '');
      if (cleanF.includes(cleanName) || cleanName.includes(cleanF)) {
        candidates.push({ fn, track_id: ft.id, score: Math.abs(cleanF.length - cleanName.length) });
      }
    }
    if (candidates.length === 1) {
      trackService.updateTrack(t.id, { file_name: candidates[0].fn }, operator, '全量对齐: 文件名匹配');
      count++;
    }
  });
  const checks = anomalyService.runAllChecks();
  return { reconciled: count, anomalyChecks: checks };
}

function batchUpdateByTrackName(namePattern, updates, operator, reason) {
  const rows = db.prepare(`SELECT id, track_name FROM tracks WHERE track_name LIKE ?`).all(`%${namePattern}%`);
  let updated = 0;
  rows.forEach(r => {
    trackService.updateTrack(r.id, updates, operator, reason || `批量更新: ${namePattern}`);
    updated++;
  });
  return { matched: rows.length, updated };
}

module.exports = {
  realignByAuthRemark,
  reconcileAll,
  batchUpdateByTrackName,
  guessFilenameFromTrack,
};
