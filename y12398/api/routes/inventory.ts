import express from 'express';
import type { InventoryCheck, InventoryItem } from '../../shared/types';
import { store } from '../data/store';
import { generateId } from '../data/mockData';

const router = express.Router();

router.get('/', (req, res) => {
  const checks = store.getInventoryChecks().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ success: true, data: checks });
});

router.get('/:id', (req, res) => {
  const check = store.getInventoryCheckById(req.params.id);
  if (!check) {
    return res.status(404).json({ success: false, error: '盘点记录未找到' });
  }
  res.json({ success: true, data: check });
});

router.post('/', (req, res) => {
  const devices = store.getDevices();

  const items: InventoryItem[] = devices.map(device => ({
    deviceId: device.id,
    deviceName: device.name,
    expectedStatus: device.status,
    actualStatus: device.status,
    isMatch: true,
    note: ''
  }));

  const newCheck: InventoryCheck = {
    id: generateId('INV'),
    checkDate: new Date().toISOString().split('T')[0],
    items,
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  store.addInventoryCheck(newCheck);
  res.status(201).json({ success: true, data: newCheck, message: '盘点已创建' });
});

router.put('/:id/items', (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, error: '盘点项为必填项' });
  }

  const check = store.getInventoryCheckById(req.params.id);
  if (!check) {
    return res.status(404).json({ success: false, error: '盘点记录未找到' });
  }

  if (check.status === 'completed') {
    return res.status(400).json({ success: false, error: '已完成的盘点无法修改' });
  }

  const updatedItems = items.map((item: InventoryItem) => ({
    ...item,
    isMatch: item.expectedStatus === item.actualStatus
  }));

  const updated = store.updateInventoryCheck(req.params.id, { items: updatedItems });
  res.json({ success: true, data: updated, message: '盘点项已更新' });
});

router.post('/:id/complete', (req, res) => {
  const check = store.getInventoryCheckById(req.params.id);
  if (!check) {
    return res.status(404).json({ success: false, error: '盘点记录未找到' });
  }

  const mismatches = check.items.filter(item => !item.isMatch);
  mismatches.forEach(item => {
    const device = store.getDeviceById(item.deviceId);
    if (device && item.actualStatus === 'anomaly') {
      store.updateDevice(item.deviceId, { status: 'anomaly' });
    }
  });

  const updated = store.updateInventoryCheck(req.params.id, { status: 'completed' });
  res.json({
    success: true,
    data: updated,
    message: `盘点完成，共发现 ${mismatches.length} 项差异`
  });
});

export default router;
