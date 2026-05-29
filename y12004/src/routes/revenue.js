const express = require('express');
const router = express.Router();
const Joi = require('joi');
const crudService = require('../services/crud-service');
const versionService = require('../services/version-service');

const revenuePlanSchema = Joi.object({
  project_id: Joi.number().required(),
  revenue_type: Joi.string().valid('box_office', 'online_copyright', 'advertising', 'other').required(),
  total_amount: Joi.number().min(0).default(0),
  expected_date: Joi.string(),
  created_by: Joi.string().default('system'),
  source_type: Joi.string().default('plan'),
  status: Joi.string().default('pending'),
  installments: Joi.array().items(Joi.object({
    installment_no: Joi.number(),
    amount: Joi.number().min(0).default(0),
    expected_date: Joi.string(),
    status: Joi.string().default('pending')
  }))
});

const installmentUpdateSchema = Joi.object({
  amount: Joi.number().min(0),
  expected_date: Joi.string(),
  actual_amount: Joi.number().min(0),
  actual_date: Joi.string(),
  installment_no: Joi.number(),
  status: Joi.string(),
  changed_by: Joi.string().default('system'),
  change_reason: Joi.string().default('')
});

const actualRecordSchema = Joi.object({
  actual_date: Joi.string().required(),
  actual_amount: Joi.number().min(0).required(),
  status: Joi.string().default('received')
});

router.get('/plans', async (req, res) => {
  try {
    const { project_id } = req.query;
    const plans = crudService.revenuePlans.getAll(project_id);
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const { error, value } = revenuePlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const plan = crudService.revenuePlans.create(value);
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/plans/:id', async (req, res) => {
  try {
    const plan = crudService.revenuePlans.getById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, error: '回款计划不存在' });
    }
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const { error, value } = revenuePlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const plan = crudService.revenuePlans.update(req.params.id, value);
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    const result = crudService.revenuePlans.delete(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/plans/:planId/installments', async (req, res) => {
  try {
    const installments = crudService.revenueInstallments.getByPlanId(req.params.planId);
    res.json({ success: true, data: installments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/installments', async (req, res) => {
  try {
    const schema = Joi.object({
      revenue_plan_id: Joi.number().required(),
      installment_no: Joi.number().required(),
      amount: Joi.number().min(0).default(0),
      expected_date: Joi.string(),
      actual_date: Joi.string(),
      actual_amount: Joi.number().min(0).default(0),
      status: Joi.string().default('pending')
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const installment = crudService.revenueInstallments.create(value);
    res.json({ success: true, data: installment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/installments/:id', async (req, res) => {
  try {
    const installment = crudService.revenueInstallments.getById(req.params.id);
    if (!installment) {
      return res.status(404).json({ success: false, error: '回款分期不存在' });
    }
    res.json({ success: true, data: installment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/installments/:id/version-chain', async (req, res) => {
  try {
    const chain = versionService.getRecordVersionChain('revenue_installments', req.params.id);
    res.json({ success: true, data: chain });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/installments/:id', async (req, res) => {
  try {
    const { error, value } = installmentUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const result = versionService.updateRevenueInstallment(req.params.id, value, {
      changed_by: value.changed_by,
      change_reason: value.change_reason
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/installments/:id/actual', async (req, res) => {
  try {
    const { error, value } = actualRecordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const result = crudService.revenueInstallments.recordActual(req.params.id, value);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
