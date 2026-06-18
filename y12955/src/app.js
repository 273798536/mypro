const express = require('express');
const cors = require('cors');
const path = require('path');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initDatabase } = require('./models/database');

const app = express();

initDatabase();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '表结构漂移对比系统',
      version: '1.0.0'
    }
  });
});

app.use('/api', require('./routes/workOrders'));
app.use('/api', require('./routes/compareRoutes'));
app.use('/api', require('./routes/permissionAuditRoutes'));
app.use('/api', require('./routes/slowQueryRoutes'));
app.use('/api', require('./routes/reportRoutes'));

app.get('/api', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '表结构漂移对比系统 API',
      version: '1.0.0',
      endpoints: {
        work_orders: '/api/work-orders',
        comparisons: '/api/work-orders/:id/compare',
        permission_audit: '/api/work-orders/:id/permission-audit',
        slow_queries: '/api/work-orders/:id/slow-queries',
        reports: '/api/work-orders/:id/report'
      }
    }
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app, initDatabase };
