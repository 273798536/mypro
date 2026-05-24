const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

function generateId() {
  return uuidv4();
}

function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function generateSignature(data) {
  const str = JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

const RETURN_STATUSES = {
  CREATED: 'CREATED',
  ATTACHMENT_UPLOADED: 'ATTACHMENT_UPLOADED',
  INSPECTED: 'INSPECTED',
  REVIEWED: 'REVIEWED',
  FROZEN: 'FROZEN',
  SETTLED: 'SETTLED',
  ARCHIVED: 'ARCHIVED',
  CANCELED: 'CANCELED',
  EXCEPTION: 'EXCEPTION'
};

const OPERATION_TYPES = {
  CREATE_BATCH: 'CREATE_BATCH',
  UPLOAD_ATTACHMENT: 'UPLOAD_ATTACHMENT',
  QUALITY_INSPECTION: 'QUALITY_INSPECTION',
  REVIEW: 'REVIEW',
  REVIEW_REVISE: 'REVIEW_REVISE',
  FREEZE: 'FREEZE',
  UNFREEZE: 'UNFREEZE',
  SETTLE: 'SETTLE',
  ARCHIVE: 'ARCHIVE',
  CANCEL: 'CANCEL',
  MEMBER_CANCEL: 'MEMBER_CANCEL',
  REENTRY: 'REENTRY'
};

const ATTACHMENT_TYPES = {
  RETURN_APPLICATION: 'RETURN_APPLICATION',
  QUALITY_PHOTO: 'QUALITY_PHOTO',
  LOGISTICS_RECEIPT: 'LOGISTICS_RECEIPT',
  SUPPLIER_STATEMENT: 'SUPPLIER_STATEMENT',
  OTHER: 'OTHER'
};

module.exports = {
  generateId,
  getCurrentTimestamp,
  generateSignature,
  formatDate,
  RETURN_STATUSES,
  OPERATION_TYPES,
  ATTACHMENT_TYPES
};
