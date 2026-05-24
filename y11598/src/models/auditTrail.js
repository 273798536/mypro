const { getDb, generateId } = require('./db');

const ACTION_TYPES = {
  SEED: 'seed',
  SERVER_START: 'server_start',
  REQUEST: 'request',
  RECONCILE: 'reconcile',
  EXPORT: 'export',
  ERROR: 'error',
  DATA_IMPORT: 'data_import',
  DATA_UPDATE: 'data_update',
  DIRTY_HANDLE: 'dirty_handle',
};

const ACTION_STATUSES = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
  PARTIAL: 'partial',
};

function createAuditTrail(trail) {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO audit_trails (
      id, action_type, action_subtype, operator, status, detail,
      source_file, record_count, error_message, request_id,
      ip_address, user_agent, duration_ms, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    trail.action_type,
    trail.action_subtype || null,
    trail.operator || 'system',
    trail.status,
    trail.detail || null,
    trail.source_file || null,
    trail.record_count || null,
    trail.error_message || null,
    trail.request_id || null,
    trail.ip_address || null,
    trail.user_agent || null,
    trail.duration_ms || null,
    now
  );

  return id;
}

function getAuditTrails(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM audit_trails WHERE 1=1';
  const params = [];

  if (filters.action_type) {
    sql += ' AND action_type = ?';
    params.push(filters.action_type);
  }
  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.start_time) {
    sql += ' AND created_at >= ?';
    params.push(filters.start_time);
  }
  if (filters.end_time) {
    sql += ' AND created_at <= ?';
    params.push(filters.end_time);
  }

  sql += ' ORDER BY created_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  return db.prepare(sql).all(...params);
}

function getAuditTrailById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM audit_trails WHERE id = ?').get(id);
}

module.exports = {
  ACTION_TYPES,
  ACTION_STATUSES,
  createAuditTrail,
  getAuditTrails,
  getAuditTrailById,
};
