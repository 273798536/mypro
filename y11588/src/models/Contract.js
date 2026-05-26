const { v4: uuidv4 } = require('uuid');
const { getDB, persist, addFailedRecord } = require('./storage');
const { checkPermission } = require('../middleware/modelPermission');

const CONTRACT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  FROZEN: 'frozen',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

function createContract(data, userId) {
  const permCheck = checkPermission(userId, 'canCreate', 'contract');
  if (!permCheck.success) {
    addFailedRecord('contract', data, permCheck, userId);
    return permCheck;
  }

  const db = getDB();
  
  if (!data.idempotencyKey) {
    const err = { message: '缺少幂等键 idempotencyKey', code: 'MISSING_IDEMPOTENCY_KEY' };
    addFailedRecord('contract', data, err, userId);
    return { success: false, ...err };
  }

  const existing = Object.values(db.contracts).find(c => c.idempotencyKey === data.idempotencyKey);
  if (existing) {
    return { success: true, data: existing, isUpdate: true };
  }

  const contractId = data.contractId || `CT-${Date.now()}`;
  
  if (db.contracts[contractId]) {
    const err = { message: '合同编号已存在', code: 'DUPLICATE_CONTRACT_ID' };
    addFailedRecord('contract', data, err, userId);
    return { success: false, ...err };
  }

  const required = ['contractName', 'partyA', 'partyB', 'totalAmount', 'pdfHash'];
  for (const field of required) {
    if (!data[field]) {
      const err = { message: `缺少必填字段: ${field}`, code: 'MISSING_REQUIRED_FIELD' };
      addFailedRecord('contract', data, err, userId);
      return { success: false, ...err };
    }
  }

  if (isNaN(parseFloat(data.totalAmount)) || parseFloat(data.totalAmount) <= 0) {
    const err = { message: '合同总金额必须是正数', code: 'INVALID_AMOUNT' };
    addFailedRecord('contract', data, err, userId);
    return { success: false, ...err };
  }

  const now = new Date().toISOString();
  const contract = {
    id: contractId,
    idempotencyKey: data.idempotencyKey,
    contractName: data.contractName,
    contractNumber: data.contractNumber || contractId,
    partyA: data.partyA,
    partyB: data.partyB,
    totalAmount: parseFloat(data.totalAmount),
    currency: data.currency || 'CNY',
    pdfHash: data.pdfHash,
    pdfUrl: data.pdfUrl || '',
    effectiveDate: data.effectiveDate || now,
    expiryDate: data.expiryDate || '',
    status: CONTRACT_STATUS.ACTIVE,
    version: 1,
    parentContractId: data.parentContractId || null,
    isSupplement: !!data.parentContractId,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    frozenAt: null,
    frozenBy: null,
    completedAt: null,
    notes: data.notes || '',
    customFields: data.customFields || {}
  };

  db.contracts[contractId] = contract;
  
  db.versionHistory.push({
    id: uuidv4(),
    entityType: 'contract',
    entityId: contractId,
    version: 1,
    action: 'create',
    changedBy: userId,
    changedAt: now,
    snapshot: JSON.parse(JSON.stringify(contract))
  });

  persist();
  return { success: true, data: contract, isUpdate: false };
}

function getContract(contractId) {
  const db = getDB();
  return db.contracts[contractId] || null;
}

function updateContract(contractId, data, userId) {
  const permCheck = checkPermission(userId, 'canUpdate', 'contract');
  if (!permCheck.success) {
    addFailedRecord('contract', { contractId, ...data }, permCheck, userId);
    return permCheck;
  }

  const db = getDB();
  const contract = db.contracts[contractId];
  
  if (!contract) {
    const err = { message: '合同不存在', code: 'NOT_FOUND' };
    addFailedRecord('contract', { contractId }, err, userId);
    return { success: false, ...err };
  }

  if (contract.status === CONTRACT_STATUS.FROZEN) {
    const err = { message: '合同已冻结，无法修改', code: 'CONTRACT_FROZEN' };
    addFailedRecord('contract', { contractId, action: 'update' }, err, userId);
    return { success: false, ...err };
  }

  const oldVersion = contract.version;
  const now = new Date().toISOString();

  const updatableFields = [
    'contractName', 'partyA', 'partyB', 'totalAmount', 'currency',
    'effectiveDate', 'expiryDate', 'notes', 'customFields'
  ];

  for (const field of updatableFields) {
    if (data[field] !== undefined) {
      contract[field] = data[field];
    }
  }

  contract.version = oldVersion + 1;
  contract.updatedAt = now;
  contract.updatedBy = userId;

  db.versionHistory.push({
    id: uuidv4(),
    entityType: 'contract',
    entityId: contractId,
    version: contract.version,
    action: 'update',
    changedBy: userId,
    changedAt: now,
    snapshot: JSON.parse(JSON.stringify(contract)),
    previousVersion: oldVersion
  });

  persist();
  return { success: true, data: contract };
}

function freezeContract(contractId, userId) {
  const permCheck = checkPermission(userId, 'canFreeze', 'contract');
  if (!permCheck.success) {
    addFailedRecord('contract', { contractId, action: 'freeze' }, permCheck, userId);
    return permCheck;
  }

  const db = getDB();
  const contract = db.contracts[contractId];
  
  if (!contract) {
    const err = { message: '合同不存在', code: 'NOT_FOUND' };
    addFailedRecord('contract', { contractId }, err, userId);
    return { success: false, ...err };
  }

  if (contract.status === CONTRACT_STATUS.FROZEN) {
    return { success: true, data: contract };
  }

  const now = new Date().toISOString();
  contract.status = CONTRACT_STATUS.FROZEN;
  contract.frozenAt = now;
  contract.frozenBy = userId;
  contract.updatedAt = now;
  contract.updatedBy = userId;

  db.versionHistory.push({
    id: uuidv4(),
    entityType: 'contract',
    entityId: contractId,
    version: contract.version,
    action: 'freeze',
    changedBy: userId,
    changedAt: now,
    snapshot: JSON.parse(JSON.stringify(contract))
  });

  persist();
  return { success: true, data: contract };
}

function listContracts(filters = {}) {
  const db = getDB();
  let results = Object.values(db.contracts);

  if (filters.status) {
    results = results.filter(c => c.status === filters.status);
  }
  if (filters.isSupplement !== undefined) {
    const isSupp = filters.isSupplement === true || filters.isSupplement === 'true';
    results = results.filter(c => c.isSupplement === isSupp);
  }
  if (filters.parentContractId) {
    results = results.filter(c => c.parentContractId === filters.parentContractId);
  }

  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getContractVersions(contractId) {
  const db = getDB();
  return db.versionHistory
    .filter(v => v.entityType === 'contract' && v.entityId === contractId)
    .sort((a, b) => b.version - a.version);
}

module.exports = {
  CONTRACT_STATUS,
  createContract,
  getContract,
  updateContract,
  freezeContract,
  listContracts,
  getContractVersions
};
