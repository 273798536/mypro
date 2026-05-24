const express = require('express');
const router = express.Router();
const { ChangeOrder } = require('../models');
const workflowService = require('../services/workflowService');
const auditService = require('../services/auditService');
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
    const { status, knowledgeId, applicantId, page = 1, pageSize = 20 } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (knowledgeId) where.knowledgeId = knowledgeId;
    if (applicantId) where.applicantId = applicantId;

    const { count, rows } = await ChangeOrder.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
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
    const changeOrder = await ChangeOrder.findByPk(req.params.id, {
      include: [{ all: true }]
    });
    
    if (!changeOrder) {
      return res.status(404).json({ success: false, error: '变更单不存在' });
    }

    res.json({ success: true, data: changeOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const history = await auditService.getEntityHistory('CHANGE_ORDER', req.params.id);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const operator = getOperator(req);
    const changeOrder = await workflowService.createDraft(req.body, operator);
    
    setIdempotentEntity(req, 'CHANGE_ORDER', changeOrder.id);
    await saveIdempotentResponse(req, changeOrder);

    res.status(201).json({ success: true, data: changeOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const operator = getOperator(req);
    const changeOrder = await workflowService.updateDraft(req.params.id, req.body, operator);
    
    await saveIdempotentResponse(req, changeOrder);
    res.json({ success: true, data: changeOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const operator = getOperator(req);
    const changeOrder = await workflowService.submitChangeOrder(req.params.id, req.body, operator);
    
    await saveIdempotentResponse(req, changeOrder);
    res.json({ success: true, data: changeOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const operator = getOperator(req);
    const changeOrder = await workflowService.rejectChangeOrder(req.params.id, req.body, operator);
    
    await saveIdempotentResponse(req, changeOrder);
    res.json({ success: true, data: changeOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:id/confirm', async (req, res) => {
  try {
    const operator = getOperator(req);
    const changeOrder = await workflowService.confirmChangeOrder(req.params.id, req.body, operator);
    
    await saveIdempotentResponse(req, changeOrder);
    res.json({ success: true, data: changeOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:id/audit', async (req, res) => {
  try {
    const operator = getOperator(req);
    const changeOrder = await workflowService.auditChangeOrder(req.params.id, req.body, operator);
    
    await saveIdempotentResponse(req, changeOrder);
    res.json({ success: true, data: changeOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:id/version', async (req, res) => {
  try {
    const operator = getOperator(req);
    const changeOrder = await workflowService.createNewVersion(req.params.id, req.body, operator);
    
    setIdempotentEntity(req, 'CHANGE_ORDER', changeOrder.id);
    await saveIdempotentResponse(req, changeOrder);
    
    res.status(201).json({ success: true, data: changeOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
