const express = require('express');
const router = express.Router();
const { WarehouseStore, ShelfStore, ZoneStore } = require('../utils/storage');
const { validateWarehouse, validateShelves } = require('../utils/validation');
const config = require('../../config.json');

const warehouseStore = new WarehouseStore();
const shelfStore = new ShelfStore();
const zoneStore = new ZoneStore();

router.post('/warehouses', (req, res) => {
  const warehouse = req.body;
  
  const validation = validateWarehouse(warehouse, config);
  if (validation.errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
      warnings: validation.warnings
    });
  }
  
  const result = warehouseStore.createWarehouse(warehouse, config.validation.enableVersionCheck);
  
  if (result.conflict) {
    return res.status(409).json({
      success: false,
      conflict: true,
      ...result,
      warnings: validation.warnings
    });
  }
  
  res.json({
    success: true,
    data: warehouseStore.getWarehouse(result.id),
    warnings: validation.warnings
  });
});

router.get('/warehouses', (req, res) => {
  const warehouses = warehouseStore.listWarehouses();
  res.json({ success: true, data: warehouses });
});

router.get('/warehouses/:id', (req, res) => {
  const { id } = req.params;
  const { version } = req.query;
  
  const warehouse = warehouseStore.getWarehouse(id, version ? parseInt(version) : null);
  if (!warehouse) {
    return res.status(404).json({ success: false, error: '仓库不存在' });
  }
  res.json({ success: true, data: warehouse });
});

router.get('/warehouses/:id/versions', (req, res) => {
  const { id } = req.params;
  const versions = warehouseStore.getWarehouseVersions(id);
  res.json({ success: true, data: versions });
});

router.post('/warehouses/:id/shelves', (req, res) => {
  const { id } = req.params;
  const { shelves } = req.body;
  
  const warehouse = warehouseStore.getWarehouse(id);
  if (!warehouse) {
    return res.status(404).json({ success: false, error: '仓库不存在' });
  }
  
  const existingShelves = shelfStore.getShelvesByWarehouse(id);
  const validation = validateShelves(shelves, existingShelves, warehouse, config);
  
  if (validation.errors.length > 0 && !req.body.force) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
      warnings: validation.warnings
    });
  }
  
  const results = shelfStore.createShelves(shelves, id, config.validation.enableDuplicateDetection);
  
  const conflicts = results.filter(r => !r.success);
  const success = results.filter(r => r.success);
  
  res.json({
    success: true,
    data: {
      created: success.length,
      conflicts: conflicts.length,
      results,
      allShelves: shelfStore.getShelvesByWarehouse(id)
    },
    warnings: validation.warnings,
    conflicts
  });
});

router.get('/warehouses/:id/shelves', (req, res) => {
  const { id } = req.params;
  const shelves = shelfStore.getShelvesByWarehouse(id);
  res.json({ success: true, data: shelves });
});

router.post('/warehouses/:id/zones/forbidden', (req, res) => {
  const { id } = req.params;
  const { zones } = req.body;
  
  const warehouse = warehouseStore.getWarehouse(id);
  if (!warehouse) {
    return res.status(404).json({ success: false, error: '仓库不存在' });
  }
  
  const results = zoneStore.createForbiddenZones(zones, id);
  res.json({
    success: true,
    data: {
      created: results.length,
      zones: zoneStore.getForbiddenZones(id)
    }
  });
});

router.get('/warehouses/:id/zones/forbidden', (req, res) => {
  const { id } = req.params;
  const zones = zoneStore.getForbiddenZones(id);
  res.json({ success: true, data: zones });
});

router.post('/warehouses/:id/zones/blind', (req, res) => {
  const { id } = req.params;
  const { zones } = req.body;
  
  const warehouse = warehouseStore.getWarehouse(id);
  if (!warehouse) {
    return res.status(404).json({ success: false, error: '仓库不存在' });
  }
  
  const results = zoneStore.createBlindZones(zones, id);
  res.json({
    success: true,
    data: {
      created: results.length,
      zones: zoneStore.getBlindZones(id)
    }
  });
});

router.get('/warehouses/:id/zones/blind', (req, res) => {
  const { id } = req.params;
  const zones = zoneStore.getBlindZones(id);
  res.json({ success: true, data: zones });
});

router.get('/warehouses/:id/full', (req, res) => {
  const { id } = req.params;
  const { version } = req.query;
  
  const warehouse = warehouseStore.getWarehouse(id, version ? parseInt(version) : null);
  if (!warehouse) {
    return res.status(404).json({ success: false, error: '仓库不存在' });
  }
  
  const data = {
    warehouse,
    shelves: shelfStore.getShelvesByWarehouse(id),
    forbiddenZones: zoneStore.getForbiddenZones(id),
    blindZones: zoneStore.getBlindZones(id)
  };
  
  res.json({ success: true, data });
});

module.exports = router;
