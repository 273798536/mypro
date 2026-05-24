const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('../models/auditTrail');

function auditLoggerMiddleware(req, res, next) {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(body) {
    const durationMs = Date.now() - startTime;
    const status = res.statusCode < 400 ? ACTION_STATUSES.SUCCESS : ACTION_STATUSES.FAILED;

    try {
      createAuditTrail({
        action_type: ACTION_TYPES.REQUEST,
        action_subtype: `${req.method} ${req.path}`,
        operator: req.headers['x-operator'] || req.headers['x-user-id'] || 'anonymous',
        status: status,
        detail: JSON.stringify({
          method: req.method,
          path: req.path,
          query: req.query,
          bodySize: req.body ? JSON.stringify(req.body).length : 0,
        }),
        error_message: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null,
        request_id: req.requestId,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        duration_ms: durationMs,
      });
    } catch (err) {
      console.error('Failed to create audit trail:', err);
    }

    originalSend.call(this, body);
  };

  next();
}

module.exports = auditLoggerMiddleware;
