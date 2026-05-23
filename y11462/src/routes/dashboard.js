const express = require('express');
const router = express.Router();
const DashboardService = require('../services/dashboard.service');

router.get('/director', async (req, res) => {
  try {
    const result = await DashboardService.getDirectorDashboard();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const result = await DashboardService.getOverview();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/retryable-classification', async (req, res) => {
  try {
    const result = await DashboardService.getRetryableClassification();
    res.json({ 
      success: true, 
      data: {
        title: '可重试分类',
        description: '按材料类型和科室分类的等待重试点位',
        data: result
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dead-letter-analysis', async (req, res) => {
  try {
    const result = await DashboardService.getDeadLetterAnalysis();
    res.json({ 
      success: true, 
      data: {
        title: '死信处理',
        description: '永久失败的队列项及错误模式分析',
        ...result
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recovery-progress', async (req, res) => {
  try {
    const result = await DashboardService.getRecoveryProgress();
    res.json({ 
      success: true, 
      data: {
        title: '恢复后续跑',
        description: '今日处理进度和待恢复队列',
        ...result
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/department-distribution', async (req, res) => {
  try {
    const result = await DashboardService.getDepartmentDistribution();
    res.json({ 
      success: true, 
      data: {
        title: '科室分布',
        data: result
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/import-history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const result = await DashboardService.getImportHistory(days);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
