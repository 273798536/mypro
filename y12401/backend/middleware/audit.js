const prisma = require('../prisma/client');

async function createAuditLog(entityType, entityId, operationType, oldValue, newValue, operator, remark, sourceType, sourceId) {
  return await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      operationType,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      operator: operator || 'system',
      remark,
      sourceType,
      sourceId,
    },
  });
}

async function createQuoteHistory(quoteId, fieldName, oldValue, newValue, operationType, operator, remark, sourceType, sourceId) {
  return await prisma.quoteHistory.create({
    data: {
      quoteId,
      fieldName,
      oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
      newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
      operationType,
      operator: operator || 'system',
      remark,
      sourceType,
      sourceId,
    },
  });
}

function auditMiddleware(entityType) {
  return async (req, res, next) => {
    req.audit = {
      log: (operationType, oldValue, newValue, remark, sourceType, sourceId) => {
        const entityId = req.params.id || req.body.id;
        const operator = req.headers['x-operator'] || 'system';
        return createAuditLog(
          entityType,
          entityId,
          operationType,
          oldValue,
          newValue,
          operator,
          remark,
          sourceType || req.body.sourceType,
          sourceId || req.body.sourceId
        );
      },
      quoteHistory: (quoteId, fieldName, oldValue, newValue, operationType, remark, sourceType, sourceId) => {
        const operator = req.headers['x-operator'] || 'system';
        return createQuoteHistory(
          quoteId,
          fieldName,
          oldValue,
          newValue,
          operationType,
          operator,
          remark,
          sourceType || req.body.sourceType,
          sourceId || req.body.sourceId
        );
      },
    };
    next();
  };
}

module.exports = {
  auditMiddleware,
  createAuditLog,
  createQuoteHistory,
};
