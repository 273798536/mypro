const express = require('express');
const router = express.Router();
const Joi = require('joi');
const crudService = require('../services/crud-service');
const sharingService = require('../services/revenue-sharing-service');
const conflictService = require('../services/conflict-service');
const exportService = require('../services/export-service');

const projectSchema = Joi.object({
  name: Joi.string().required(),
  film_name: Joi.string().required(),
  total_budget: Joi.number().min(0).default(0),
  status: Joi.string().default('active'),
  created_by: Joi.string().default('system')
});

router.get('/', async (req, res) => {
  try {
    const projects = crudService.projects.getAll();
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = projectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const project = crudService.projects.create(value);
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = crudService.projects.getById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/summary', async (req, res) => {
  try {
    const summary = crudService.projects.getSummary(req.params.id);
    if (!summary) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { error, value } = projectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const project = crudService.projects.update(req.params.id, value);
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = crudService.projects.delete(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/conflicts', async (req, res) => {
  try {
    const conflicts = conflictService.detectAllConflicts(req.params.id);
    res.json({ success: true, data: conflicts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/merge-history', async (req, res) => {
  try {
    const history = conflictService.getMergeHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/sharing-records', async (req, res) => {
  try {
    const records = sharingService.getSharingRecords(req.params.id);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/sharing/calculate', async (req, res) => {
  try {
    const { installment_id, config, created_by } = req.body;
    if (!installment_id) {
      return res.status(400).json({ success: false, error: '缺少回款分期ID' });
    }
    const result = sharingService.calculateSharing(req.params.id, installment_id, { config, created_by });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/sharing/execute', async (req, res) => {
  try {
    const { installment_id, config, created_by } = req.body;
    if (!installment_id) {
      return res.status(400).json({ success: false, error: '缺少回款分期ID' });
    }
    const result = sharingService.executeSharing(req.params.id, installment_id, { config, created_by });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/costs/status', async (req, res) => {
  try {
    const status = sharingService.getUndeductedCosts(req.params.id);
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/monthly-report/:yearMonth', async (req, res) => {
  try {
    const report = exportService.generateMonthlyReport(req.params.id, req.params.yearMonth);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
