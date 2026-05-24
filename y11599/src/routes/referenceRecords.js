const express = require('express');
const router = express.Router();
const { ReferenceRecord } = require('../models');
const taskService = require('../services/taskService');
const { setIdempotentEntity, saveIdempotentResponse } = require('../middlewares/idempotent');

function getOperator(req) {
  return {
    userId: req.headers['x-user-id'] || 'anonymous',
    userName: req.headers['x-user-name'] || '匿名用户',
    role: req.headers['x-user-role'] || 'UNKNOWN'
  };
}

router.get('/', async (req, res) => {
  try {
    const { 
      knowledgeId, 
      agentId, 
      isOfflineContent, 
      isErrorClaim,
      page = 1, 
      pageSize = 20 
    } = req.query;
    
    const where = {};
    if (knowledgeId) where.knowledgeId = knowledgeId;
    if (agentId) where.agentId = agentId;
    if (typeof isOfflineContent === 'string') where.isOfflineContent = isOfflineContent === 'true';
    if (typeof isErrorClaim === 'string') where.isErrorClaim = isErrorClaim === 'true';

    const { count, rows } = await ReferenceRecord.findAndCountAll({
      where,
      order: [['referenceTime', 'DESC']],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize)
    });

    res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(count / parseInt(pageSize)),
        list: rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const record = await ReferenceRecord.findByPk(req.params.id);
    
    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const record = await ReferenceRecord.create({
      ...req.body,
      recordNo: req.body.recordNo || taskService.generateRecordNo('REF')
    });
    
    setIdempotentEntity(req, 'REFERENCE_RECORD', record.id);
    await saveIdempotentResponse(req, record);

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { items, batchStrategy = 'IGNORE', batchId } = req.body;
    const operator = getOperator(req);

    const task = await taskService.createTask(
      'IMPORT_REFERENCES',
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

    setIdempotentEntity(req, 'ASYNC_TASK', task.id);
    await saveIdempotentResponse(req, task);

    res.json({
      success: true,
      data: {
        taskId: task.taskId,
        message: '批量导入任务已创建',
        status: task.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const record = await ReferenceRecord.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    await record.update(req.body);
    await saveIdempotentResponse(req, record);

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
