const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ImportService = require('../services/ImportService');
const AsyncTaskService = require('../services/AsyncTaskService');
const { ImportRecord } = require('../models');

const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

router.post('/return-apply', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    const task = await AsyncTaskService.createTask(
      'import_parse', `导入退供申请: ${req.file.filename}`,
      { filePath: req.file.path, sourceType: 'return_apply' },
      { createdBy: req.user || 'api' }
    );
    res.json({ taskId: task.id, fileName: req.file.originalname, message: '导入任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/quality-photo', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    const task = await AsyncTaskService.createTask(
      'import_parse', `导入质检照片: ${req.file.filename}`,
      { filePath: req.file.path, sourceType: 'quality_photo' },
      { createdBy: req.user || 'api' }
    );
    res.json({ taskId: task.id, fileName: req.file.originalname, message: '导入任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/logistics-receipt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    const task = await AsyncTaskService.createTask(
      'import_parse', `导入物流回单: ${req.file.filename}`,
      { filePath: req.file.path, sourceType: 'logistics_receipt' },
      { createdBy: req.user || 'api' }
    );
    res.json({ taskId: task.id, fileName: req.file.originalname, message: '导入任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/price-adjustment', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    const task = await AsyncTaskService.createTask(
      'import_parse', `导入手工改价表: ${req.file.filename}`,
      { filePath: req.file.path, sourceType: 'price_adjustment' },
      { createdBy: req.user || 'api' }
    );
    res.json({ taskId: task.id, fileName: req.file.originalname, message: '导入任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/history-archive', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    const task = await AsyncTaskService.createTask(
      'import_parse', `导入历史压缩包: ${req.file.filename}`,
      { filePath: req.file.path, sourceType: 'history_archive' },
      { createdBy: req.user || 'api', priority: 7 }
    );
    res.json({ taskId: task.id, fileName: req.file.originalname, message: '历史压缩包导入任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/records', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, sourceType, batchNo } = req.query;
    const where = {};
    if (sourceType) where.source_type = sourceType;
    if (batchNo) where.batch_no = batchNo;
    
    const { count, rows } = await ImportRecord.findAndCountAll({
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

router.get('/records/:id', async (req, res) => {
  try {
    const record = await ImportRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: '记录不存在' });
    res.json({
      ...record.toJSON(),
      raw_data: JSON.parse(record.raw_data),
      parsed_data: record.parsed_data ? JSON.parse(record.parsed_data) : null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
