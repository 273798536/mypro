const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const trackService = require('./services/trackService');
const anomalyService = require('./services/anomalyService');
const csvService = require('./services/csvService');
const alignService = require('./services/alignService');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

function getOperator(req) {
  return req.headers['x-operator'] || req.query.operator || 'system';
}

router.get('/health', (req, res) => {
  res.json({ ok: true, service: '剧场返场曲异常提醒系统', time: new Date().toISOString() });
});

router.get('/stats', (req, res) => {
  res.json(trackService.getStatistics());
});

router.get('/tracks', (req, res) => {
  const params = {
    status: req.query.status,
    is_encore: req.query.is_encore,
    anomaly_only: req.query.anomaly_only === '1' || req.query.anomaly_only === 'true',
    keyword: req.query.keyword,
    offset: parseInt(req.query.offset || '0', 10),
    limit: parseInt(req.query.limit || '100', 10),
  };
  const list = trackService.listTracks(params);
  const total = trackService.countTracks(params);
  res.json({ list, total, params });
});

router.get('/tracks/:id', (req, res) => {
  const t = trackService.getTrack(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

router.post('/tracks', (req, res) => {
  const op = getOperator(req);
  const t = trackService.createTrack(req.body || {}, op);
  res.json(t);
});

router.put('/tracks/:id', (req, res) => {
  const op = getOperator(req);
  const reason = req.body && req.body._reason ? req.body._reason : null;
  const data = { ...req.body };
  delete data._reason;
  const t = trackService.updateTrack(req.params.id, data, op, reason);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

router.delete('/tracks/:id', (req, res) => {
  const r = trackService.deleteTrack(req.params.id);
  res.json({ deleted: r.changes });
});

router.get('/tracks/:id/history', (req, res) => {
  res.json(trackService.getTrackHistory(req.params.id));
});

router.get('/tracks/:id/history.csv', (req, res) => {
  const csv = csvService.exportHistoryToCsv(req.params.id);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="track_${req.params.id}_history.csv"`);
  res.send(csv);
});

router.get('/alerts', (req, res) => {
  const params = {
    resolved: req.query.resolved,
    alert_level: req.query.alert_level,
    track_id: req.query.track_id,
  };
  res.json(anomalyService.listAlerts(params));
});

router.post('/alerts/:id/resolve', (req, res) => {
  const op = getOperator(req);
  anomalyService.resolveAlert(req.params.id, op, (req.body || {}).remark);
  res.json({ ok: true });
});

router.post('/checks/run', (req, res) => {
  res.json(anomalyService.runAllChecks());
});

router.get('/conflicts', (req, res) => {
  res.json(anomalyService.listConflicts({ resolved: req.query.resolved }));
});

router.post('/conflicts/:id/resolve', (req, res) => {
  const body = req.body || {};
  const r = anomalyService.resolveConflict(req.params.id, body.remark, body.keep_track_id);
  if (r === null) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

router.post('/csv/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  try {
    const op = getOperator(req);
    const result = csvService.importFromCsv(req.file.path, {
      source: req.body.source || 'CSV上传',
      sourceType: req.body.source_type || 'csv_upload',
      operator: op,
    });
    anomalyService.runAllChecks();
    res.json(result);
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      setTimeout(() => { try { fs.unlinkSync(req.file.path); } catch {} }, 60000);
    }
  }
});

router.get('/csv/export', (req, res) => {
  const csv = csvService.exportTracksToCsv({
    anomaly_only: req.query.anomaly_only === '1',
    status: req.query.status,
    is_encore: req.query.is_encore,
  });
  const suffix = req.query.anomaly_only === '1' ? '_anomaly' : '';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="tracks${suffix}_${Date.now()}.csv"`);
  res.send(csv);
});

router.get('/csv/export-conflicts', (req, res) => {
  const csv = csvService.exportConflictsToCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="alias_conflicts_${Date.now()}.csv"`);
  res.send(csv);
});

router.post('/align/auth', (req, res) => {
  const op = getOperator(req);
  res.json(alignService.realignByAuthRemark((req.body || {}).pattern, op));
});

router.post('/align/reconcile', (req, res) => {
  const op = getOperator(req);
  res.json(alignService.reconcileAll(op));
});

router.post('/batch/update', (req, res) => {
  const op = getOperator(req);
  const body = req.body || {};
  res.json(alignService.batchUpdateByTrackName(body.name_pattern, body.updates || {}, op, body.reason));
});

router.get('/field-aliases', (req, res) => {
  res.json(csvService.FIELD_ALIASES);
});

module.exports = router;
