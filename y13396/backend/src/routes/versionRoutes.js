const express = require('express');
const router = express.Router();
const store = require('../store/dataStore');

router.get('/', (req, res) => {
  const versions = store.getVersions();
  res.json({ code: 0, data: versions });
});

router.get('/:id', (req, res) => {
  const version = store.getVersionById(req.params.id);
  if (!version) {
    return res.status(404).json({ code: 1, message: '版本不存在' });
  }
  res.json({ code: 0, data: version });
});

router.post('/', (req, res) => {
  const { version_name } = req.body;
  if (!version_name) {
    return res.status(400).json({ code: 1, message: '版本名称不能为空' });
  }
  const version = store.createVersion(version_name);
  res.status(201).json({ code: 0, data: version, message: '版本创建成功' });
});

router.patch('/:id/status', (req, res) => {
  const { status, notes } = req.body;
  const validStatuses = ['processing', 'pending_confirmation', 'pending_review', 'completed', 'needs_evidence'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ code: 1, message: '无效的状态值' });
  }
  
  const version = store.updateVersionStatus(req.params.id, status, notes);
  if (!version) {
    return res.status(404).json({ code: 1, message: '版本不存在' });
  }
  
  res.json({ code: 0, data: version, message: '状态更新成功' });
});

router.get('/:id/anomalies', (req, res) => {
  const version = store.getVersionById(req.params.id);
  if (!version) {
    return res.status(404).json({ code: 1, message: '版本不存在' });
  }
  
  const anomalies = store.detectAnomalies(req.params.id);
  
  const summary = {
    total_anomalies: anomalies.length,
    by_type: {
      name_mismatch: anomalies.filter(a => a.type === 'name_mismatch').length,
      duplicate_run_id: anomalies.filter(a => a.type === 'duplicate_run_id').length
    },
    impact_scope: {
      affected_snapshots: new Set(anomalies.flatMap(a => a.snapshot_ids || [a.snapshot_id])).size,
      affected_run_ids: new Set(anomalies.map(a => a.run_id)).size
    }
  };
  
  res.json({
    code: 0,
    data: {
      summary,
      anomalies,
      reason: '检测到异常项，版本进入待确认状态，请核查原因后再继续计算',
      suggestion: '建议先处理名称不一致和run_id重复的问题，确认数据有效性后再进行版本评估'
    }
  });
});

router.get('/:id/influential-samples', (req, res) => {
  const version = store.getVersionById(req.params.id);
  if (!version) {
    return res.status(404).json({ code: 1, message: '版本不存在' });
  }
  
  const { threshold } = req.query;
  const samples = store.getInfluentialSamples(req.params.id, threshold ? parseFloat(threshold) : 0.8);
  
  res.json({
    code: 0,
    data: {
      version_id: req.params.id,
      overall_metric: version.overall_metric,
      total_influential: samples.length,
      samples: samples
    }
  });
});

router.get('/:id/progress', (req, res) => {
  const version = store.getVersionById(req.params.id);
  if (!version) {
    return res.status(404).json({ code: 1, message: '版本不存在' });
  }
  
  const snapshots = store.getSnapshots({ version_id: req.params.id });
  
  const progress = {
    total: snapshots.length,
    confirmed: snapshots.filter(s => s.status === 'confirmed').length,
    pending: snapshots.filter(s => s.status === 'pending').length,
    needs_evidence: snapshots.filter(s => s.status === 'needs_evidence').length,
    rejected: snapshots.filter(s => s.status === 'rejected').length,
    processed_percent: snapshots.length > 0 
      ? Math.round((snapshots.filter(s => s.status === 'confirmed' || s.status === 'rejected').length / snapshots.length) * 100)
      : 0
  };
  
  res.json({
    code: 0,
    data: {
      version_id: version.id,
      status: version.status,
      progress
    }
  });
});

module.exports = router;
