const express = require('express');
const { authenticate, authorize, cityDataFilter, maskSensitiveData } = require('../middleware/auth');
const { ROLES } = require('../models/User');
const RefundRecord = require('../models/RefundRecord');
const dayjs = require('dayjs');

const router = express.Router();

router.use(authenticate, cityDataFilter);

router.post('/', async (req, res) => {
  try {
    const refundNo = `REF${dayjs().format('YYYYMMDD')}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const refund = new RefundRecord({
      ...req.body,
      refundNo,
      createdBy: req.user._id
    });
    await refund.save();
    res.status(201).json(refund);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, cabinetId, status, startDate, endDate } = req.query;
    const query = {};
    
    if (cabinetId) query.cabinetId = cabinetId;
    if (status) query.status = status;
    if (startDate && endDate) {
      query.refundTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const refunds = await RefundRecord.find(query)
      .sort({ refundTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name');

    const maskedRefunds = maskSensitiveData(refunds);
    const total = await RefundRecord.countDocuments(query);

    res.json({
      refunds: maskedRefunds,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const refund = await RefundRecord.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');
    
    if (!refund) {
      return res.status(404).json({ error: '退款记录不存在' });
    }
    
    const maskedRefund = maskSensitiveData(refund.toObject());
    res.json(maskedRefund);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const refund = await RefundRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!refund) {
      return res.status(404).json({ error: '退款记录不存在' });
    }
    
    res.json(refund);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/batch-import', authorize(ROLES.DATA_ENTRY, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { items } = req.body;
    const savedItems = [];

    for (const item of items) {
      const refundNo = `REF${dayjs().format('YYYYMMDD')}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const refund = new RefundRecord({
        ...item,
        refundNo,
        createdBy: req.user._id,
        source: 'import'
      });
      await refund.save();
      savedItems.push(refund);
    }

    res.json({
      message: '批量导入退款记录完成',
      totalCount: items.length,
      successCount: savedItems.length,
      savedItems
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/approve', authorize(ROLES.REVIEWER, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const refund = await RefundRecord.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ error: '退款记录不存在' });
    }

    refund.status = 'approved';
    refund.approvedBy = req.user._id;
    refund.approvedAt = new Date();
    await refund.save();

    res.json(refund);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
