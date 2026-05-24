const { v4: uuidv4 } = require('uuid');
const { getDB, persist } = require('./storage');
const { getContract, CONTRACT_STATUS } = require('./Contract');
const { getPaymentNode, NODE_STATUS, updateNodeStatus } = require('./PaymentNode');

function createAcceptanceEmail(data, userId) {
  const db = getDB();

  if (!data.idempotencyKey) {
    return { success: false, error: '缺少幂等键 idempotencyKey', code: 'MISSING_IDEMPOTENCY_KEY' };
  }

  const existing = Object.values(db.acceptanceEmails).find(e => e.idempotencyKey === data.idempotencyKey);
  if (existing) {
    return { success: true, data: existing, isUpdate: true };
  }

  const required = ['contractId', 'paymentNodeId', 'emailSubject', 'emailFrom', 'emailDate'];
  for (const field of required) {
    if (!data[field]) {
      return { success: false, error: `缺少必填字段: ${field}`, code: 'MISSING_REQUIRED_FIELD' };
    }
  }

  const contract = getContract(data.contractId);
  if (!contract) {
    return { success: false, error: '关联合同不存在', code: 'CONTRACT_NOT_FOUND' };
  }

  if (contract.status === CONTRACT_STATUS.FROZEN) {
    return { success: false, error: '合同已冻结，无法新增验收邮件', code: 'CONTRACT_FROZEN' };
  }

  const paymentNode = getPaymentNode(data.paymentNodeId);
  if (!paymentNode) {
    return { success: false, error: '关联付款节点不存在', code: 'PAYMENT_NODE_NOT_FOUND' };
  }

  const emailId = data.emailId || `AE-${Date.now()}`;
  const now = new Date().toISOString();

  const email = {
    id: emailId,
    idempotencyKey: data.idempotencyKey,
    contractId: data.contractId,
    paymentNodeId: data.paymentNodeId,
    emailSubject: data.emailSubject,
    emailFrom: data.emailFrom,
    emailTo: data.emailTo || '',
    emailCc: data.emailCc || '',
    emailDate: data.emailDate,
    emailBody: data.emailBody || '',
    emailHash: data.emailHash || '',
    attachments: data.attachments || [],
    acceptanceResult: data.acceptanceResult || 'pending',
    reviewNotes: data.reviewNotes || '',
    reviewedBy: null,
    reviewedAt: null,
    status: data.status || 'submitted',
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    customFields: data.customFields || {}
  };

  db.acceptanceEmails[emailId] = email;

  if (paymentNode.status === NODE_STATUS.PENDING) {
    updateNodeStatus(data.paymentNodeId, NODE_STATUS.ACCEPTED, userId, '通过验收邮件触发');
  }

  persist();
  return { success: true, data: email, isUpdate: false };
}

function getAcceptanceEmail(emailId) {
  const db = getDB();
  return db.acceptanceEmails[emailId] || null;
}

function reviewAcceptanceEmail(emailId, result, reviewNotes, userId) {
  const db = getDB();
  const email = db.acceptanceEmails[emailId];

  if (!email) {
    return { success: false, error: '验收邮件不存在', code: 'NOT_FOUND' };
  }

  const contract = getContract(email.contractId);
  if (contract && contract.status === CONTRACT_STATUS.FROZEN) {
    return { success: false, error: '合同已冻结，无法复核', code: 'CONTRACT_FROZEN' };
  }

  const now = new Date().toISOString();
  email.acceptanceResult = result;
  email.reviewNotes = reviewNotes;
  email.reviewedBy = userId;
  email.reviewedAt = now;
  email.status = result === 'pass' ? 'approved' : 'rejected';
  email.updatedAt = now;
  email.updatedBy = userId;

  if (result === 'pass') {
    updateNodeStatus(email.paymentNodeId, NODE_STATUS.ACCEPTED, userId, '验收邮件复核通过');
  }

  db.versionHistory.push({
    id: uuidv4(),
    entityType: 'acceptanceEmail',
    entityId: emailId,
    action: 'review',
    changedBy: userId,
    changedAt: now,
    snapshot: { result, reviewNotes }
  });

  persist();
  return { success: true, data: email };
}

function listAcceptanceEmails(filters = {}) {
  const db = getDB();
  let results = Object.values(db.acceptanceEmails);

  if (filters.contractId) {
    results = results.filter(e => e.contractId === filters.contractId);
  }
  if (filters.paymentNodeId) {
    results = results.filter(e => e.paymentNodeId === filters.paymentNodeId);
  }
  if (filters.status) {
    results = results.filter(e => e.status === filters.status);
  }

  return results.sort((a, b) => new Date(b.emailDate) - new Date(a.emailDate));
}

module.exports = {
  createAcceptanceEmail,
  getAcceptanceEmail,
  reviewAcceptanceEmail,
  listAcceptanceEmails
};
