const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('./models/auditTrail');

const requestIdMiddleware = require('./middleware/requestId');
const auditLoggerMiddleware = require('./middleware/auditLogger');

const changeOrdersRouter = require('./routes/changeOrders');
const auditOpinionsRouter = require('./routes/auditOpinions');
const agentQuotesRouter = require('./routes/agentQuotes');
const supplierStatementsRouter = require('./routes/supplierStatements');
const auditTrailsRouter = require('./routes/auditTrails');
const dirtyRecordsRouter = require('./routes/dirtyRecords');
const reconcileRouter = require('./routes/reconcile');
const exportRouter = require('./routes/export');

const app = express();
const PORT = config.server.port;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(requestIdMiddleware);
app.use(auditLoggerMiddleware);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'kb-audit-trail-service',
      version: '1.0.0',
    },
  });
});

app.use('/api/change-orders', changeOrdersRouter);
app.use('/api/audit-opinions', auditOpinionsRouter);
app.use('/api/agent-quotes', agentQuotesRouter);
app.use('/api/supplier-statements', supplierStatementsRouter);
app.use('/api/audit-trails', auditTrailsRouter);
app.use('/api/dirty-records', dirtyRecordsRouter);
app.use('/api/reconcile', reconcileRouter);
app.use('/api/export', exportRouter);

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  createAuditTrail({
    action_type: ACTION_TYPES.ERROR,
    action_subtype: 'server_error',
    operator: 'system',
    status: ACTION_STATUSES.FAILED,
    error_message: err.message,
    request_id: req.requestId,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    request_id: req.requestId,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  createAuditTrail({
    action_type: ACTION_TYPES.SERVER_START,
    action_subtype: 'startup',
    operator: 'system',
    status: ACTION_STATUSES.SUCCESS,
    detail: `服务器启动，端口: ${PORT}`,
  });
});

module.exports = app;
