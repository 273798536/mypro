const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const importService = require('../services/importService');
const batchService = require('../services/batchService');

const uploadDir = path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  },
});

const upload = multer({ storage });

router.post('/', upload.fields([
  { name: 'aisFile', maxCount: 1 },
  { name: 'waterFile', maxCount: 1 },
]), (req, res) => {
  const { name, notes } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: '批次名称必填' });
  }

  const aisPath = req.files?.aisFile?.[0]?.path;
  const waterPath = req.files?.waterFile?.[0]?.path;

  try {
    const result = importService.createBatchWithFiles(name, aisPath, waterPath, notes || '');
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/:id/ais', upload.single('file'), (req, res) => {
  const batchId = req.params.id;
  const batch = batchService.getBatchById(batchId);
  if (!batch) {
    return res.status(404).json({ success: false, message: '批次不存在' });
  }

  try {
    const result = importService.importAisCsv(batchId, req.file.path);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/:id/water', upload.single('file'), (req, res) => {
  const batchId = req.params.id;
  const batch = batchService.getBatchById(batchId);
  if (!batch) {
    return res.status(404).json({ success: false, message: '批次不存在' });
  }

  try {
    const result = importService.importWaterQualityCsv(batchId, req.file.path);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
