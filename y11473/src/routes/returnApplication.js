const express = require('express');
const router = express.Router();
const { ReturnApplication, QualityPhoto, LogisticsReceipt, PriceAdjustment, CorrectionHistory } = require('../models');
const ExceptionService = require('../services/ExceptionService');
const { Op } = require('sequelize');

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, batchNo, supplierCode, status, keyword } = req.query;
    const where = { is_duplicate: false };
    if (batchNo) where.batch_no = batchNo;
    if (supplierCode) where.supplier_code = supplierCode;
    if (status) where.status = status;
    if (keyword) {
      where[Op.or] = [
        { apply_no: { [Op.like]: `%${keyword}%` } },
        { sku_name: { [Op.like]: `%${keyword}%` } },
        { supplier_name: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { count, rows } = await ReturnApplication.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: (page - 1) * pageSize
    });

    res.json({ total: count, page: parseInt(page), pageSize: parseInt(pageSize), data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const application = await ReturnApplication.findByPk(req.params.id, {
      include: [
        { model: QualityPhoto, as: 'qualityPhotos' },
        { model: LogisticsReceipt, as: 'logisticsReceipts' },
        { model: PriceAdjustment, as: 'priceAdjustments' }
      ]
    });
    if (!application) return res.status(404).json({ error: '记录不存在' });

    const corrections = await CorrectionHistory.findAll({
      where: { record_type: 'ReturnApplication', record_id: req.params.id },
      order: [['created_at', 'DESC']]
    });

    res.json({
      ...application.toJSON(),
      corrections
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, supplier_confirm_quantity, process_reason, correctedBy } = req.body;
    const application = await ReturnApplication.findByPk(req.params.id);
    if (!application) return res.status(404).json({ error: '记录不存在' });

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (supplier_confirm_quantity !== undefined) {
      updates.supplier_confirm_quantity = supplier_confirm_quantity;
      updates.remaining_quantity = application.apply_quantity - supplier_confirm_quantity;
    }
    if (process_reason !== undefined) updates.process_reason = process_reason;

    for (const [key, value] of Object.entries(updates)) {
      if (application[key] !== value) {
        await CorrectionHistory.create({
          record_type: 'ReturnApplication',
          record_id: req.params.id,
          field_name: key,
          old_value: String(application[key]),
          new_value: String(value),
          correction_reason: process_reason || '手动更新',
          corrected_by: correctedBy || 'admin',
          correction_method: 'manual'
        });
      }
    }

    await application.update(updates);
    res.json(application);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const history = await CorrectionHistory.findAll({
      where: { record_type: 'ReturnApplication', record_id: req.params.id },
      order: [['created_at', 'DESC']]
    });
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/duplicates', async (req, res) => {
  try {
    const application = await ReturnApplication.findByPk(req.params.id);
    if (!application) return res.status(404).json({ error: '记录不存在' });

    const duplicates = await ReturnApplication.findAll({
      where: {
        data_hash: application.data_hash,
        id: { [Op.ne]: req.params.id }
      }
    });
    res.json(duplicates);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
