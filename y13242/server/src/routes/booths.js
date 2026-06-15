const express = require('express');
const Booth = require('../models/Booth');
const { generatePageSummary, detectIssues } = require('../utils/validator');
const AppState = require('../models/AppState');

const router = express.Router();

router.get('/', (req, res) => {
  const booths = Booth.getAll();
  res.json({ success: true, data: booths });
});

router.get('/scan/issues', (req, res) => {
  const issues = detectIssues();
  AppState.setState('page_summary', generatePageSummary());
  AppState.setState('last_scan_time', new Date().toISOString());
  res.json({ success: true, data: issues });
});

router.get('/scan/summary', (req, res) => {
  const summary = generatePageSummary();
  AppState.setState('page_summary', summary);
  res.json({ success: true, data: summary });
});

router.get('/:id', (req, res) => {
  const booth = Booth.getById(req.params.id);
  if (!booth) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }

  const notes = Booth.getNotes(req.params.id);
  const history = Booth.getHistory(req.params.id);

  res.json({
    success: true,
    data: {
      ...booth,
      notes,
      history,
    },
  });
});

router.post('/', (req, res) => {
  const { operator } = req.body;
  const data = req.body;
  const booth = Booth.create(data, operator);
  AppState.setState('page_summary', generatePageSummary());
  res.status(201).json({ success: true, data: booth });
});

router.put('/:id', (req, res) => {
  const { operator, comment, ...data } = req.body;
  const booth = Booth.update(req.params.id, data, operator, comment);
  if (!booth) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  AppState.setState('page_summary', generatePageSummary());
  res.json({ success: true, data: booth });
});

router.delete('/:id', (req, res) => {
  const result = Booth.remove(req.params.id);
  if (!result) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  AppState.setState('page_summary', generatePageSummary());
  res.json({ success: true });
});

router.post('/:id/notes', (req, res) => {
  const { note_type, content, author } = req.body;
  if (!note_type || !content) {
    return res.status(400).json({ success: false, message: '缺少备注类型或内容' });
  }
  const note = Booth.addNote(req.params.id, note_type, content, author);
  res.status(201).json({ success: true, data: note });
});

router.get('/:id/notes', (req, res) => {
  const notes = Booth.getNotes(req.params.id);
  res.json({ success: true, data: notes });
});

router.get('/:id/history', (req, res) => {
  const history = Booth.getHistory(req.params.id);
  res.json({ success: true, data: history });
});

module.exports = router;
