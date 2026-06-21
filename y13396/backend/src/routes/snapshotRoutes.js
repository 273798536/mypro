const express = require('express');
const router = express.Router();
const store = require('../store/dataStore');

router.get('/', (req, res) => {
  const { version_id, status, anomaly_type } = req.query;
  const snapshots = store.getSnapshots({ version_id, status, anomaly_type });
  res.json({ code: 0, data: snapshots });
});

router.get('/:id', (req, res) => {
  const snapshot = store.getSnapshotById(req.params.id);
  if (!snapshot) {
    return res.status(404).json({ code: 1, message: '快照不存在' });
  }
  res.json({ code: 0, data: snapshot });
});

router.patch('/:id/status', (req, res) => {
  const { status, notes } = req.body;
  const validStatuses = ['pending', 'confirmed', 'rejected', 'needs_evidence'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ code: 1, message: '无效的状态值' });
  }
  
  const snapshot = store.updateSnapshotStatus(req.params.id, status, notes);
  if (!snapshot) {
    return res.status(404).json({ code: 1, message: '快照不存在' });
  }
  
  res.json({ code: 0, data: snapshot, message: '状态更新成功' });
});

router.get('/:id/impact', (req, res) => {
  const snapshot = store.getSnapshotById(req.params.id);
  if (!snapshot) {
    return res.status(404).json({ code: 1, message: '快照不存在' });
  }
  
  const version = store.getVersionById(snapshot.version_id);
  if (!version) {
    return res.status(404).json({ code: 1, message: '所属版本不存在' });
  }
  
  const influential = store.getInfluentialSamples(snapshot.version_id);
  const isInfluential = influential.some(s => s.id === snapshot.id);
  
  res.json({
    code: 0,
    data: {
      snapshot_id: snapshot.id,
      metric_score: snapshot.metric_score,
      version_overall: version.overall_metric,
      is_influential: isInfluential,
      deviation_from_avg: snapshot.metric_score - version.overall_metric,
      deviation_percent: ((snapshot.metric_score - version.overall_metric) / version.overall_metric * 100).toFixed(2)
    }
  });
});

module.exports = router;
