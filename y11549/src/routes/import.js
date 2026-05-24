const express = require('express');
const multer = require('multer');
const path = require('path');
const importService = require('../services/importService');
const logger = require('../config/logger');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

router.post('/:recordType', upload.single('file'), async (req, res) => {
  try {
    const { recordType } = req.params;
    const { operator = 'system' } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const result = await importService.importFile(
      req.file.path,
      req.file.originalname,
      recordType,
      operator
    );

    res.json({
      success: true,
      message: '导入完成',
      data: result
    });
  } catch (error) {
    logger.error('导入失败', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/sources', async (req, res) => {
  try {
    const db = require('../config/database');
    db.all('SELECT * FROM import_sources ORDER BY uploaded_at DESC LIMIT 50', (err, sources) => {
      if (err) throw err;
      res.json(sources);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sources/:id', async (req, res) => {
  try {
    const db = require('../config/database');
    db.get('SELECT * FROM import_sources WHERE id = ?', [req.params.id], (err, source) => {
      if (err) throw err;
      if (!source) {
        return res.status(404).json({ error: '导入记录不存在' });
      }
      res.json(source);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
