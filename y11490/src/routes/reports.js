const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');

router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, page, pageSize } = req.query;
    
    const result = await reportService.getReportSummaries({
      startDate,
      endDate,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20
    });

    res.json({
      success: true,
      data: result.list,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
