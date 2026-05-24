const express = require('express');
const router = express.Router();
const {
  reconcileStatementsWithQuotes,
  reconcileChangeOrders,
  reconcileAll,
} = require('../services/reconcileService');

router.post('/statements', (req, res) => {
  try {
    const filters = {};
    if (req.body.supplier_id) filters.supplier_id = req.body.supplier_id;
    if (req.body.start_date) filters.start_date = req.body.start_date;
    if (req.body.end_date) filters.end_date = req.body.end_date;

    const result = reconcileStatementsWithQuotes(filters);
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

router.post('/change-orders', (req, res) => {
  try {
    const filters = {};
    if (req.body.status) filters.status = req.body.status;
    if (req.body.start_time) filters.start_time = req.body.start_time;
    if (req.body.end_time) filters.end_time = req.body.end_time;

    const result = reconcileChangeOrders(filters);
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

router.post('/all', (req, res) => {
  try {
    const filters = req.body.filters || {};
    const result = reconcileAll(filters);
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
