const express = require('express');
const router = express.Router();
const Joi = require('joi');
const crudService = require('../services/crud-service');
const versionService = require('../services/version-service');

const contractSchema = Joi.object({
  project_id: Joi.number().required(),
  contract_no: Joi.string().required(),
  total_investment: Joi.number().min(0).default(0),
  contract_date: Joi.string().required(),
  created_by: Joi.string().default('system'),
  source_type: Joi.string().default('contract'),
  status: Joi.string().default('active'),
  investor_shares: Joi.array().items(Joi.object({
    investor_id: Joi.number().required(),
    investor_name: Joi.string(),
    investment_amount: Joi.number().min(0).default(0),
    share_ratio: Joi.number().min(0).max(1).default(0)
  }))
});

const shareUpdateSchema = Joi.object({
  shares: Joi.array().items(Joi.object({
    investor_id: Joi.number().required(),
    investor_name: Joi.string(),
    investment_amount: Joi.number().min(0).default(0),
    share_ratio: Joi.number().min(0).max(1).default(0)
  })).required(),
  changed_by: Joi.string().default('system'),
  change_reason: Joi.string().default('')
});

router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    const contracts = crudService.investmentContracts.getAll(project_id);
    res.json({ success: true, data: contracts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = contractSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const contract = crudService.investmentContracts.create(value);
    res.json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const contract = crudService.investmentContracts.getById(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }
    res.json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { error, value } = contractSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const contract = crudService.investmentContracts.update(req.params.id, value);
    res.json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/version-history', async (req, res) => {
  try {
    const history = versionService.getShareVersionHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/shares', async (req, res) => {
  try {
    const { error, value } = shareUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const result = versionService.updateInvestorShares(req.params.id, value.shares, {
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
    const result = crudService.investmentContracts.delete(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
