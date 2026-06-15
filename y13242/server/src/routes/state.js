const express = require('express');
const AppState = require('../models/AppState');
const { generatePageSummary } = require('../utils/validator');

const router = express.Router();

router.get('/', (req, res) => {
  const states = AppState.getAllStates();

  if (!states.page_summary) {
    const summary = generatePageSummary();
    AppState.setState('page_summary', summary);
    states.page_summary = { value: summary, updated_at: new Date().toISOString() };
  }

  res.json({ success: true, data: states });
});

router.get('/:key', (req, res) => {
  const value = AppState.getState(req.params.key);
  if (value === null) {
    return res.status(404).json({ success: false, message: '状态不存在' });
  }
  res.json({ success: true, data: { key: req.params.key, value } });
});

router.put('/:key', (req, res) => {
  const { value } = req.body;
  const saved = AppState.setState(req.params.key, value);
  res.json({ success: true, data: { key: req.params.key, value: saved } });
});

router.delete('/:key', (req, res) => {
  const result = AppState.removeState(req.params.key);
  if (!result) {
    return res.status(404).json({ success: false, message: '状态不存在' });
  }
  res.json({ success: true });
});

router.post('/refresh-summary', (req, res) => {
  const summary = generatePageSummary();
  AppState.setState('page_summary', summary);
  res.json({ success: true, data: summary });
});

module.exports = router;
