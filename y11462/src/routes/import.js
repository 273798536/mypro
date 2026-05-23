const express = require('express');
const router = express.Router();
const ImportService = require('../services/import.service');
const validate = require('../middleware/validator');

router.post('/data', validate('importData'), async (req, res) => {
  try {
    const { sourceType, rows, sourceFile, importedBy, remark } = req.validatedData;
    const result = await ImportService.importData(sourceType, rows, sourceFile, importedBy, remark);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/records', async (req, res) => {
  try {
    const { sourceType, page = 1, pageSize = 20 } = req.query;
    const result = await ImportService.listImportRecords({ 
      sourceType, 
      page: parseInt(page), 
      pageSize: parseInt(pageSize) 
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/records/:id', async (req, res) => {
  try {
    const result = await ImportService.getImportRecord(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: '导入记录不存在' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
