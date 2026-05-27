const express = require('express');
const path = require('path');
const fs = require('fs');

const store = require('./models/store');

const samplesRoutes = require('./routes/samples');
const depositsRoutes = require('./routes/deposits');
const reportsRoutes = require('./routes/reports');
const alertsRoutes = require('./routes/alerts');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api', (req, res) => {
  res.json({
    service: '酒店押金释放队列',
    version: '1.0.0',
    endpoints: {
      samples: {
        import: 'POST /api/samples/import',
        clear: 'POST /api/samples/clear'
      },
      queue: {
        list: 'GET /api/deposits',
        processAll: 'POST /api/deposits/process-all',
        lock: 'POST /api/deposits/:orderId/lock',
        deductDamage: 'POST /api/deposits/:orderId/deduct-damage',
        release: 'POST /api/deposits/:orderId/release',
        retry: 'POST /api/deposits/releases/:releaseId/retry',
        cancel: 'POST /api/deposits/releases/:releaseId/cancel',
        summary: 'GET /api/deposits/:orderId/summary'
      },
      reports: {
        list: 'GET /api/reports',
        export: 'GET /api/reports/export?format=json|csv|text'
      },
      alerts: {
        list: 'GET /api/alerts',
        resolve: 'POST /api/alerts/:alertId/resolve',
        redetect: 'POST /api/alerts/re-detect'
      }
    }
  });
});

app.get('/api/status', (req, res) => {
  const db = store.loadDB();
  const queue = require('./services/queueService').buildQueue(db);
  const ready = queue.filter(q => q.canRelease).length;
  const blocked = queue.filter(q => !q.canRelease).length;

  res.json({
    orders: db.orders.length,
    depositFlows: db.depositFlows.length,
    damageReports: db.damageReports.length,
    channelReceipts: db.channelReceipts.length,
    releaseRecords: db.releaseRecords.length,
    alerts: {
      total: db.alerts.length,
      unresolved: db.alerts.filter(a => !a.resolved).length
    },
    queue: {
      total: queue.length,
      ready,
      blocked
    }
  });
});

app.get('/api/audit', (req, res) => {
  const db = store.loadDB();
  res.json({ logs: db.auditLogs });
});

app.use('/api/samples', samplesRoutes);
app.use('/api/deposits', depositsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/alerts', alertsRoutes);

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在', path: req.path });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`酒店押金释放队列服务已启动: http://localhost:${PORT}`);
    console.log(`API 入口: http://localhost:${PORT}/api`);
  });
}

module.exports = app;