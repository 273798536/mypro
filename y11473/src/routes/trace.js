const express = require('express');
const router = express.Router();
const TraceService = require('../services/TraceService');

router.get('/', async (req, res) => {
  try {
    const { traceType, operation, status, operator, limit = 100 } = req.query;
    const traces = await TraceService.getTraces({
      traceType,
      operation,
      status,
      operator,
      limit: parseInt(limit)
    });
    res.json(traces);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/http', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const traces = await TraceService.getTraces({
      traceType: 'http_request',
      limit: parseInt(limit)
    });
    res.json(traces);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/types', (req, res) => {
  res.json([
    { type: 'generate_data', name: '生成测试数据' },
    { type: 'service_start', name: '启动服务' },
    { type: 'service_stop', name: '停止服务' },
    { type: 'http_request', name: 'HTTP请求' },
    { type: 'reconciliation', name: '数据对账' },
    { type: 'export', name: '数据导出' },
    { type: 'replay_exception', name: '异常回放' },
    { type: 'manual_correction', name: '人工修正' }
  ]);
});

module.exports = router;
