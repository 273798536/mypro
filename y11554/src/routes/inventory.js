const express = require('express');
const { authenticate, authorize, cityDataFilter } = require('../middleware/auth');
const { ROLES } = require('../models/User');
const CabinetInventory = require('../models/CabinetInventory');
const { checkBatchDuplicateImport } = require('../services/autoCheckService');

const router = express.Router();

router.use(authenticate, cityDataFilter);

const WRITE_ROLES = [ROLES.DATA_ENTRY, ROLES.REVIEWER, ROLES.SUPERVISOR];

router.post('/', authorize(...WRITE_ROLES), async (req, res) => {
  try {
    const inventory = new CabinetInventory({
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });
    await inventory.save();
    res.status(201).json(inventory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, cabinetId, city } = req.query;
    const query = {};
    
    if (cabinetId) query.cabinetId = cabinetId;
    if (city) query.city = city;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const inventories = await CabinetInventory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name');

    const total = await CabinetInventory.countDocuments(query);

    res.json({
      inventories,
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
    const inventory = await CabinetInventory.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');
    
    if (!inventory) {
      return res.status(404).json({ error: '库存记录不存在' });
    }
    
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authorize(...WRITE_ROLES), async (req, res) => {
  try {
    const inventory = await CabinetInventory.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id
      },
      { new: true }
    );
    
    if (!inventory) {
      return res.status(404).json({ error: '库存记录不存在' });
    }
    
    res.json(inventory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/batch-import', authorize(ROLES.DATA_ENTRY, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { items } = req.body;
    
    const duplicateCheck = await checkBatchDuplicateImport(
      'inventory',
      'cabinetId',
      items
    );

    const validItems = duplicateCheck.hasIssue
      ? items.filter(item => !duplicateCheck.issues.find(i => i.item.cabinetId === item.cabinetId))
      : items;

    const savedItems = [];
    for (const item of validItems) {
      const inventory = new CabinetInventory({
        ...item,
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
      await inventory.save();
      savedItems.push(inventory);
    }

    res.json({
      message: '批量导入完成',
      totalCount: items.length,
      successCount: savedItems.length,
      duplicateCount: duplicateCheck.duplicateCount,
      duplicates: duplicateCheck.issues,
      savedItems
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
