import express from 'express';
import type { Device, NoteVersion } from '../../shared/types';
import { store } from '../data/store';
import { generateId } from '../data/mockData';

const router = express.Router();

router.get('/', (req, res) => {
  const devices = store.getDevices();
  res.json({ success: true, data: devices });
});

router.get('/:id', (req, res) => {
  const device = store.getDeviceById(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: '设备未找到' });
  }
  res.json({ success: true, data: device });
});

router.post('/', (req, res) => {
  const { name, category, imageUrl } = req.body;

  if (!name || !category) {
    return res.status(400).json({ success: false, error: '设备名称和分类为必填项' });
  }

  const newDevice: Device = {
    id: generateId('DEV'),
    name,
    category,
    imageUrl: imageUrl || '',
    status: 'in_stock',
    currentBorrower: null,
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.addDevice(newDevice);
  res.status(201).json({ success: true, data: newDevice, message: '设备添加成功' });
});

router.put('/:id', (req, res) => {
  const { name, category, imageUrl, status, currentBorrower } = req.body;

  const updates: Partial<Device> = {};
  if (name) updates.name = name;
  if (category) updates.category = category;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (status) updates.status = status;
  if (currentBorrower !== undefined) updates.currentBorrower = currentBorrower;

  const updated = store.updateDevice(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ success: false, error: '设备未找到' });
  }

  res.json({ success: true, data: updated, message: '设备更新成功' });
});

router.post('/:id/notes', (req, res) => {
  const { content, author } = req.body;

  if (!content || !author) {
    return res.status(400).json({ success: false, error: '备注内容和作者为必填项' });
  }

  const device = store.getDeviceById(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: '设备未找到' });
  }

  const newNote: NoteVersion = {
    id: generateId('NOTE'),
    content,
    author,
    timestamp: new Date().toISOString(),
    version: device.notes.length + 1
  };

  const updatedNotes = [...device.notes, newNote];
  const updated = store.updateDevice(req.params.id, { notes: updatedNotes });

  res.json({ success: true, data: updated, message: '备注添加成功' });
});

export default router;
