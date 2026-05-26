const express = require('express');
const { init } = require('./db');
const arbitrationRoutes = require('./routes/arbitration');
const queryRoutes = require('./routes/query');
const exportRoutes = require('./routes/export');

init();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: '商户分账异常仲裁API',
    version: '1.0.0',
    description: '处理商户分账投诉的创建/查询/推进/修正/导出',
    endpoints: {
      arbitration: {
        create: 'POST /api/arbitration',
        list: 'GET /api/arbitration',
        detail: 'GET /api/arbitration/:caseNo',
        advance: 'POST /api/arbitration/:caseNo/advance',
        assign: 'POST /api/arbitration/:caseNo/assign',
        opinion: 'POST /api/arbitration/:caseNo/opinion',
        correct: 'POST /api/arbitration/:caseNo/correct',
        rollback_compute: 'GET /api/arbitration/:caseNo/rollback/compute',
        rollback_execute: 'POST /api/arbitration/:caseNo/rollback/execute',
        status_chain: 'GET /api/arbitration/status/chain',
      },
      query: {
        orders: 'GET /api/query/orders',
        refunds: 'GET /api/query/refunds',
        rules: 'GET /api/query/rules',
        subsidies: 'GET /api/query/subsidies',
        settlements: 'GET /api/query/settlements',
        anomalies: 'GET /api/query/anomalies',
        detect_anomalies: 'POST /api/query/anomalies/detect',
        resolve_anomaly: 'POST /api/query/anomalies/:id/resolve',
      },
      export: {
        report_json: 'GET /api/export/arbitration',
        report_csv: 'POST /api/export/arbitration/csv',
        anomalies_csv: 'POST /api/export/anomalies/csv',
      },
    },
    status_flow: {
      created: '待处理 pending',
      pending: '调查中 investigating / 驳回 rejected / 关闭 closed',
      investigating: '待确认 pending_confirmation / 驳回 rejected / 关闭 closed',
      pending_confirmation: '已解决 resolved / 调查中 investigating',
      resolved: '已关闭 closed',
    },
    anomaly_types: [
      'refund_cross_settle_date - 退款跨结算日',
      'rule_version_mismatch - 规则版本错配',
      'duplicate_subsidy - 补贴重复入账',
    ],
  });
});

app.use('/api/arbitration', arbitrationRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/export', exportRoutes);

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  商户分账异常仲裁API 已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  初始化: node seed.js`);
  console.log(`========================================\n`);
});
