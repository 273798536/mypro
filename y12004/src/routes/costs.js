const express = require('express');
const router = express.Router();
const Joi = require('joi');
const crudService = require('../services/crud-service');
const versionService = require('../services/version-service');

const costSchema = Joi.object({
  project_id: Joi.number().required(),
  cost_type: Joi.string().required(),
  amount: Joi.number().min(0).default(0),
  cost_date: Joi.string(),
  description: Joi.string().default(''),
  is_deductible: Joi.boolean().default(true),
  created_by: Joi.string().default('system')
});

const costUpdateSchema = Joi.object({
  cost_type: Joi.string(),
  amount: Joi.number().min(0),
  cost_date: Joi.string(),
  description: Joi.string(),
  is_deductible: Joi.boolean(),
  changed_by: Joi.string().default('system'),
  change_reason: Joi.string().default('')
});

router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
      return res.status(400).json({ success: false, error: '缺少项目ID' });
    }
    const costs = crudService.costItems.getByProjectId(project_id);
    res.json({ success: true, data: costs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = costSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const cost = crudService.costItems.create({
      ...value,
      is_deductible: value.is_deductible ? 1 : 0
    });
    res.json({ success: true, data: cost });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cost = crudService.costItems.getById(req.params.id);
    if (!cost) {
      return res.status(404).json({ success: false, error: '成本记录不存在' });
    }
    res.json({ success: true, data: cost });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/version-chain', async (req, res) => {
  try {
    const chain = versionService.getRecordVersionChain('cost_items', req.params.id);
    res.json({ success: true, data: chain });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { error, value } = costUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const updateData = { ...value };
    if (value.is_deductible !== undefined) {
      updateData.is_deductible = value.is_deductible ? 1 : 0;
    }
    const result = versionService.updateCostItem(req.params.id, updateData, {
      changed_by: value.changed_by,
      change_reason: value.change_reason
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = crudService.costItems.delete(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
