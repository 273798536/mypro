const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { saveIdempotentResponse } = require('../middlewares/idempotent');

function getOperator(req) {
  return {
    userId: req.headers['x-user-id'] || 'anonymous',
    userName: req.headers['x-user-name'] || '匿名用户',
    role: req.headers['x-user-role'] || 'UNKNOWN'
  };
}

router.get('/', async (req, res) => {
  try {
    const { status, taskType, batchId, createdBy, page = 1, pageSize = 20 } = req.query;
    
    const result = await taskService.queryTasks({
      status,
      taskType,
      batchId,
      createdBy,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:taskId', async (req, res) => {
  try {
    const task = await taskService.getTaskStatus(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:taskId/retry', async (req, res) => {
  try {
    const operator = getOperator(req);
    const result = await taskService.retryTask(req.params.taskId, operator);
    
    await saveIdempotentResponse(req, result);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/import/change-orders', async (req, res) => {
  try {
    const { items, batchStrategy = 'IGNORE', batchId } = req.body;
    const operator = getOperator(req);

    const task = await taskService.createTask(
      'IMPORT_CHANGE_ORDERS',
      { items, batchStrategy },
      {
        batchId,
        userId: operator.userId,
        userName: operator.userName
      }
    );

    setImmediate(async () => {
      try {
        await taskService.processTask(task.taskId);
      } catch (e) {
        console.error('Batch import error:', e);
      }
    });

    res.json({
      success: true,
      data: {
        taskId: task.taskId,
        message: '批量导入变更单任务已创建',
        status: task.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/import/reviews', async (req, res) => {
  try {
    const { items, batchId } = req.body;
    const operator = getOperator(req);

    const task = await taskService.createTask(
      'IMPORT_REVIEWS',
      { items },
      {
        batchId,
        userId: operator.userId,
        userName: operator.userName
      }
    );

    setImmediate(async () => {
      try {
        await taskService.processTask(task.taskId);
      } catch (e) {
        console.error('Batch import error:', e);
      }
    });

    res.json({
      success: true,
      data: {
        taskId: task.taskId,
        message: '批量导入审核意见任务已创建',
        status: task.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/import/snapshots', async (req, res) => {
  try {
    const { items, batchStrategy = 'IGNORE', batchId } = req.body;
    const operator = getOperator(req);

    const task = await taskService.createTask(
      'IMPORT_SNAPSHOTS',
      { items, batchStrategy },
      {
        batchId,
        userId: operator.userId,
        userName: operator.userName
      }
    );

    setImmediate(async () => {
      try {
        await taskService.processTask(task.taskId);
      } catch (e) {
        console.error('Batch import error:', e);
      }
    });

    res.json({
      success: true,
      data: {
        taskId: task.taskId,
        message: '批量导入快照任务已创建',
        status: task.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
