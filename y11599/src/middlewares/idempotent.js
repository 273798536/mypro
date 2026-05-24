const crypto = require('crypto');
const { IdempotentRequest } = require('../models');

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;

function generateRequestHash(req) {
  const data = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    url: req.path
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getIdempotentKey(req) {
  return req.headers['x-idempotent-key'] || 
         req.headers['x-request-id'] ||
         null;
}

async function checkAndCreateIdempotent(req, res, next) {
  const idempotentKey = getIdempotentKey(req);
  
  if (!idempotentKey) {
    req.idempotentContext = {
      enabled: false,
      key: null
    };
    return next();
  }

  const requestHash = generateRequestHash(req);
  
  try {
    const existing = await IdempotentRequest.findOne({
      where: { idempotentKey }
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        return res.status(409).json({
          success: false,
          error: 'IDEMPOTENT_KEY_MISMATCH',
          message: '幂等键已被使用但请求内容不匹配',
          idempotentKey,
          existingHash: existing.requestHash
        });
      }

      existing.requestCount += 1;
      existing.lastRequestedAt = new Date();
      await existing.save();

      if (existing.status === 'COMPLETED') {
        return res.status(existing.responseStatus || 200).json({
          success: true,
          data: existing.responseData ? JSON.parse(existing.responseData) : null,
          _meta: {
            idempotent: true,
            cached: true,
            requestCount: existing.requestCount
          }
        });
      }

      if (existing.status === 'PROCESSING') {
        return res.status(409).json({
          success: false,
          error: 'REQUEST_IN_PROGRESS',
          message: '相同请求正在处理中，请稍后重试',
          _meta: {
            idempotent: true,
            processing: true
          }
        });
      }
    } else {
      await IdempotentRequest.create({
        idempotentKey,
        requestHash,
        endpoint: req.path,
        method: req.method,
        status: 'PROCESSING',
        userId: req.headers['x-user-id'],
        batchId: req.headers['x-batch-id'],
        expiredAt: new Date(Date.now() + IDEMPOTENCY_TTL)
      });
    }

    req.idempotentContext = {
      enabled: true,
      key: idempotentKey,
      requestHash
    };

    next();
  } catch (error) {
    console.error('Idempotent middleware error:', error);
    next(error);
  }
}

async function saveIdempotentResponse(req, data, status = 200) {
  if (!req.idempotentContext?.enabled) {
    return;
  }

  try {
    await IdempotentRequest.update({
      status: 'COMPLETED',
      responseData: JSON.stringify(data),
      responseStatus: status,
      entityType: req.idempotentContext.entityType,
      entityId: req.idempotentContext.entityId
    }, {
      where: { idempotentKey: req.idempotentContext.key }
    });
  } catch (error) {
    console.error('Save idempotent response error:', error);
  }
}

async function markIdempotentFailed(req, error) {
  if (!req.idempotentContext?.enabled) {
    return;
  }

  try {
    await IdempotentRequest.update({
      status: 'FAILED',
      responseData: JSON.stringify({ error: error.message }),
      responseStatus: 500
    }, {
      where: { idempotentKey: req.idempotentContext.key }
    });
  } catch (e) {
    console.error('Mark idempotent failed error:', e);
  }
}

function setIdempotentEntity(req, entityType, entityId) {
  if (req.idempotentContext?.enabled) {
    req.idempotentContext.entityType = entityType;
    req.idempotentContext.entityId = entityId;
  }
}

module.exports = {
  checkAndCreateIdempotent,
  saveIdempotentResponse,
  markIdempotentFailed,
  setIdempotentEntity,
  generateRequestHash,
  getIdempotentKey
};
