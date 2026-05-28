const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');

router.get('/audit/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { format, status } = req.query;

    const data = await exportService.exportAuditRecords(batchId, {
      format: format || 'csv',
      status
    });

    const fileName = `audit_records_${batchId}.${format === 'json' ? 'json' : 'csv'}`;
    
    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(data);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导出失败',
      error: err.message
    });
  }
});

router.get('/trial/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const data = await exportService.exportTrialCalculation(recordId);

    const fileName = `trial_calc_${recordId}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(data);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导出试算明细失败',
      error: err.message
    });
  }
});

router.get('/impact/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const data = await exportService.exportImpactReport(batchId);

    const fileName = `impact_report_${batchId}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(data);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导出影响分析失败',
      error: err.message
    });
  }
});

router.get('/sales/:storeId/:period', async (req, res) => {
  try {
    const { storeId, period } = req.params;
    const data = await exportService.getSalesExport(storeId, period);

    const fileName = `sales_${storeId}_${period}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(data);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导出销售数据失败',
      error: err.message
    });
  }
});

module.exports = router;
