const express = require('express');
const router = express.Router();
const conversionService = require('../services/conversionService');

router.get('/', (req, res) => {
  try {
    const params = {
      status: req.query.status || null,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20
    };
    const result = conversionService.listConversions(params);
    res.json({ code: 0, data: result });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.get('/unusable', (req, res) => {
  try {
    const records = conversionService.listUnusableRecords();
    res.json({ code: 0, data: records });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const record = conversionService.getConversion(req.params.id);
    if (!record) {
      return res.status(404).json({ code: 1, message: '换算记录不存在' });
    }
    res.json({ code: 0, data: record });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { sample_id, reagent_id, operator } = req.body;
    if (!sample_id) {
      return res.status(400).json({ code: 1, message: '样品ID不能为空' });
    }
    const record = conversionService.createConversion(
      sample_id,
      { reagent_id },
      operator || 'student'
    );
    res.json({ code: 0, data: record });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.post('/:id/calculate', (req, res) => {
  try {
    const record = conversionService.calculate(
      req.params.id,
      req.body,
      req.body.operator || 'student'
    );
    res.json({ code: 0, data: record });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.post('/:id/submit', (req, res) => {
  try {
    const record = conversionService.submitForReview(
      req.params.id,
      req.body.operator || 'student'
    );
    res.json({ code: 0, data: record });
  } catch (e) {
    res.status(400).json({ code: 1, message: e.message });
  }
});

module.exports = router;
