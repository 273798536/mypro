const express = require('express');
const router = express.Router();
const reagentService = require('../services/reagentService');

router.get('/', (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20
    };
    const result = reagentService.listReagents(params);
    res.json({ code: 0, data: result });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const reagent = reagentService.getReagent(req.params.id);
    if (!reagent) {
      return res.status(404).json({ code: 1, message: '试剂不存在' });
    }
    res.json({ code: 0, data: reagent });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const reagent = reagentService.addReagent(
      req.body,
      req.body.operator || 'engineer'
    );
    res.json({ code: 0, data: reagent });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const reagent = reagentService.updateReagent(
      req.params.id,
      req.body,
      req.body.operator || 'engineer'
    );
    res.json({ code: 0, data: reagent });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const success = reagentService.deleteReagent(
      req.params.id,
      req.body.operator || 'engineer'
    );
    res.json({ code: 0, data: { success } });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

module.exports = router;
