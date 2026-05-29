const express = require('express');
const router = express.Router();
const Joi = require('joi');
const crudService = require('../services/crud-service');
const sharingService = require('../services/revenue-sharing-service');

const investorSchema = Joi.object({
  name: Joi.string().required(),
  contact: Joi.string().allow(null, '')
});

router.get('/', async (req, res) => {
  try {
    const investors = crudService.investors.getAll();
    res.json({ success: true, data: investors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = investorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const investor = crudService.investors.create(value);
    res.json({ success: true, data: investor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const investor = crudService.investors.getById(req.params.id);
    if (!investor) {
      return res.status(404).json({ success: false, error: '投资人不存在' });
    }
    res.json({ success: true, data: investor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/distributions', async (req, res) => {
  try {
    const { project_id } = req.query;
    const distributions = sharingService.getInvestorTotalDistributions(req.params.id, project_id);
    res.json({ success: true, data: distributions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { error, value } = investorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const investor = crudService.investors.update(req.params.id, value);
    res.json({ success: true, data: investor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = crudService.investors.delete(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
