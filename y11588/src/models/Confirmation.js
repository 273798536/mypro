const { v4: uuidv4 } = require('uuid');
const { getDB, persist, addFailedRecord } = require('./storage');
const { getContract, CONTRACT_STATUS } = require('./Contract');
const { getPaymentNode, NODE_STATUS, updateNodeStatus } = require('./PaymentNode');
const { checkPermission } = require('../middleware/modelPermission');

const CONFIRMATION_TYPES = {
  SECONDARY: 'secondary',
  SUPPLEMENT: 'supplement',
  ADJUSTMENT: 'adjustment'
};

function safeCreate(entityType, data, userId, createFn, requiredFields = []) {
  const db = getDB();

  if (!data.idempotencyKey) {
    const err = { message: '缺少幂等键 idempotencyKey', code: 'MISSING_IDEMPOTENCY_KEY' };
    addFailedRecord(entityType, data, err, userId);
    return { success: false, ...err };
  }

  for (const field of requiredFields) {
    if (!data[field]) {
      const err = { message: `缺少必填字段: ${field}`, code: 'MISSING_REQUIRED_FIELD' };
      addFailedRecord(entityType, data, err, userId);
      return { success: false, ...err };
    }
  }

  if (entityType !== 'contract') {
    const contract = getContract(data.contractId);
    if (!contract) {
      const err = { message: '关联合同不存在', code: 'CONTRACT_NOT_FOUND' };
      addFailedRecord(entityType, data, err, userId);
      return { success: false, ...err };
    }
    if (contract.status === CONTRACT_STATUS.FROZEN) {
      const err = { message: '合同已冻结，无法操作', code: 'CONTRACT_FROZEN' };
      addFailedRecord(entityType, data, err, userId);
      return { success: false, ...err };
    }
  }

  if (data.totalAmount !== undefined && (isNaN(parseFloat(data.totalAmount)) || parseFloat(data.totalAmount) <= 0)) {
    const err = { message: '合同总金额必须是正数', code: 'INVALID_AMOUNT' };
    addFailedRecord(entityType, data, err, userId);
    return { success: false, ...err };
  }

  if (data.dueAmount !== undefined && (isNaN(parseFloat(data.dueAmount)) || parseFloat(data.dueAmount) <= 0)) {
    const err = { message: '付款金额必须是正数', code: 'INVALID_AMOUNT' };
    addFailedRecord(entityType, data, err, userId);
    return { success: false, ...err };
  }

  return createFn(data, userId);
}

function createConfirmation(data, userId) {
  return safeCreate('confirmation', data, userId, (rawData, uid) => {
    const db = getDB();

    const existing = Object.values(db.confirmations).find(c => c.idempotencyKey === rawData.idempotencyKey);
    if (existing) {
      return { success: true, data: existing, isUpdate: true };
    }

    if (!Object.values(CONFIRMATION_TYPES).includes(rawData.confirmationType)) {
      const err = { message: '无效的确认单类型', code: 'INVALID_TYPE' };
      addFailedRecord('confirmation', rawData, err, uid);
      return { success: false, ...err };
    }

    const paymentNode = getPaymentNode(rawData.paymentNodeId);
    if (!paymentNode) {
      const err = { message: '关联付款节点不存在', code: 'PAYMENT_NODE_NOT_FOUND' };
      addFailedRecord('confirmation', rawData, err, uid);
      return { success: false, ...err };
    }

    const confirmationId = rawData.confirmationId || `CF-${Date.now()}`;
    const now = new Date().toISOString();

    const confirmation = {
      id: confirmationId,
      idempotencyKey: rawData.idempotencyKey,
      contractId: rawData.contractId,
      paymentNodeId: rawData.paymentNodeId,
      confirmationType: rawData.confirmationType,
      confirmingParty: rawData.confirmingParty,
      confirmedBy: rawData.confirmedBy || '',
      confirmedAt: rawData.confirmedAt || now,
      confirmationContent: rawData.confirmationContent || '',
      documentHash: rawData.documentHash || '',
      adjustments: rawData.adjustments || [],
      originalDueAmount: paymentNode.dueAmount,
      adjustedDueAmount: rawData.adjustedDueAmount || paymentNode.dueAmount,
      adjustedDueDate: rawData.adjustedDueDate || paymentNode.dueDate,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      approvalNotes: '',
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
      customFields: rawData.customFields || {}
    };

    db.confirmations[confirmationId] = confirmation;
    persist();

    return { success: true, data: confirmation, isUpdate: false };
  }, ['contractId', 'paymentNodeId', 'confirmationType', 'confirmingParty']);
}

function approveConfirmation(confirmationId, approvalNotes, userId) {
  const permCheck = checkPermission(userId, 'canApprove', 'confirmation');
  if (!permCheck.success) {
    addFailedRecord('confirmation', { confirmationId, approvalNotes }, permCheck, userId);
    return permCheck;
  }

  const db = getDB();
  const confirmation = db.confirmations[confirmationId];

  if (!confirmation) {
    const err = { message: '确认单不存在', code: 'NOT_FOUND' };
    addFailedRecord('confirmation', { confirmationId }, err, userId);
    return { success: false, ...err };
  }

  const contract = getContract(confirmation.contractId);
  if (contract && contract.status === CONTRACT_STATUS.FROZEN) {
    const err = { message: '合同已冻结，无法审批确认单', code: 'CONTRACT_FROZEN' };
    addFailedRecord('confirmation', { confirmationId }, err, userId);
    return { success: false, ...err };
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

function listFailedRecords(filters = {}) {
  const db = getDB();
  let results = [...db.failedRecords];
  
  if (filters.resolved !== undefined) {
    const isResolved = filters.resolved === true || filters.resolved === 'true';
    results = results.filter(r => r.resolved === isResolved);
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
  listFailedRecords,
  safeCreate
};
