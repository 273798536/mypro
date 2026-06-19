const { run, get, all } = require('../db');
const { v4: uuidv4 } = require('uuid');

const ENTITY_TYPES = {
  MIGRATION: 'migration',
  REVIEW_ITEM: 'review_item',
  MATERIAL: 'material',
  CONCLUSION: 'conclusion',
  REVIEW_ROUND: 'review_round'
};

const ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  APPROVE: 'approve',
  REJECT: 'reject',
  REEVALUATE: 'reevaluate',
  IMPORT: 'import',
  COMPLETE: 'complete',
  STATUS_CHANGE: 'status_change'
};

async function createAuditLog({ entity_type, entity_id, action, field_name = null, old_value = null, new_value = null, reason = null, operator }) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await run(
    `INSERT INTO audit_logs (id, entity_type, entity_id, action, field_name, old_value, new_value, reason, operator, operated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, entity_type, entity_id, action, field_name, old_value ? JSON.stringify(old_value) : null, new_value ? JSON.stringify(new_value) : null, reason, operator, now]
  );

  return getAuditLogById(id);
}

async function getAuditLogById(id) {
  const row = await get('SELECT * FROM audit_logs WHERE id = ?', [id]);
  if (!row) return null;
  return parseAuditLogRow(row);
}

async function getAuditLogsByEntity(entity_type, entity_id) {
  const rows = await all(
    'SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY operated_at DESC',
    [entity_type, entity_id]
  );
  return rows.map(parseAuditLogRow);
}

async function getAuditLogsByOperator(operator) {
  const rows = await all(
    'SELECT * FROM audit_logs WHERE operator = ? ORDER BY operated_at DESC',
    [operator]
  );
  return rows.map(parseAuditLogRow);
}

async function listAuditLogs({ entity_type, action, operator, limit = 100 } = {}) {
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (entity_type) {
    sql += ' AND entity_type = ?';
    params.push(entity_type);
  }
  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }
  if (operator) {
    sql += ' AND operator = ?';
    params.push(operator);
  }

  sql += ' ORDER BY operated_at DESC LIMIT ?';
  params.push(limit);

  const rows = await all(sql, params);
  return rows.map(parseAuditLogRow);
}

function parseAuditLogRow(row) {
  return {
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    action: row.action,
    field_name: row.field_name,
    old_value: row.old_value ? JSON.parse(row.old_value) : null,
    new_value: row.new_value ? JSON.parse(row.new_value) : null,
    reason: row.reason,
    operator: row.operator,
    operated_at: row.operated_at
  };
}

module.exports = {
  ENTITY_TYPES,
  ACTIONS,
  createAuditLog,
  getAuditLogById,
  getAuditLogsByEntity,
  getAuditLogsByOperator,
  listAuditLogs
};
