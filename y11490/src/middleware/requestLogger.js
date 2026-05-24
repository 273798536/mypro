const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  req.requestId = require('crypto').randomUUID();
  
  logger.info({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    operator: req.headers['x-operator'] || 'anonymous'
  });

  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    logger.info({
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    return originalSend.call(this, body);
  };

  next();
}

function errorHandler(err, req, res, next) {
  logger.error({
    requestId: req.requestId,
    error: err.message,
    stack: err.stack
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    requestId: req.requestId
  });
}

module.exports = {
  requestLogger,
  errorHandler
};
