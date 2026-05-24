const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const generateId = () => uuidv4();

const generateIdempotentKey = (...args) => {
  const str = args.join('|');
  return crypto.createHash('sha256').update(str).digest('hex');
};

const generateWaveNo = (prefix = 'W') => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${dateStr}${random}`;
};

const generateTaskNo = (prefix = 'R') => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${dateStr}${random}`;
};

const isValidStatusTransition = (transitions, fromStatus, toStatus) => {
  const allowed = transitions[fromStatus] || [];
  return allowed.includes(toStatus);
};

const formatDateTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 19);
};

const parseJSON = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

const omit = (obj, keys) => {
  return Object.keys(obj)
    .filter(key => !keys.includes(key))
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
};

module.exports = {
  generateId,
  generateIdempotentKey,
  generateWaveNo,
  generateTaskNo,
  isValidStatusTransition,
  formatDateTime,
  parseJSON,
  pick,
  omit
};
