const express = require('express');
const db = require('../database/db');
const { authenticateToken, requireRole, filterFieldsByRole, createAuditLog } = require('../middleware/auth');
const config = require('../config/config');
const queueService = require('../services/queueService');
const compensationService = require('../services/compensationService');

const router = express.Router();

router.post('/submit', authenticateToken, requireRole(config.roles.DATA_ENTRY, config.roles.SUPERVISOR), async (req, res) => {
  const { work_order_id, item_type, payload, idempotent, merge_duplicates } = req.body;

  if (!work_order_id || !item_type || !payload) {
    return res.status(400).json({ error: '派工单ID、任务类型和载荷不能为空' });
  }

  const workOrder = await db.getSync('SELECT * FROM work_orders WHERE id = ?', [work_order_id]);
  if (!workOrder) {
    return res.status(404).json({ error: '派工单不存在' });
  }

  try {
    const result = await queueService.enqueue(
      work_order_id, 
      item_type, 
      payload, 
      req.user.id, 
      req.ip,
      { 
        idempotent: idempotent !== false, 
        mergeDuplicates: merge_duplicates !== false 
      }
    );
    
    if (typeof result === 'object' && (result.merged || result.duplicate)) {
      return res.status(200).json(result);
    }
    
    res.status(201).json({ id: result, message: '任务已提交到队列' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', authenticateToken, async (req, res) => {
  const status = await queueService.getQueueStatus();
  res.json(status);
});

router.get('/classification', authenticateToken, requireRole(config.roles.REVIEWER, config.roles.SUPERVISOR), async (req, res) => {
  const classification = await queueService.getRetryClassification();
  res.json(classification);
});

router.get('/failed', authenticateToken, requireRole(config.roles.REVIEWER, config.roles.SUPERVISOR), async (req, res) => {
  const items = await queueService.getFailedItemsWithDetails();
  const filtered = filterFieldsByRole(req.user.role, 'queue_items', items);
  res.json(filtered);
});

router.get('/items/:status', authenticateToken, async (req, res) => {
  const { status } = req.params;
  const { limit = 100 } = req.query;
  
  const items = await queueService.getItemsByStatus(status, parseInt(limit));
  const filtered = filterFieldsByRole(req.user.role, 'queue_items', items);
  res.json(filtered);
});

router.get('/item/:id', authenticateToken, async (req, res) => {
  const item = await db.getSync('SELECT * FROM queue_items WHERE id = ?', [req.params.id]);
  
  if (!item) {
    return res.status(404).json({ error: '队列项不存在' });
  }

  const itemWithPayload = {
    ...item,
    payload: item.payload ? JSON.parse(item.payload) : null
  };
  
  const filtered = filterFieldsByRole(req.user.role, 'queue_items', itemWithPayload);
  res.json(filtered);
});

router.get('/item/:id/history', authenticateToken, async (req, res) => {
  const history = await queueService.getItemHistory(req.params.id);
  res.json(history);
});

router.get('/item/:id/corrections', authenticateToken, requireRole(config.roles.REVIEWER, config.roles.SUPERVISOR), async (req, res) => {
  const corrections = await queueService.getCorrectionHistory(req.params.id);
  res.json(corrections);
});

router.post('/item/:id/manual', authenticateToken, requireRole(config.roles.REVIEWER, config.roles.SUPERVISOR), async (req, res) => {
  const { note } = req.body;
  
  if (!note) {
    return res.status(400).json({ error: '处理备注不能为空' });
  }

  const success = await queueService.manualHandle(req.params.id, note, req.user.id);
  
  if (success) {
    await createAuditLog(req.user.id, 'manual_handle', 'queue_items', req.params.id, { note }, req.ip);
    res.json({ message: '已标记为人工处理' });
  } else {
    res.status(404).json({ error: '队列项不存在' });
  }
});

router.post('/item/:id/correct', authenticateToken, requireRole(config.roles.REVIEWER, config.roles.SUPERVISOR), async (req, res) => {
  const { payload, correction_note } = req.body;
  
  if (!payload) {
    return res.status(400).json({ error: '修正后的载荷不能为空' });
  }

  if (!correction_note) {
    return res.status(400).json({ error: '修正说明不能为空' });
  }

  try {
    const result = await queueService.correctAndRetry(
      req.params.id, 
      payload, 
      correction_note, 
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/item/:id/reprocess', authenticateToken, requireRole(config.roles.REVIEWER, config.roles.SUPERVISOR), async (req, res) => {
  try {
    const result = await queueService.reprocess(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/item/:id/retry', authenticateToken, requireRole(config.roles.SUPERVISOR), async (req, res) => {
  const success = await queueService.retryDeadLetter(req.params.id, req.user.id);
  
  if (success) {
    await createAuditLog(req.user.id, 'retry_dead_letter', 'queue_items', req.params.id, {}, req.ip);
    res.json({ message: '已从死信队列恢复重试' });
  } else {
    res.status(400).json({ error: '队列项不存在或不是死信状态' });
  }
});

router.post('/item/:id/close', authenticateToken, requireRole(config.roles.SUPERVISOR), async (req, res) => {
  const success = await queueService.closeItem(req.params.id, req.user.id);
  
  if (success) {
    await createAuditLog(req.user.id, 'close', 'queue_items', req.params.id, {}, req.ip);
    res.json({ message: '任务已关闭' });
  } else {
    res.status(404).json({ error: '队列项不存在' });
  }
});

router.post('/item/:id/process', authenticateToken, requireRole(config.roles.SUPERVISOR), async (req, res) => {
  const item = await db.getSync('SELECT * FROM queue_items WHERE id = ?', [req.params.id]);
  
  if (!item) {
    return res.status(404).json({ error: '队列项不存在' });
  }

  try {
    const parsedItem = {
      ...item,
      payload: JSON.parse(item.payload)
    };

    await compensationService.validateAndProcess(parsedItem);
    const records = await compensationService.createCompensationRecords(
      item.id,
      parsedItem.payload.workOrderId,
      parsedItem.payload.materials,
      req.user.id
    );

    await queueService.markSuccess(item.id, req.user.id);
    
    res.json({ 
      message: '处理成功',
      compensation_records: records
    });
  } catch (error) {
    await queueService.markFailed(item.id, error, req.user.id);
    res.status(400).json({ 
      error: '处理失败',
      details: error.message
    });
  }
});

module.exports = router;
