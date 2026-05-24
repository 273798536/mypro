const express = require('express');
const router = express.Router();
const ExceptionService = require('../services/ExceptionService');

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, exceptionType, batchNo } = req.query;
    const exceptions = await ExceptionService.getExceptions({
      status,
      exceptionType,
      batchNo
    });
    
    const start = (page - 1) * pageSize;
    const end = start + parseInt(pageSize);
    
    res.json({
      total: exceptions.length,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      data: exceptions.slice(start, end)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const exception = await ExceptionService.getExceptionWithDiff(req.params.id);
    if (!exception) return res.status(404).json({ error: '异常记录不存在' });
    res.json(exception);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/correct', async (req, res) => {
  try {
    const { correction, correctedBy, correctionReason } = req.body;
    await ExceptionService.correctException(
      req.params.id,
      correction,
      correctedBy || 'admin',
      correctionReason || '人工修正'
    );
    res.json({ message: '异常已修正' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/replay', async (req, res) => {
  try {
    const success = await ExceptionService.replayException(req.params.id);
    res.json({ success, message: success ? '回放成功' : '回放失败' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const { CorrectionHistory } = require('../models');
    const history = await CorrectionHistory.findAll({
      where: { related_exception_id: req.params.id },
      order: [['created_at', 'DESC']]
    });
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const { ExceptionRecord } = require('../models');
    const stats = await ExceptionRecord.findAll({
      attributes: ['status', 'exception_type', [ExceptionRecord.sequelize.fn('COUNT', '*'), 'count']],
      group: ['status', 'exception_type']
    });
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
