const { v4: uuidv4 } = require('uuid');
const { ChangeOrder, ReviewOpinion } = require('../models');
const auditService = require('./auditService');

const STATUS_TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['REJECTED', 'CONFIRMED'],
  REJECTED: ['DRAFT', 'SUBMITTED'],
  CONFIRMED: ['AUDITED'],
  AUDITED: []
};

const ACTION_TO_STATUS = {
  submit: 'SUBMITTED',
  reject: 'REJECTED',
  confirm: 'CONFIRMED',
  audit: 'AUDITED'
};

function generateOrderNo() {
  const timestamp = Date.now().toString(36);
  const random = uuidv4().substring(0, 6);
  return `CO-${timestamp}-${random}`.toUpperCase();
}

function canTransition(currentStatus, targetStatus) {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(targetStatus);
}

async function createDraft(data, operator) {
  const orderNo = data.orderNo || generateOrderNo();
  
  const changeOrder = await ChangeOrder.create({
    ...data,
    orderNo,
    status: 'DRAFT',
    applicantId: operator.userId,
    applicantName: operator.userName,
    applicantRole: operator.role,
    version: 1,
    isLatest: true
  });

  await auditService.createAuditLog({
    entityType: 'CHANGE_ORDER',
    entityId: changeOrder.id,
    entityNo: orderNo,
    action: 'CREATE',
    operatorId: operator.userId,
    operatorName: operator.userName,
    operatorRole: operator.role,
    beforeData: null,
    afterData: changeOrder.toJSON(),
    changeReason: data.changeReason || '创建变更单草稿',
    isSensitive: data.sensitiveFields && data.sensitiveFields.length > 0,
    riskLevel: 'LOW'
  });

  return changeOrder;
}

async function submitChangeOrder(orderId, data, operator) {
  const changeOrder = await ChangeOrder.findByPk(orderId);
  if (!changeOrder) {
    throw new Error('变更单不存在');
  }

  if (!canTransition(changeOrder.status, 'SUBMITTED')) {
    throw new Error(`当前状态 ${changeOrder.status} 不允许提交`);
  }

  const beforeData = changeOrder.toJSON();

  changeOrder.status = 'SUBMITTED';
  changeOrder.submittedAt = new Date();
  if (data.content) changeOrder.content = data.content;
  if (data.changeReason) changeOrder.changeReason = data.changeReason;
  if (data.sensitiveFields) changeOrder.sensitiveFields = data.sensitiveFields;
  
  await changeOrder.save();

  await auditService.createAuditLog({
    entityType: 'CHANGE_ORDER',
    entityId: changeOrder.id,
    entityNo: changeOrder.orderNo,
    action: 'SUBMIT',
    operatorId: operator.userId,
    operatorName: operator.userName,
    operatorRole: operator.role,
    beforeData,
    afterData: changeOrder.toJSON(),
    changeReason: data.changeReason || '提交变更单',
    isSensitive: changeOrder.sensitiveFields && changeOrder.sensitiveFields.length > 0,
    riskLevel: 'MEDIUM'
  });

  return changeOrder;
}

async function rejectChangeOrder(orderId, data, operator) {
  const changeOrder = await ChangeOrder.findByPk(orderId);
  if (!changeOrder) {
    throw new Error('变更单不存在');
  }

  if (!canTransition(changeOrder.status, 'REJECTED')) {
    throw new Error(`当前状态 ${changeOrder.status} 不允许驳回`);
  }

  const beforeData = changeOrder.toJSON();

  changeOrder.status = 'REJECTED';
  changeOrder.rejectedAt = new Date();
  changeOrder.rejectReason = data.rejectReason;
  changeOrder.approverId = operator.userId;
  changeOrder.approverName = operator.userName;
  
  await changeOrder.save();

  await ReviewOpinion.create({
    changeOrderId: changeOrder.id,
    orderNo: changeOrder.orderNo,
    reviewerId: operator.userId,
    reviewerName: operator.userName,
    reviewerRole: operator.role,
    reviewType: 'FIRST_REVIEW',
    result: 'REJECT',
    opinion: data.rejectReason,
    riskLevel: data.riskLevel || 'MEDIUM'
  });

  await auditService.createAuditLog({
    entityType: 'CHANGE_ORDER',
    entityId: changeOrder.id,
    entityNo: changeOrder.orderNo,
    action: 'REJECT',
    operatorId: operator.userId,
    operatorName: operator.userName,
    operatorRole: operator.role,
    beforeData,
    afterData: changeOrder.toJSON(),
    changeReason: data.rejectReason,
    isSensitive: true,
    riskLevel: data.riskLevel || 'MEDIUM'
  });

  return changeOrder;
}

async function confirmChangeOrder(orderId, data, operator) {
  const changeOrder = await ChangeOrder.findByPk(orderId);
  if (!changeOrder) {
    throw new Error('变更单不存在');
  }

  if (!canTransition(changeOrder.status, 'CONFIRMED')) {
    throw new Error(`当前状态 ${changeOrder.status} 不允许二次确认`);
  }

  const beforeData = changeOrder.toJSON();

  changeOrder.status = 'CONFIRMED';
  changeOrder.confirmedAt = new Date();
  changeOrder.approverId = operator.userId;
  changeOrder.approverName = operator.userName;
  
  await changeOrder.save();

  await ReviewOpinion.create({
    changeOrderId: changeOrder.id,
    orderNo: changeOrder.orderNo,
    reviewerId: operator.userId,
    reviewerName: operator.userName,
    reviewerRole: operator.role,
    reviewType: 'SECOND_REVIEW',
    result: 'PASS',
    opinion: data.opinion || '二次确认通过',
    riskLevel: data.riskLevel || 'LOW'
  });

  await auditService.createAuditLog({
    entityType: 'CHANGE_ORDER',
    entityId: changeOrder.id,
    entityNo: changeOrder.orderNo,
    action: 'CONFIRM',
    operatorId: operator.userId,
    operatorName: operator.userName,
    operatorRole: operator.role,
    beforeData,
    afterData: changeOrder.toJSON(),
    changeReason: data.opinion || '二次确认',
    isSensitive: changeOrder.sensitiveFields && changeOrder.sensitiveFields.length > 0,
    riskLevel: data.riskLevel || 'LOW'
  });

  return changeOrder;
}

async function auditChangeOrder(orderId, data, operator) {
  const changeOrder = await ChangeOrder.findByPk(orderId);
  if (!changeOrder) {
    throw new Error('变更单不存在');
  }

  if (!canTransition(changeOrder.status, 'AUDITED')) {
    throw new Error(`当前状态 ${changeOrder.status} 不允许审计归档`);
  }

  const beforeData = changeOrder.toJSON();

  changeOrder.status = 'AUDITED';
  changeOrder.auditedAt = new Date();
  
  await changeOrder.save();

  await ReviewOpinion.create({
    changeOrderId: changeOrder.id,
    orderNo: changeOrder.orderNo,
    reviewerId: operator.userId,
    reviewerName: operator.userName,
    reviewerRole: operator.role,
    reviewType: 'AUDIT',
    result: 'PASS',
    opinion: data.opinion || '审计归档',
    riskLevel: data.riskLevel || 'LOW'
  });

  await auditService.createAuditLog({
    entityType: 'CHANGE_ORDER',
    entityId: changeOrder.id,
    entityNo: changeOrder.orderNo,
    action: 'AUDIT',
    operatorId: operator.userId,
    operatorName: operator.userName,
    operatorRole: operator.role,
    beforeData,
    afterData: changeOrder.toJSON(),
    changeReason: data.opinion || '审计归档',
    isSensitive: true,
    riskLevel: data.riskLevel || 'LOW'
  });

  return changeOrder;
}

async function updateDraft(orderId, data, operator) {
  const changeOrder = await ChangeOrder.findByPk(orderId);
  if (!changeOrder) {
    throw new Error('变更单不存在');
  }

  if (changeOrder.status !== 'DRAFT' && changeOrder.status !== 'REJECTED') {
    throw new Error(`当前状态 ${changeOrder.status} 不允许编辑，只有草稿(DRAFT)或已驳回(REJECTED)状态可以编辑`);
  }

  const beforeData = changeOrder.toJSON();

  if (data.title) changeOrder.title = data.title;
  if (data.type) changeOrder.type = data.type;
  if (data.knowledgeId) changeOrder.knowledgeId = data.knowledgeId;
  if (data.knowledgeTitle) changeOrder.knowledgeTitle = data.knowledgeTitle;
  if (data.content) changeOrder.content = data.content;
  if (data.changeReason) changeOrder.changeReason = data.changeReason;
  if (data.sensitiveFields) changeOrder.sensitiveFields = data.sensitiveFields;
  if (data.extra) changeOrder.extra = data.extra;

  await changeOrder.save();

  await auditService.createAuditLog({
    entityType: 'CHANGE_ORDER',
    entityId: changeOrder.id,
    entityNo: changeOrder.orderNo,
    action: 'UPDATE',
    operatorId: operator.userId,
    operatorName: operator.userName,
    operatorRole: operator.role,
    beforeData,
    afterData: changeOrder.toJSON(),
    changeReason: data.changeReason || '更新草稿',
    isSensitive: data.sensitiveFields && data.sensitiveFields.length > 0,
    riskLevel: 'LOW'
  });

  return changeOrder;
}

async function createNewVersion(orderId, data, operator) {
  const oldOrder = await ChangeOrder.findByPk(orderId);
  if (!oldOrder) {
    throw new Error('变更单不存在');
  }

  await ChangeOrder.update(
    { isLatest: false },
    { where: { id: orderId } }
  );

  const newOrder = await ChangeOrder.create({
    ...oldOrder.toJSON(),
    id: undefined,
    orderNo: generateOrderNo(),
    status: 'DRAFT',
    version: oldOrder.version + 1,
    isLatest: true,
    title: data.title || oldOrder.title,
    content: data.content || oldOrder.content,
    changeReason: data.changeReason || oldOrder.changeReason,
    submittedAt: null,
    rejectedAt: null,
    confirmedAt: null,
    auditedAt: null,
    rejectReason: null,
    applicantId: operator.userId,
    applicantName: operator.userName,
    applicantRole: operator.role,
    createdAt: undefined,
    updatedAt: undefined
  });

  await auditService.createAuditLog({
    entityType: 'CHANGE_ORDER',
    entityId: newOrder.id,
    entityNo: newOrder.orderNo,
    action: 'CREATE',
    operatorId: operator.userId,
    operatorName: operator.userName,
    operatorRole: operator.role,
    beforeData: oldOrder.toJSON(),
    afterData: newOrder.toJSON(),
    changeReason: `基于 ${oldOrder.orderNo} v${oldOrder.version} 创建新版本`,
    isSensitive: newOrder.sensitiveFields && newOrder.sensitiveFields.length > 0,
    riskLevel: 'MEDIUM'
  });

  return newOrder;
}

module.exports = {
  STATUS_TRANSITIONS,
  ACTION_TO_STATUS,
  canTransition,
  createDraft,
  submitChangeOrder,
  rejectChangeOrder,
  confirmChangeOrder,
  auditChangeOrder,
  updateDraft,
  createNewVersion,
  generateOrderNo
};
