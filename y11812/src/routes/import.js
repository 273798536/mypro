const express = require('express');
const router = express.Router();
const multer = require('multer');
const importService = require('../services/importService');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

router.post('/stores', async (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    const result = await importService.importStores(data);
    
    res.json({
      success: true,
      message: `成功导入 ${result.success} 条门店数据`,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导入失败',
      error: err.message
    });
  }
});

router.post('/contracts', async (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    const result = await importService.importContracts(data);
    
    res.json({
      success: true,
      message: `成功导入 ${result.success} 条合同数据`,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导入失败',
      error: err.message
    });
  }
});

router.post('/commission-rules', async (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    const result = await importService.importCommissionRules(data);
    
    res.json({
      success: true,
      message: `成功导入 ${result.success} 条抽成规则`,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导入失败',
      error: err.message
    });
  }
});

router.post('/sales', async (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    const result = await importService.importSales(data, req.body.batchId);
    
    res.json({
      success: true,
      message: `成功导入 ${result.success} 条销售数据`,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导入失败',
      error: err.message
    });
  }
});

router.post('/upload/:dataType', upload.single('file'), async (req, res) => {
  try {
    const { dataType } = req.params;
    const validTypes = ['stores', 'contracts', 'commission-rules', 'sales'];
    
    if (!validTypes.includes(dataType)) {
      return res.status(400).json({
        success: false,
        message: '无效的数据类型'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未上传文件'
      });
    }

    const data = await importService.parseCSV(req.file.path);
    
    let result;
    switch (dataType) {
      case 'stores':
        result = await importService.importStores(data);
        break;
      case 'contracts':
        result = await importService.importContracts(data);
        break;
      case 'commission-rules':
        result = await importService.importCommissionRules(data);
        break;
      case 'sales':
        result = await importService.importSales(data);
        break;
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `成功导入 ${result.success} 条数据`,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导入失败',
      error: err.message
    });
  }
});

router.get('/template/:dataType', (req, res) => {
  const { dataType } = req.params;
  const template = importService.generateImportTemplate(dataType);
  
  if (template.length === 0) {
    return res.status(400).json({
      success: false,
      message: '无效的数据类型'
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${dataType}_template.csv"`);
  res.send(template.join('\n'));
});

module.exports = router;
