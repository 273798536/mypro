const express = require('express');
const router = express.Router();
const AsyncTaskService = require('../services/AsyncTaskService');

router.get('/', async (req, res) => {
  try {
    const { status, taskType, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (taskType) where.task_type = taskType;

    const { AsyncTask } = require('../models');
    const { count, rows } = await AsyncTask.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: (page - 1) * pageSize
    });

    res.json({
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      data: rows.map(t => ({
        ...t.toJSON(),
        input_params: t.input_params ? JSON.parse(t.input_params) : null,
        result_data: t.result_data ? JSON.parse(t.result_data) : null
      }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { AsyncTask } = require('../models');
    const task = await AsyncTask.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    res.json({
      ...task.toJSON(),
      input_params: task.input_params ? JSON.parse(task.input_params) : null,
      result_data: task.result_data ? JSON.parse(task.result_data) : null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/retry', async (req, res) => {
  try {
    const { AsyncTask } = require('../models');
    const task = await AsyncTask.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    await task.update({
      status: 'pending',
      retry_count: 0,
      error_message: null,
      error_stack: null
    });
    res.json({ message: '任务已重置为待处理状态' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/manual', async (req, res) => {
  try {
    const { processedBy, note } = req.body;
    await AsyncTaskService.markForManual(req.params.id, note || '标记为人工处理');
    res.json({ message: '任务已标记为待人工处理' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const { AsyncTask } = require('../models');
    const { Op } = require('sequelize');
    
    const stats = await AsyncTask.findAll({
      attributes: ['status', [AsyncTask.sequelize.fn('COUNT', '*'), 'count']],
      group: ['status']
    });

    const summary = {};
    stats.forEach(s => {
      summary[s.status] = parseInt(s.dataValues.count);
    });

    res.json(summary);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
