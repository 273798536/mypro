const { Parser } = require('json2csv');
const { ChangeOrder, ReferenceRecord, ReviewOpinion, Snapshot, AuditLog } = require('../models');
const auditService = require('./auditService');

const SENSITIVE_FIELDS = ['customerPhone', 'phone', 'mobile', 'email', 'idCard', 'idcard', 'bankCard', 'bankcard', 'address', 'password'];

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) return '**@' + domain;
  return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1) + '@' + domain;
}

function maskIdCard(idCard) {
  if (!idCard || typeof idCard !== 'string') return idCard;
  if (idCard.length === 18) {
    return idCard.substring(0, 6) + '********' + idCard.substring(14);
  }
  return idCard;
}

function maskString(str) {
  return '*'.repeat(str.length);
}

function desensitizeData(data, sensitiveFields = []) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => desensitizeData(item, sensitiveFields));
  }

  const result = {};
  const allSensitiveFields = [...SENSITIVE_FIELDS, ...sensitiveFields];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = allSensitiveFields.some(field => 
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive && typeof value === 'string') {
      if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
        result[key] = maskPhone(value);
      } else if (lowerKey.includes('email')) {
        result[key] = maskEmail(value);
      } else if (lowerKey.includes('idcard') || lowerKey.includes('id_card')) {
        result[key] = maskIdCard(value);
      } else {
        result[key] = value.substring(0, Math.min(3, value.length)) + '***';
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = desensitizeData(value, sensitiveFields);
    } else {
      result[key] = value;
    }
  }

  return result;
}

async function exportChangeOrders(options = {}) {
  const {
    status,
    startTime,
    endTime,
    applicantId,
    knowledgeId,
    desensitize = true,
    format = 'json'
  } = options;

  const where = {};
  if (status) where.status = status;
  if (applicantId) where.applicantId = applicantId;
  if (knowledgeId) where.knowledgeId = knowledgeId;
  
  if (startTime || endTime) {
    where.createdAt = {};
    if (startTime) where.createdAt.$gte = new Date(startTime);
    if (endTime) where.createdAt.$lte = new Date(endTime);
  }

  const data = await ChangeOrder.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [{ model: ReviewOpinion, as: 'reviews' }]
  });

  const jsonData = data.map(item => item.toJSON());
  
  return desensitize ? desensitizeData(jsonData) : jsonData;
}

async function exportReferenceRecords(options = {}) {
  const {
    knowledgeId,
    agentId,
    isOfflineContent,
    isErrorClaim,
    startTime,
    endTime,
    desensitize = true,
    format = 'json'
  } = options;

  const where = {};
  if (knowledgeId) where.knowledgeId = knowledgeId;
  if (agentId) where.agentId = agentId;
  if (typeof isOfflineContent === 'boolean') where.isOfflineContent = isOfflineContent;
  if (typeof isErrorClaim === 'boolean') where.isErrorClaim = isErrorClaim;
  
  if (startTime || endTime) {
    where.referenceTime = {};
    if (startTime) where.referenceTime.$gte = new Date(startTime);
    if (endTime) where.referenceTime.$lte = new Date(endTime);
  }

  const data = await ReferenceRecord.findAll({
    where,
    order: [['referenceTime', 'DESC']]
  });

  const jsonData = data.map(item => item.toJSON());
  
  return desensitize ? desensitizeData(jsonData) : jsonData;
}

async function exportAuditLogs(options = {}) {
  const {
    entityType,
    operatorId,
    operatorRole,
    action,
    startTime,
    endTime,
    desensitize = true,
    format = 'json'
  } = options;

  const data = await auditService.queryAuditLogs({
    entityType,
    operatorId,
    operatorRole,
    action,
    startTime,
    endTime,
    pageSize: 10000
  });

  const jsonData = data.list.map(item => item.toJSON());
  
  return desensitize ? desensitizeData(jsonData) : jsonData;
}

function convertToCSV(data, fields) {
  try {
    const parser = new Parser({ fields });
    return parser.parse(data);
  } catch (error) {
    console.error('CSV conversion error:', error);
    throw error;
  }
}

async function generateReport(options = {}) {
  const {
    reportType = 'SUMMARY',
    startTime,
    endTime,
    desensitize = true
  } = options;

  const changeOrders = await exportChangeOrders({ startTime, endTime, desensitize });
  const references = await exportReferenceRecords({ startTime, endTime, desensitize });

  const statusStats = {};
  changeOrders.forEach(order => {
    statusStats[order.status] = (statusStats[order.status] || 0) + 1;
  });

  const roleStats = {};
  changeOrders.forEach(order => {
    const role = order.applicantRole || 'UNKNOWN';
    roleStats[role] = (roleStats[role] || 0) + 1;
  });

  const offlineReferenceCount = references.filter(r => r.isOfflineContent).length;
  const errorClaimCount = references.filter(r => r.isErrorClaim).length;
  const totalErrorClaimAmount = references.reduce((sum, r) => sum + (parseFloat(r.errorClaimAmount) || 0), 0);

  return {
    reportType,
    period: { startTime, endTime },
    generatedAt: new Date().toISOString(),
    summary: {
      totalChangeOrders: changeOrders.length,
      statusDistribution: statusStats,
      roleDistribution: roleStats,
      totalReferences: references.length,
      offlineContentReferences: offlineReferenceCount,
      errorClaimCount,
      totalErrorClaimAmount
    },
    details: {
      changeOrders,
      references
    }
  };
}

module.exports = {
  desensitizeData,
  maskPhone,
  maskEmail,
  maskIdCard,
  exportChangeOrders,
  exportReferenceRecords,
  exportAuditLogs,
  convertToCSV,
  generateReport
};
