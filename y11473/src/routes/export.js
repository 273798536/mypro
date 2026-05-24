const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ExportService = require('../services/ExportService');
const AsyncTaskService = require('../services/AsyncTaskService');

const exportDir = path.join(__dirname, '../../exports');
fs.mkdirSync(exportDir, { recursive: true });

router.post('/return-applications', async (req, res) => {
  try {
    const task = await AsyncTaskService.createTask(
      'export', '导出退供申请数据',
      { filters: req.body.filters || {} },
      { createdBy: req.user || 'api' }
    );
    res.json({ taskId: task.id, message: '导出任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/exceptions', async (req, res) => {
  try {
    const task = await AsyncTaskService.createTask(
      'export', '导出异常记录',
      { filters: req.body.filters || {} },
      { createdBy: req.user || 'api' }
    );
    res.json({ taskId: task.id, message: '导出任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/all', async (req, res) => {
  try {
    const task = await AsyncTaskService.createTask(
      'export', '导出全部数据',
      { filters: req.body.filters || {}, exportAll: true },
      { createdBy: req.user || 'api', priority: 6 }
    );
    res.json({ taskId: task.id, message: '全量导出任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/reconciliation/:batchNo?', async (req, res) => {
  try {
    const { batchNo } = req.params;
    const task = await AsyncTaskService.createTask(
      'export', `导出对账报告${batchNo ? ': ' + batchNo : ''}`,
      { batchNo },
      { createdBy: req.user || 'api' }
    );
    res.json({ taskId: task.id, message: '对账报告导出任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/download/:filename', (req, res) => {
  const filePath = path.join(exportDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: '文件不存在' });
  }
});

router.get('/files', async (req, res) => {
  try {
    const files = fs.readdirSync(exportDir)
      .filter(f => f.endsWith('.csv') || f.endsWith('.zip') || f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(exportDir, f));
        return {
          filename: f,
          size: stat.size,
          createdAt: stat.birthtime,
          downloadUrl: `/api/export/download/${f}`
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
