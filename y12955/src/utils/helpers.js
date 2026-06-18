const crypto = require('crypto');

class AppError extends Error {
  constructor(message, statusCode, actionableInfo = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.actionableInfo = actionableInfo;
    Error.captureStackTrace(this, this.constructor);
  }
}

function hashContent(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

function generateOrderNo() {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WO-${dateStr}-${random}`;
}

function validateRequired(fields, data) {
  const missing = [];
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    throw new AppError(`缺少必填字段: ${missing.join(', ')}`, 400, {
      missing_fields: missing,
      suggestion: '请检查并补充上述必填字段后重试'
    });
  }
}

function parseJsonSafe(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

const WORK_ORDER_STATUS = {
  DRAFT: 'draft',
  IMPORTING: 'importing',
  REVIEWING: 'reviewing',
  COMPARING: 'comparing',
  AUDITING: 'auditing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const STATUS_FLOW = {
  [WORK_ORDER_STATUS.DRAFT]: [WORK_ORDER_STATUS.IMPORTING, WORK_ORDER_STATUS.REVIEWING],
  [WORK_ORDER_STATUS.IMPORTING]: [WORK_ORDER_STATUS.REVIEWING, WORK_ORDER_STATUS.COMPARING, WORK_ORDER_STATUS.FAILED],
  [WORK_ORDER_STATUS.REVIEWING]: [WORK_ORDER_STATUS.COMPARING, WORK_ORDER_STATUS.FAILED],
  [WORK_ORDER_STATUS.COMPARING]: [WORK_ORDER_STATUS.AUDITING, WORK_ORDER_STATUS.COMPLETED, WORK_ORDER_STATUS.FAILED, WORK_ORDER_STATUS.REVIEWING],
  [WORK_ORDER_STATUS.AUDITING]: [WORK_ORDER_STATUS.COMPLETED, WORK_ORDER_STATUS.FAILED, WORK_ORDER_STATUS.REVIEWING],
  [WORK_ORDER_STATUS.COMPLETED]: [WORK_ORDER_STATUS.REVIEWING],
  [WORK_ORDER_STATUS.FAILED]: [WORK_ORDER_STATUS.DRAFT, WORK_ORDER_STATUS.REVIEWING]
};

function canTransitionStatus(from, to) {
  const allowed = STATUS_FLOW[from];
  return allowed ? allowed.includes(to) : false;
}

module.exports = {
  AppError,
  hashContent,
  generateOrderNo,
  validateRequired,
  parseJsonSafe,
  WORK_ORDER_STATUS,
  STATUS_FLOW,
  canTransitionStatus
};
