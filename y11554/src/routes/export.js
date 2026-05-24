const express = require('express');
const { authenticate, authorize, cityDataFilter } = require('../middleware/auth');
const { ROLES } = require('../models/User');
const { exportLedgersToCSV, exportAuditTrailToCSV, getRoleViewConfig, getRoleBasedFields } = require('../services/exportService');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.use(authenticate, cityDataFilter);

router.post('/ledgers', async (req, res) => {
  try {
    const result = await exportLedgersToCSV(req.user, req.body, req.ip);
    
    res.json({
      message: '导出成功',
      fileName: result.fileName,
      recordCount: result.recordCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/download/:filename', async (req, res) => {
  try {
    const fileName = req.params.filename;
    const filePath = path.join(process.cwd(), 'exports', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    res.download(filePath, fileName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/audit-trail', async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    const result = await exportAuditTrailToCSV(req.user, targetType, targetId, req.ip);
    
    res.json({
      message: '导出成功',
      fileName: result.fileName,
      recordCount: result.recordCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/role-view-config', (req, res) => {
  const config = getRoleViewConfig(req.user.role);
  res.json(config);
});

router.get('/allowed-fields/:exportType', (req, res) => {
  const fields = getRoleBasedFields(req.user.role, req.params.exportType);
  res.json({ fields });
});

module.exports = router;
