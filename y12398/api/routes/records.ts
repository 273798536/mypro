import express from 'express';
import type { BorrowRecord, RecordVersion } from '../../shared/types';
import { store } from '../data/store';
import { generateId } from '../data/mockData';

const router = express.Router();

router.get('/', (req, res) => {
  const records = store.getRecords().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ success: true, data: records });
});

router.get('/:id', (req, res) => {
  const record = store.getRecordById(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, error: '记录未找到' });
  }
  res.json({ success: true, data: record });
});

router.post('/borrow', (req, res) => {
  const { deviceId, deviceName, borrower, expectedReturnDate } = req.body;

  if (!deviceId || !deviceName || !borrower || !expectedReturnDate) {
    return res.status(400).json({ success: false, error: '设备ID、名称、借用人、预计归还日期为必填项' });
  }

  const device = store.getDeviceById(deviceId);
  if (!device) {
    return res.status(404).json({ success: false, error: '设备未找到' });
  }

  if (device.status === 'borrowed' || device.status === 'anomaly') {
    return res.status(400).json({ success: false, error: '该设备当前已被借出' });
  }

  const newRecord: BorrowRecord = {
    id: generateId('REC'),
    deviceId,
    deviceName,
    borrower,
    borrowDate: new Date().toISOString(),
    expectedReturnDate,
    actualReturnDate: null,
    status: 'borrowed',
    damageNote: null,
    damagePhotoUrl: null,
    versions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.addRecord(newRecord);
  store.updateDevice(deviceId, {
    status: 'borrowed',
    currentBorrower: borrower
  });

  res.status(201).json({ success: true, data: newRecord, message: '借出登记成功' });
});

router.post('/:id/return', (req, res) => {
  const { damageNote, damagePhotoUrl } = req.body;

  const record = store.getRecordById(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, error: '记录未找到' });
  }

  if (record.status === 'returned') {
    return res.status(400).json({ success: false, error: '该设备已归还' });
  }

  const updates: Partial<BorrowRecord> = {
    actualReturnDate: new Date().toISOString(),
    status: 'returned'
  };

  if (damageNote) {
    updates.damageNote = damageNote;
  }
  if (damagePhotoUrl) {
    updates.damagePhotoUrl = damagePhotoUrl;
  }

  const updatedRecord = store.updateRecord(req.params.id, updates);
  if (!updatedRecord) {
    return res.status(500).json({ success: false, error: '更新记录失败' });
  }

  const newDeviceStatus = damageNote ? 'damaged' : 'in_stock';
  store.updateDevice(record.deviceId, {
    status: newDeviceStatus,
    currentBorrower: null
  });

  res.json({ success: true, data: updatedRecord, message: '归还登记成功' });
});

router.put('/:id/extend', (req, res) => {
  const { newExpectedReturnDate, reason, author } = req.body;

  if (!newExpectedReturnDate || !reason || !author) {
    return res.status(400).json({ success: false, error: '新归还日期、原因、作者为必填项' });
  }

  const record = store.getRecordById(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, error: '记录未找到' });
  }

  if (record.status === 'returned') {
    return res.status(400).json({ success: false, error: '该设备已归还，无法延期' });
  }

  const version: RecordVersion = {
    id: generateId('VER'),
    field: 'expectedReturnDate',
    oldValue: record.expectedReturnDate,
    newValue: newExpectedReturnDate,
    author,
    timestamp: new Date().toISOString(),
    reason
  };

  const updatedVersions = [...record.versions, version];
  const updatedRecord = store.updateRecord(req.params.id, {
    expectedReturnDate: newExpectedReturnDate,
    versions: updatedVersions
  });

  res.json({ success: true, data: updatedRecord, message: '延期成功，历史版本已保留' });
});

export default router;
