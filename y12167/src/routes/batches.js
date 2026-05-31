const express = require('express');
const router = express.Router();
const storage = require('../models/storage');
const analyzer = require('../analysis/thermalAnalyzer');

router.post('/', (req, res) => {
  const { temperaturePoints, powerLevel, turntableRotation } = req.body;
  
  const batch = storage.createBatch({
    temperaturePoints: temperaturePoints || [],
    powerLevel: powerLevel !== undefined ? powerLevel : null,
    turntableRotation: turntableRotation !== undefined ? turntableRotation : true
  });
  
  const analysis = analyzer.analyzeBatch(batch);
  const updatedBatch = storage.updateBatch(batch.id, {
    analysis,
    anomalies: analysis.anomalies
  });
  
  res.status(201).json({
    success: true,
    batch: updatedBatch
  });
});

router.get('/', (req, res) => {
  const batches = storage.listBatches();
  res.json({
    success: true,
    batches: batches.map(b => ({
      id: b.id,
      status: b.status,
      score: b.analysis ? b.analysis.score : null,
      pass: b.analysis ? b.analysis.pass : null,
      createdAt: b.createdAt,
      version: b.version
    }))
  });
});

router.get('/:batchId', (req, res) => {
  const batch = storage.getBatch(req.params.batchId);
  if (!batch) {
    return res.status(404).json({ success: false, error: '批次不存在' });
  }
  res.json({ success: true, batch });
});

router.get('/:batchId/export', (req, res) => {
  const batch = storage.getBatch(req.params.batchId);
  if (!batch) {
    return res.status(404).json({ success: false, error: '批次不存在' });
  }
  
  const exportData = {
    exportTime: new Date().toISOString(),
    batchId: batch.id,
    version: batch.version,
    status: batch.status,
    powerLevel: batch.powerLevel,
    turntableRotation: batch.turntableRotation,
    foodDimensions: batch.foodDimensions,
    analysis: batch.analysis,
    temperaturePoints: batch.temperaturePoints,
    reviewNotes: batch.reviewNotes
  };
  
  const fileName = `uniformity_report_${batch.id}_v${batch.version}.json`;
  
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.json(exportData);
});

router.patch('/:batchId/food-dimensions', (req, res) => {
  const batch = storage.getBatch(req.params.batchId);
  if (!batch) {
    return res.status(404).json({ success: false, error: '批次不存在' });
  }
  
  const { width, depth, height } = req.body;
  if (!width || !depth || !height) {
    return res.status(400).json({ success: false, error: '请提供完整的食物尺寸：width, depth, height' });
  }
  
  const oldAnalysis = batch.analysis;
  const oldFoodDimensions = batch.foodDimensions;
  
  const updatedBatch = storage.updateBatch(req.params.batchId, {
    foodDimensions: { width, depth, height }
  });
  
  const newAnalysis = analyzer.analyzeBatch(updatedBatch);
  const finalBatch = storage.updateBatch(req.params.batchId, {
    analysis: newAnalysis,
    anomalies: newAnalysis.anomalies
  });
  
  const comparison = analyzer.compareAnalyses(oldAnalysis, newAnalysis);
  
  res.json({
    success: true,
    batch: finalBatch,
    changes: {
      field: 'foodDimensions',
      oldValue: oldFoodDimensions,
      newValue: { width, depth, height },
      analysisChanges: comparison
    }
  });
});

router.post('/:batchId/review', (req, res) => {
  const batch = storage.getBatch(req.params.batchId);
  if (!batch) {
    return res.status(404).json({ success: false, error: '批次不存在' });
  }
  
  const { reviewNotes, status } = req.body;
  
  const updates = {};
  if (reviewNotes !== undefined) {
    updates.reviewNotes = reviewNotes;
  }
  if (status) {
    updates.status = status;
  }
  
  const updatedBatch = storage.updateBatch(req.params.batchId, updates);
  
  res.json({
    success: true,
    batch: updatedBatch
  });
});

router.get('/:batchId/versions', (req, res) => {
  const versions = storage.getBatchVersions(req.params.batchId);
  res.json({
    success: true,
    versions: versions.map(v => ({
      version: v.version,
      timestamp: v.timestamp,
      score: v.data.analysis ? v.data.analysis.score : null
    }))
  });
});

router.get('/:batchId/compare/:v1/:v2', (req, res) => {
  const { batchId, v1, v2 } = req.params;
  const comparison = storage.compareVersions(batchId, parseInt(v1), parseInt(v2));
  
  if (!comparison) {
    return res.status(404).json({ success: false, error: '版本不存在' });
  }
  
  const versions = storage.getBatchVersions(batchId);
  const version1 = versions.find(v => v.version === parseInt(v1));
  const version2 = versions.find(v => v.version === parseInt(v2));
  
  let analysisComparison = null;
  if (version1.data.analysis && version2.data.analysis) {
    analysisComparison = analyzer.compareAnalyses(
      version1.data.analysis, version2.data.analysis);
  }
  
  res.json({
    success: true,
    versionChanges: comparison,
    analysisComparison
  });
});

router.post('/:batchId/reanalyze', (req, res) => {
  const batch = storage.getBatch(req.params.batchId);
  if (!batch) {
    return res.status(404).json({ success: false, error: '批次不存在' });
  }
  
  const oldAnalysis = batch.analysis;
  const newAnalysis = analyzer.analyzeBatch(batch);
  
  if (oldAnalysis && oldAnalysis.inputHash === newAnalysis.inputHash) {
    return res.json({
      success: true,
      reanalyzed: false,
      message: '输入数据未变化，无需重新分析',
      batch
    });
  }
  
  const updatedBatch = storage.updateBatch(req.params.batchId, {
    analysis: newAnalysis,
    anomalies: newAnalysis.anomalies
  });
  
  res.json({
    success: true,
    reanalyzed: true,
    batch: updatedBatch
  });
});

module.exports = router;
