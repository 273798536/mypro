const express = require('express');
const router = express.Router();
const BatchInquiryService = require('../services/batchInquiryService');
const ExportService = require('../services/exportService');

router.post('/inquiry', async (req, res) => {
  try {
    const result = await BatchInquiryService.createInquiry({
      ...req.body,
      initiatedBy: req.headers['x-operator-id'],
      initiatedByName: req.headers['x-operator-name'] || 'system'
    });
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/inquiry', async (req, res) => {
  try {
    const result = await BatchInquiryService.list(req.query);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/inquiry/:id', async (req, res) => {
  try {
    const item = await BatchInquiryService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: '查询记录不存在'
      });
    }
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/inquiry/:id/complete', async (req, res) => {
  try {
    const item = await BatchInquiryService.completeInquiry(
      req.params.id,
      req.body.conclusion,
      req.headers['x-operator-id'],
      req.headers['x-operator-name'] || 'system'
    );
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/query', async (req, res) => {
  try {
    const { batchNo, potNo } = req.query;
    if (!batchNo) {
      return res.status(400).json({
        success: false,
        error: '缺少批次号参数'
      });
    }
    const result = await BatchInquiryService.queryBatchRecords(batchNo, potNo);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/export', async (req, res) => {
  try {
    const { batchNo, potNo } = req.body;
    if (!batchNo) {
      return res.status(400).json({
        success: false,
        error: '缺少批次号参数'
      });
    }
    const result = await ExportService.exportBatchInquiryToCsv(batchNo, potNo);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
