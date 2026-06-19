const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');

router.post('/round-summary', async (req, res) => {
  try {
    const { migration_id, round_id, generated_by } = req.body;

    if (!migration_id || !round_id || !generated_by) {
      return res.status(400).json({ error: '缺少必要参数: migration_id, round_id, generated_by' });
    }

    const report = await reportService.generateRoundSummaryReport(
      migration_id,
      round_id,
      generated_by
    );

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('生成轮次总结报告失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/lock-wait-analysis', async (req, res) => {
  try {
    const { migration_id, generated_by } = req.body;

    if (!migration_id || !generated_by) {
      return res.status(400).json({ error: '缺少必要参数: migration_id, generated_by' });
    }

    const report = await reportService.generateLockWaitAnalysisReport(
      migration_id,
      generated_by
    );

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('生成锁等待分析报告失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/conclusion-comparison', async (req, res) => {
  try {
    const { migration_id, round_id, generated_by } = req.body;

    if (!migration_id || !round_id || !generated_by) {
      return res.status(400).json({ error: '缺少必要参数: migration_id, round_id, generated_by' });
    }

    const report = await reportService.generateConclusionComparisonReport(
      migration_id,
      round_id,
      generated_by
    );

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('生成结论对比报告失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/full-audit', async (req, res) => {
  try {
    const { migration_id, generated_by } = req.body;

    if (!migration_id || !generated_by) {
      return res.status(400).json({ error: '缺少必要参数: migration_id, generated_by' });
    }

    const report = await reportService.generateFullAuditReport(
      migration_id,
      generated_by
    );

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('生成完整审计报告失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const report = await reportService.getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: '报告不存在' });
    }
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('查询报告失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { report_type, generated_by } = req.query;
    const filters = {};
    if (report_type) filters.report_type = report_type;
    if (generated_by) filters.generated_by = generated_by;

    const reports = await reportService.listReports(filters);
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error('查询报告列表失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/migration/:migrationId', async (req, res) => {
  try {
    const reports = await reportService.getReportsByMigration(req.params.migrationId);
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error('查询迁移报告失败:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
