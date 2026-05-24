const express = require('express');
const router = express.Router();
const {
  exportChangeOrdersToCsv,
  exportSupplierStatementsToCsv,
  exportDirtyRecordsToCsv,
  exportAuditTrailToJson,
  getFullOrderDetail,
} = require('../services/exportService');

router.post('/change-orders', async (req, res) => {
  try {
    const filters = req.body.filters || {};
    const result = await exportChangeOrdersToCsv(filters);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/supplier-statements', async (req, res) => {
  try {
    const filters = req.body.filters || {};
    const result = await exportSupplierStatementsToCsv(filters);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/dirty-records', async (req, res) => {
  try {
    const filters = req.body.filters || {};
    const result = await exportDirtyRecordsToCsv(filters);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/audit-trails', (req, res) => {
  try {
    const filters = req.body.filters || {};
    const result = exportAuditTrailToJson(filters);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/order-detail/:orderNo', (req, res) => {
  try {
    const result = getFullOrderDetail(req.params.orderNo);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
