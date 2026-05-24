const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ImportService = require('../services/ImportService');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '未上传文件'
      });
    }

    const result = await ImportService.importFromFile(
      req.file.path,
      req.file.originalname
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('文件导入失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/batch/:batchId', async (req, res) => {
  try {
    const records = await ImportService.getImportsByBatch(req.params.batchId);

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('查询导入批次失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/raw/:id', async (req, res) => {
  try {
    const record = await ImportService.getRawImportById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: '记录不存在'
      });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('查询原始记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;