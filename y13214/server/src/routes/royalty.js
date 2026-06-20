import { Router } from 'express';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { upload } from '../upload.js';
import {
  getRecords, saveRecords,
  getHistory, appendHistory,
  getVersions, createVersionSnapshot,
  getSettings, saveSettings,
  generateRecordId
} from '../store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOAD_DIR = join(__dirname, '..', '..', 'data', 'uploads');

const router = Router();

function isExpired(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d < new Date();
}

function detectStatus(record) {
  if (record.manualStatus) return record.manualStatus;
  if (isExpired(record.authorizationExpiry)) return 'expired';
  const missing = [];
  if (!record.singerName) missing.push('演唱者');
  if (!record.shareRatio) missing.push('分账比例');
  if (!record.workTitle) missing.push('作品名称');
  if (!record.authorizationExpiry) missing.push('授权到期日');
  if (missing.length > 0) return 'pending';
  return 'ready';
}

function enhanceRecords(records, sourceLabel) {
  return records.map((r) => {
    const id = r.id || generateRecordId();
    const clean = { ...r };
    delete clean.id;
    return {
      id,
      raw: JSON.parse(JSON.stringify(clean)),
      source: sourceLabel || 'manual',
      importedAt: new Date().toISOString(),
      manualStatus: r.manualStatus || null,
      manualNote: r.manualNote || '',
      screenshot: r.screenshot || '',
      deliveryChecklist: r.deliveryChecklist || [],
      workTitle: r.workTitle || r['作品名称'] || r['歌曲名'] || '',
      singerName: r.singerName || r['演唱者'] || r['歌手'] || '',
      part: r.part || r['声部'] || '',
      shareRatio: r.shareRatio != null ? r.shareRatio : (r['分账比例'] != null ? r['分账比例'] : ''),
      authorizationExpiry: r.authorizationExpiry || r['授权到期日'] || r['授权期限'] || '',
      authorizationStatus: r.authorizationStatus || '',
      contactInfo: r.contactInfo || r['联系方式'] || '',
      rehearsalNote: r.rehearsalNote || r['排练备注'] || '',
      isExpired: isExpired(r.authorizationExpiry || r['授权到期日'] || r['授权期限'] || ''),
      status: detectStatus(r)
    };
  });
}

router.get('/records', (req, res) => {
  const records = getRecords();
  const { hideExpired, status, keyword } = req.query;
  let filtered = records;
  if (hideExpired === 'true') {
    filtered = filtered.filter((r) => !r.isExpired);
  }
  if (status) {
    filtered = filtered.filter((r) => r.status === status);
  }
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    filtered = filtered.filter((r) =>
      (r.workTitle || '').toLowerCase().includes(kw) ||
      (r.singerName || '').toLowerCase().includes(kw) ||
      (r.part || '').toLowerCase().includes(kw)
    );
  }
  res.json(filtered);
});

router.get('/records/:id', (req, res) => {
  const records = getRecords();
  const rec = records.find((r) => r.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
});

router.post('/records', (req, res) => {
  const records = getRecords();
  const enhanced = enhanceRecords([req.body], 'manual');
  records.unshift(enhanced[0]);
  saveRecords(records);
  appendHistory({
    action: 'create',
    operator: req.body.operator || 'operator',
    recordId: enhanced[0].id,
    before: null,
    after: enhanced[0]
  });
  res.json(enhanced[0]);
});

router.put('/records/:id', (req, res) => {
  const records = getRecords();
  const idx = records.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const before = JSON.parse(JSON.stringify(records[idx]));
  const updated = {
    ...records[idx],
    ...req.body,
    raw: records[idx].raw,
    isExpired: isExpired(req.body.authorizationExpiry || records[idx].authorizationExpiry),
    status: null
  };
  updated.status = detectStatus(updated);
  records[idx] = updated;
  saveRecords(records);
  appendHistory({
    action: 'update',
    operator: req.body.operator || 'operator',
    recordId: updated.id,
    before,
    after: updated
  });
  res.json(updated);
});

router.delete('/records/:id', (req, res) => {
  const records = getRecords();
  const target = records.find((r) => r.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'not found' });
  const filtered = records.filter((r) => r.id !== req.params.id);
  saveRecords(filtered);
  appendHistory({
    action: 'delete',
    operator: 'operator',
    recordId: target.id,
    before: target,
    after: null
  });
  res.json({ ok: true });
});

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const filePath = req.file.path;
  try {
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const existing = getRecords();
    const sourceLabel = req.file.originalname;
    const enhanced = enhanceRecords(rows, sourceLabel);
    const merged = [...enhanced, ...existing];
    saveRecords(merged);
    const snapshot = createVersionSnapshot(merged, `导入 ${sourceLabel}`, req.body.operator || 'operator');
    appendHistory({
      action: 'import',
      operator: req.body.operator || 'operator',
      snapshotId: snapshot.id,
      count: enhanced.length,
      source: sourceLabel
    });
    res.json({
      imported: enhanced.length,
      total: merged.length,
      snapshotId: snapshot.id,
      records: enhanced
    });
  } catch (e) {
    console.error('[import] error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/export', (req, res) => {
  const records = getRecords();
  const exportData = records.map((r) => ({
    '作品名称': r.workTitle,
    '演唱者': r.singerName,
    '声部': r.part,
    '分账比例': r.shareRatio,
    '授权到期日': r.authorizationExpiry,
    '授权状态': r.isExpired ? '已过期' : (r.authorizationStatus || '有效'),
    '联系方式': r.contactInfo,
    '排练/授权备注': r.rehearsalNote,
    '人工备注': r.manualNote,
    '状态': r.status === 'ready' ? '可放行' : r.status === 'pending' ? '材料待补' : r.status === 'expired' ? '授权过期' : '未确认',
    '数据来源': r.source,
    '导入时间': r.importedAt
  }));
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '分账清单');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `合唱声部分账_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const asciiFallback = 'chorus-royalty.xlsx';
  const encodedFilename = encodeURIComponent(filename);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`
  );
  res.send(buf);
});

router.get('/versions', (req, res) => {
  const versions = getVersions();
  res.json(versions.map((v) => ({
    id: v.id,
    label: v.label,
    operator: v.operator,
    createdAt: v.createdAt,
    recordCount: v.recordCount
  })));
});

router.get('/versions/:id', (req, res) => {
  const versions = getVersions();
  const v = versions.find((x) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'not found' });
  res.json(v);
});

router.post('/versions/:id/restore', (req, res) => {
  const versions = getVersions();
  const v = versions.find((x) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'not found' });
  const before = getRecords();
  saveRecords(v.records);
  const snapshot = createVersionSnapshot(v.records, `恢复版本: ${v.label}`, req.body.operator || 'operator');
  appendHistory({
    action: 'restore',
    operator: req.body.operator || 'operator',
    beforeVersionCount: before.length,
    afterVersionCount: v.records.length,
    sourceVersionId: v.id,
    snapshotId: snapshot.id
  });
  res.json({ ok: true, snapshotId: snapshot.id, count: v.records.length });
});

router.post('/versions', (req, res) => {
  const records = getRecords();
  const snapshot = createVersionSnapshot(records, req.body.label || '手动快照', req.body.operator || 'operator');
  appendHistory({
    action: 'snapshot',
    operator: req.body.operator || 'operator',
    snapshotId: snapshot.id,
    count: records.length
  });
  res.json(snapshot);
});

router.get('/history', (req, res) => {
  const history = getHistory();
  const { recordId, limit } = req.query;
  let filtered = history;
  if (recordId) filtered = filtered.filter((h) => h.recordId === recordId);
  if (limit) filtered = filtered.slice(0, parseInt(limit, 10));
  res.json(filtered);
});

router.get('/summary', (req, res) => {
  const records = getRecords();
  const summary = {
    total: records.length,
    ready: records.filter((r) => r.status === 'ready').length,
    pending: records.filter((r) => r.status === 'pending').length,
    expired: records.filter((r) => r.status === 'expired').length,
    sources: {},
    byPart: {}
  };
  records.forEach((r) => {
    summary.sources[r.source] = (summary.sources[r.source] || 0) + 1;
    if (r.part) summary.byPart[r.part] = (summary.byPart[r.part] || 0) + 1;
  });
  res.json(summary);
});

router.get('/settings', (req, res) => {
  res.json(getSettings());
});

router.put('/settings', (req, res) => {
  const current = getSettings();
  const next = { ...current, ...req.body };
  saveSettings(next);
  res.json(next);
});

router.post('/screenshot', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: `/uploads/${req.file.filename}`
  });
});

export default router;
