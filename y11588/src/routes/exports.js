const express = require('express');
const router = express.Router();
const fs = require('fs');
const { exportContracts, exportPaymentNodes, exportReconciliationReport, exportFailedRecords, exportFullPlayback } = require('../services/exportService');

function checkExportPermission(req, res, next) {
  if (!req.permissions.canExport) {
    return res.status(403).json({
      success: false,
      error: '权限不足：无法导出数据',
      code: 'EXPORT_PERMISSION_DENIED'
    });
  }
  next();
}

router.get('/contracts', checkExportPermission, (req, res) => {
  const result = exportContracts(req.query);
  res.json({
    success: true,
    data: {
      filePath: result.filePath,
      recordCount: result.recordCount
    }
  });
});

router.get('/payment-nodes', checkExportPermission, (req, res) => {
  const result = exportPaymentNodes(req.query);
  res.json({
    success: true,
    data: {
      filePath: result.filePath,
      recordCount: result.recordCount
    }
  });
});

router.get('/reconciliation', checkExportPermission, (req, res) => {
  const result = exportReconciliationReport();
  res.json({
    success: true,
    data: {
      filePath: result.filePath,
      recordCount: result.recordCount,
      summary: result.summary
    }
  });
});

router.get('/failed-records', checkExportPermission, (req, res) => {
  const result = exportFailedRecords(req.query);
  res.json({
    success: true,
    data: {
      filePath: result.filePath,
      recordCount: result.recordCount
    }
  });
});

router.get('/playback/:contractId', checkExportPermission, (req, res) => {
  const result = exportFullPlayback(req.params.contractId);
  if (!result.success) {
    return res.status(404).json(result);
  }
  res.json({
    success: true,
    data: {
      filePath: result.filePath,
      playbackData: result.data
    }
  });
});

router.get('/download/:filename', checkExportPermission, (req, res) => {
  const filename = req.params.filename;
  const filePath = require('path').join(process.cwd(), 'data', 'exports', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: '文件不存在' });
  }
  
  res.download(filePath);
});

module.exports = router;
