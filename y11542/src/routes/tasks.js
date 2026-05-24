const express = require('express');
const router = express.Router();
const TaskService = require('../services/TaskService');
const ImportService = require('../services/ImportService');
const QueueProcessor = require('../services/QueueProcessor');
const { TASK_STATUS, FAILURE_TYPE } = require('../utils/constants');

router.post('/submit', async (req, res) => {
  try {
    const { material_id, audit_result, cost_report, supplier_statement } = req.body;

    if (!material_id) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段: material_id'
      });
    }

    const task = await TaskService.createTask({
      material_id,
      audit_result,
      cost_report,
      supplier_statement
    });

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('提交任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, material_id, failure_type, limit, offset } = req.query;
    
    const tasks = await TaskService.getTasks({
      status,
      material_id,
      failure_type,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('查询任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:taskId', async (req, res) => {
  try {
    const task = await TaskService.getTaskById(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    const rawImport = await ImportService.getTaskRawImport(req.params.taskId);
    const history = await TaskService.getTaskHistory(req.params.taskId);

    res.json({
      success: true,
      data: {
        task,
        rawImport,
        history
      }
    });
  } catch (error) {
    console.error('查询任务详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:taskId/manual-takeover', async (req, res) => {
  try {
    const { handler, note } = req.body;
    
    if (!handler) {
      return res.status(400).json({
        success: false,
        error: '缺少处理人信息'
      });
    }

    const task = await TaskService.manualTakeover(req.params.taskId, handler, note);

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('人工接管失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:taskId/compensate', async (req, res) => {
  try {
    const { amount, note, operator } = req.body;
    
    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        error: '缺少补偿金额'
      });
    }

    const task = await TaskService.compensateTask(
      req.params.taskId,
      parseFloat(amount),
      note || '',
      operator || 'system'
    );

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('补偿入账失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:taskId/close', async (req, res) => {
  try {
    const { reason, operator } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: '缺少关闭原因'
      });
    }

    const task = await TaskService.closeTask(
      req.params.taskId,
      reason,
      operator || 'system'
    );

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('关闭任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:taskId/trigger', async (req, res) => {
  try {
    const result = await QueueProcessor.triggerTask(req.params.taskId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('触发任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:taskId/history', async (req, res) => {
  try {
    const history = await TaskService.getTaskHistory(req.params.taskId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('查询任务历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/statistics/summary', async (req, res) => {
  try {
    const stats = await TaskService.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;