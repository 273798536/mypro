const { getDb, generateId, transaction } = require('./db');

const DIRTY_TYPES = {
  MISSING_FIELD: 'missing_field',
  CROSS_DATE: 'cross_date',
  NAME_CHANGE: 'name_change',
  AMOUNT_CONFLICT: 'amount_conflict',
  QUANTITY_CONFLICT: 'quantity_conflict',
  DUPLICATE: 'duplicate',
  INVALID_FORMAT: 'invalid_format',
};

const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const HANDLE_STATUSES = {
  PENDING: 'pending',
  IGNORED: 'ignored',
  FIXED: 'fixed',
  CONFIRMED: 'confirmed',
  RESOLVED: 'resolved',
  REOPENED: 'reopened',
};

function createDirtyRecord(record) {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const existing = db.prepare(`
    SELECT id, status FROM dirty_records
    WHERE source_table = ? AND source_id = ? AND dirty_type = ? AND field_name IS ?
    ORDER BY created_at DESC LIMIT 1
  `).get(
    record.source_table,
    record.source_id,
    record.dirty_type,
    record.field_name || null
  );

  if (existing) {
    if (existing.status === HANDLE_STATUSES.PENDING) {
      return existing.id;
    }
    if (existing.status === HANDLE_STATUSES.RESOLVED) {
      db.prepare(`
        UPDATE dirty_records
        SET status = ?, updated_at = ?
        WHERE id = ?
      `).run(HANDLE_STATUSES.REOPENED, now, existing.id);
      return existing.id;
    }
  }

  const stmt = db.prepare(`
    INSERT INTO dirty_records (
      id, source_table, source_id, dirty_type, field_name,
      expected_value, actual_value, description, severity,
      status, handler, handle_opinion, handle_time,
      raw_data, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    record.source_table,
    record.source_id,
    record.dirty_type,
    record.field_name || null,
    record.expected_value !== undefined ? String(record.expected_value) : null,
    record.actual_value !== undefined ? String(record.actual_value) : null,
    record.description,
    record.severity || 'warning',
    record.status || 'pending',
    null,
    null,
    null,
    JSON.stringify(record.raw_data || {}),
    now,
    now
  );

  return id;
}

function batchCreateDirtyRecords(records) {
  return transaction(() => {
    const results = [];
    for (const record of records) {
      results.push(createDirtyRecord(record));
    }
    return results;
  });
}

function getDirtyRecordById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM dirty_records WHERE id = ?').get(id);
  if (row) {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
  }
  return row;
}

function getDirtyRecords(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM dirty_records WHERE 1=1';
  const params = [];

  if (filters.dirty_type) {
    sql += ' AND dirty_type = ?';
    params.push(filters.dirty_type);
  }
  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.severity) {
    sql += ' AND severity = ?';
    params.push(filters.severity);
  }
  if (filters.source_table) {
    sql += ' AND source_table = ?';
    params.push(filters.source_table);
  }
  if (filters.source_id) {
    sql += ' AND source_id = ?';
    params.push(filters.source_id);
  }

  sql += ' ORDER BY created_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const rows = db.prepare(sql).all(...params);
  return rows.map(row => {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
    return row;
  });
}

function handleDirtyRecord(id, handler, handleOpinion, status = 'fixed') {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = getDirtyRecordById(id);
  if (!existing) return null;

  const stmt = db.prepare(`
    UPDATE dirty_records
    SET status = ?, handler = ?, handle_opinion = ?, handle_time = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(status, handler, handleOpinion, now, now, id);

  return getDirtyRecordById(id);
}

function getDirtyRecordStats(filters = {}) {
  const db = getDb();
  const results = {};

  const typeStats = db.prepare(`
    SELECT dirty_type, COUNT(*) as count, severity
    FROM dirty_records
    WHERE 1=1
    GROUP BY dirty_type, severity
    ORDER BY count DESC
  `).all();

  const statusStats = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM dirty_records
    WHERE 1=1
    GROUP BY status
  `).all();

  results.by_type = typeStats;
  results.by_status = statusStats;
  results.total = typeStats.reduce((sum, t) => sum + t.count, 0);

  return results;
}

function resetPendingDirtyRecords(sourceTable = null) {
  const db = getDb();
  const now = new Date().toISOString();

  let sql = `
    UPDATE dirty_records
    SET status = ?, updated_at = ?
    WHERE status = ?
  `;
  const params = [HANDLE_STATUSES.RESOLVED, now, HANDLE_STATUSES.PENDING];

  if (sourceTable) {
    sql += ' AND source_table = ?';
    params.push(sourceTable);
  }

  const stmt = db.prepare(sql);
  const result = stmt.run(...params);

  return { updated: result.changes };
}

function closeResolvedDirtyRecords(sourceTable, sourceId) {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE dirty_records
    SET status = ?, updated_at = ?
    WHERE source_table = ? AND source_id = ? AND status = ?
  `);

  const result = stmt.run(
    HANDLE_STATUSES.RESOLVED,
    now,
    sourceTable,
    sourceId,
    HANDLE_STATUSES.PENDING
  );

  return { updated: result.changes };
}

function findExistingDirtyRecord(sourceTable, sourceId, dirtyType, fieldName = null) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM dirty_records
    WHERE source_table = ? AND source_id = ? AND dirty_type = ? AND field_name IS ?
    ORDER BY created_at DESC LIMIT 1
  `).get(sourceTable, sourceId, dirtyType, fieldName);
}

module.exports = {
  DIRTY_TYPES,
  SEVERITY_LEVELS,
  HANDLE_STATUSES,
  createDirtyRecord,
  batchCreateDirtyRecords,
  getDirtyRecordById,
  getDirtyRecords,
  handleDirtyRecord,
  getDirtyRecordStats,
  resetPendingDirtyRecords,
  closeResolvedDirtyRecords,
  findExistingDirtyRecord,
};
