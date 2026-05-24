const { v4: uuidv4 } = require('uuid');
const { getDB, persist } = require('./storage');
const { getContract, CONTRACT_STATUS } = require('./Contract');

const NODE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  CONFIRMED: 'confirmed',
  PAID: 'paid',
  CANCELLED: 'cancelled'
};

function validateNodeData(data) {
  const errors = [];
  const required = ['contractId', 'nodeName', 'dueAmount', 'dueDate'];
  for (const field of required) {
    if (!data[field]) {
      errors.push(`缺少必填字段: ${field}`);
    }
  }
  if (data.dueAmount && isNaN(parseFloat(data.dueAmount))) {
    errors.push('付款金额必须是数字');
  }
  return errors;
}

function createPaymentNode(data, userId) {
  const db = getDB();

  if (!data.idempotencyKey) {
    return { success: false, error: '缺少幂等键 idempotencyKey', code: 'MISSING_IDEMPOTENCY_KEY' };
  }

  const existing = Object.values(db.paymentNodes).find(n => n.idempotencyKey === data.idempotencyKey);
  if (existing) {
    return { success: true, data: existing, isUpdate: true };
  }

  const errors = validateNodeData(data);
  if (errors.length > 0) {
    return { success: false, error: errors.join('; '), code: 'VALIDATION_ERROR' };
  }

  const contract = getContract(data.contractId);
  if (!contract) {
    return { success: false, error: '关联合同不存在', code: 'CONTRACT_NOT_FOUND' };
  }

  if (contract.status === CONTRACT_STATUS.FROZEN) {
    return { success: false, error: '合同已冻结，无法新增付款节点', code: 'CONTRACT_FROZEN' };
  }

  const nodeId = data.nodeId || `PN-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();

  const node = {
    id: nodeId,
    idempotencyKey: data.idempotencyKey,
    contractId: data.contractId,
    nodeName: data.nodeName,
    nodeType: data.nodeType || 'milestone',
    dueAmount: parseFloat(data.dueAmount),
    currency: data.currency || contract.currency,
    dueDate: data.dueDate,
    actualDate: data.actualDate || null,
    status: NODE_STATUS.PENDING,
    description: data.description || '',
    batchId: data.batchId || null,
    sequence: data.sequence || getNextSequence(data.contractId),
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    customFields: data.customFields || {}
  };

  db.paymentNodes[nodeId] = node;
  persist();

  return { success: true, data: node, isUpdate: false };
}

function getNextSequence(contractId) {
  const db = getDB();
  const nodes = Object.values(db.paymentNodes).filter(n => n.contractId === contractId);
  return nodes.length + 1;
}

function getPaymentNode(nodeId) {
  const db = getDB();
  return db.paymentNodes[nodeId] || null;
}

function updatePaymentNode(nodeId, data, userId) {
  const db = getDB();
  const node = db.paymentNodes[nodeId];

  if (!node) {
    return { success: false, error: '付款节点不存在', code: 'NOT_FOUND' };
  }

  const contract = getContract(node.contractId);
  if (contract && contract.status === CONTRACT_STATUS.FROZEN) {
    return { success: false, error: '合同已冻结，无法修改付款节点', code: 'CONTRACT_FROZEN' };
  }

  const now = new Date().toISOString();
  const updatableFields = [
    'nodeName', 'nodeType', 'dueAmount', 'currency', 'dueDate',
    'actualDate', 'description', 'sequence', 'customFields'
  ];

  for (const field of updatableFields) {
    if (data[field] !== undefined) {
      node[field] = data[field];
    }
  }

  node.updatedAt = now;
  node.updatedBy = userId;

  persist();
  return { success: true, data: node };
}

function updateNodeStatus(nodeId, newStatus, userId, notes = '') {
  const db = getDB();
  const node = db.paymentNodes[nodeId];

  if (!node) {
    return { success: false, error: '付款节点不存在', code: 'NOT_FOUND' };
  }

  if (!Object.values(NODE_STATUS).includes(newStatus)) {
    return { success: false, error: '无效的状态值', code: 'INVALID_STATUS' };
  }

  const contract = getContract(node.contractId);
  if (contract && contract.status === CONTRACT_STATUS.FROZEN && newStatus !== node.status) {
    return { success: false, error: '合同已冻结，无法修改状态', code: 'CONTRACT_FROZEN' };
  }

  const oldStatus = node.status;
  node.status = newStatus;
  node.updatedAt = new Date().toISOString();
  node.updatedBy = userId;

  db.versionHistory.push({
    id: uuidv4(),
    entityType: 'paymentNode',
    entityId: nodeId,
    version: 0,
    action: 'status_change',
    changedBy: userId,
    changedAt: node.updatedAt,
    snapshot: {
      nodeId,
      oldStatus,
      newStatus,
      notes
    }
  });

  persist();
  return { success: true, data: node };
}

function listPaymentNodes(filters = {}) {
  const db = getDB();
  let results = Object.values(db.paymentNodes);

  if (filters.contractId) {
    results = results.filter(n => n.contractId === filters.contractId);
  }
  if (filters.status) {
    results = results.filter(n => n.status === filters.status);
  }
  if (filters.batchId) {
    results = results.filter(n => n.batchId === filters.batchId);
  }

  return results.sort((a, b) => {
    if (a.contractId === b.contractId) {
      return a.sequence - b.sequence;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function calculateContractProgress(contractId) {
  const nodes = listPaymentNodes({ contractId });
  if (nodes.length === 0) return { total: 0, completed: 0, percentage: 0 };

  const total = nodes.reduce((sum, n) => sum + n.dueAmount, 0);
  const completed = nodes
    .filter(n => [NODE_STATUS.CONFIRMED, NODE_STATUS.PAID].includes(n.status))
    .reduce((sum, n) => sum + n.dueAmount, 0);

  return {
    total,
    completed,
    pending: total - completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    nodeCount: nodes.length,
    completedNodeCount: nodes.filter(n => n.status !== NODE_STATUS.PENDING).length
  };
}

module.exports = {
  NODE_STATUS,
  createPaymentNode,
  getPaymentNode,
  updatePaymentNode,
  updateNodeStatus,
  listPaymentNodes,
  calculateContractProgress
};
