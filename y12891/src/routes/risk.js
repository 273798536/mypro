const express = require('express');
const router = express.Router();
const riskService = require('../services/riskService');

router.post('/:batchId/assess', (req, res) => {
  try {
    const { assessor, version } = req.body;
    const result = riskService.assessRisk(
      req.params.batchId,
      assessor || '系统',
      version ? parseInt(version) : null
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/latest', (req, res) => {
  try {
    const assessment = riskService.getLatestAssessment(req.params.batchId);
    if (!assessment) {
      return res.status(404).json({ success: false, error: '暂无风险评估结果' });
    }
    res.json({ success: true, data: assessment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/version/:version', (req, res) => {
  try {
    const assessment = riskService.getAssessmentByVersion(
      req.params.batchId,
      parseInt(req.params.version)
    );
    if (!assessment) {
      return res.status(404).json({ success: false, error: '该版本的风险评估不存在' });
    }
    res.json({ success: true, data: assessment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/compare', (req, res) => {
  try {
    const { versionA, versionB } = req.query;
    if (!versionA || !versionB) {
      return res.status(400).json({ success: false, error: '请提供两个版本号进行对比' });
    }
    const comparison = riskService.compareRiskVersions(
      req.params.batchId,
      parseInt(versionA),
      parseInt(versionB)
    );
    res.json({ success: true, data: comparison });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/all', (req, res) => {
  try {
    const assessments = riskService.getAllAssessments(req.params.batchId);
    res.json({ success: true, data: assessments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
