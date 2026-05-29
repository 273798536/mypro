const express = require('express');
const router = express.Router();
const versionService = require('../services/version-service');

router.get('/:tableName', async (req, res) => {
  try {
    const { record_id } = req.query;
    const history = versionService.getVersionHistory(
      req.params.tableName,
      record_id ? parseInt(record_id) : null
    );
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:tableName/:recordId/chain', async (req, res) => {
  try {
    const validTables = ['investor_shares', 'revenue_installments', 'cost_items'];
    if (!validTables.includes(req.params.tableName)) {
      return res.status(400).json({
        success: false,
        error: '不支持的表名，可选值: investor_shares, revenue_installments, cost_items'
      });
    }
    const chain = versionService.getRecordVersionChain(req.params.tableName, req.params.recordId);
    res.json({ success: true, data: chain });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
