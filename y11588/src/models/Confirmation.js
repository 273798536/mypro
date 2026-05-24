const { v4: uuidv4 } = require('uuid');
const { getDB, persist } = require('./storage');
const { getContract, CONTRACT_STATUS } = require('./Contract');
const { getPaymentNode, NODE_STATUS, updateNodeStatus } = require('./PaymentNode');

const CONFIRMATION_TYPES = {
  SECONDARY: 'secondary',
  SUPPLEMENT: 'supplement',
  ADJUSTMENT: 'adjustment'
};

function createConfirmation(data, userId) {
  const db = getDB();

  if (!data.idempotencyKey) {
    return { success: false, error: '缺少幂等键 idempotencyKey', code: 'MISSING_IDEMPOTENCY_KEY' };
  }

  const existing = Object.values(db.confirmations).find(c => c.idempotencyKey === data.idempotencyKey);
  if (existing) {
    return { success: true, data: existing, isUpdate: true };
  }

  const required = ['contractId', 'paymentNodeId', 'confirmationType', 'confirmingParty'];
  for (const field of required) {
    if (!data[field]) {
      return { success: false, error: `缺少必填字段: ${field}`, code: 'MISSING_REQUIRED_FIELD' };
    }
  }

  if (!Object.values(CONFIRMATION_TYPES).includes(data.confirmationType)) {
    return { success: false, error: '无效的确认单类型', code: 'INVALID_TYPE' };
  }

  const contract = getContract(data.contractId);
  if (!contract) {
    return { success: false, error: '关联合同不存在', code: 'CONTRACT_NOT_FOUND' };
  }

  const paymentNode = getPaymentNode(data.paymentNodeId);
  if (!paymentNode) {
    return { success: false, error: '关联付款节点不存在', code: 'PAYMENT_NODE_NOT_FOUND' };
  }

  const confirmationId = data.confirmationId || `CF-${Date.now()}`;
  const now = new Date().toISOString();

  const confirmation = {
    id: confirmationId,
    idempotencyKey: data.idempotencyKey,
    contractId: data.contractId,
    paymentNodeId: data.paymentNodeId,
    confirmationType: data.confirmationType,
    confirmingParty: data.confirmingParty,
    confirmedBy: data.confirmedBy || '',
    confirmedAt: data.confirmedAt || now,
    confirmationContent: data.confirmationContent || '',
    documentHash: data.documentHash || '',
    adjustments: data.adjustments || [],
    originalDueAmount: paymentNode.dueAmount,
    adjustedDueAmount: data.adjustedDueAmount || paymentNode.dueAmount,
    adjustedDueDate: data.adjustedDueDate || paymentNode.dueDate,
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
    approvalNotes: '',
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    customFields: data.customFields || {}
  };

  db.confirmations[confirmationId] = confirmation;
  persist();

  return { success: true, data: confirmation, isUpdate: false };
}

function approveConfirmation(confirmationId, approvalNotes, userId) {
  const db = getDB();
  const confirmation = db.confirmations[confirmationId];

  if (!confirmation) {
    return { success: false, error: '确认单不存在', code: 'NOT_FOUND' };
  }

  const contract = getContract(confirmation.contractId);
  if (contract && contract.status === CONTRACT_STATUS.FROZEN) {
    return { success: false, error: '合同已冻结，无法审批确认单', code: 'CONTRACT_FROZEN' };
  }

  const now = new Date().toISOString();
  confirmation.status = 'approved';
  confirmation.approvedBy = userId;
  confirmation.approvedAt = now;
  confirmation.approvalNotes = approvalNotes;
  confirmation.updatedAt = now;
  confirmation.updatedBy = userId;

  const paymentNode = getPaymentNode(confirmation.paymentNodeId);
  if (paymentNode && contract && contract.status !== CONTRACT_STATUS.FROZEN) {
    updateNodeStatus(confirmation.paymentNodeId, NODE_STATUS.CONFIRMED, userId, '二次确认单审批通过');
    
    if (confirmation.adjustedDueAmount !== confirmation.originalDueAmount) {
      paymentNode.dueAmount = confirmation.adjustedDueAmount;
      paymentNode.updatedAt = now;
      paymentNode.updatedBy = userId;
    }
    if (confirmation.adjustedDueDate !== paymentNode.dueDate) {
      paymentNode.dueDate = confirmation.adjustedDueDate;
      paymentNode.updatedAt = now;
      paymentNode.updatedBy = userId;
    }
  }

  db.versionHistory.push({
    id: uuidv4(),
    entityType: 'confirmation',
    entityId: confirmationId,
    action: 'approve',
    changedBy: userId,
    changedAt: now,
    snapshot: { approvalNotes, adjustments: confirmation.adjustments }
  });

  persist();
  return { success: true, data: confirmation };
}

function getConfirmation(confirmationId) {
  const db = getDB();
  return db.confirmations[confirmationId] || null;
}

function listConfirmations(filters = {}) {
  const db = getDB();
  let results = Object.values(db.confirmations);

  if (filters.contractId) {
    results = results.filter(c => c.contractId === filters.contractId);
  }
  if (filters.paymentNodeId) {
    results = results.filter(c => c.paymentNodeId === filters.paymentNodeId);
  }
  if (filters.confirmationType) {
    results = results.filter(c => c.confirmationType === filters.confirmationType);
  }
  if (filters.status) {
    results = results.filter(c => c.status === filters.status);
  }

  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addFailedRecord(data, error, userId) {
  const db = getDB();
  const record = {
    id: `FAIL-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    entityType: data.entityType || 'unknown',
    rawData: JSON.stringify(data),
    error: error.message || String(error),
    errorCode: error.code || 'UNKNOWN_ERROR',
    reportedBy: userId,
    reportedAt: new Date().toISOString(),
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: ''
  };
  db.failedRecords.push(record);
  persist();
  return record;
}

function listFailedRecords(filters = {}) {
  const db = getDB();
  let results = [...db.failedRecords];
  
  if (filters.resolved !== undefined) {
    results = results.filter(r => r.resolved === filters.resolved);
  }
  if (filters.entityType) {
    results = results.filter(r => r.entityType === filters.entityType);
  }
  
  return results.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
}

module.exports = {
  CONFIRMATION_TYPES,
  createConfirmation,
  approveConfirmation,
  getConfirmation,
  listConfirmations,
  addFailedRecord,
  listFailedRecords
};
