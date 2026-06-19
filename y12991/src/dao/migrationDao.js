const { run, get, all } = require('../db');
const { v4: uuidv4 } = require('uuid');

const MIGRATION_STATUS = {
  PENDING: 'pending',
  REVIEWING: 'reviewing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REEVALUATED: 'reevaluated'
};

async function createMigration({ migration_name, environment, execution_count = 1 }) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await run(
    `INSERT INTO migration_records (id, migration_name, environment, execution_count, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, migration_name, environment, execution_count, MIGRATION_STATUS.PENDING, now, now]
  );

  return getMigrationById(id);
}

async function getMigrationById(id) {
  const row = await get('SELECT * FROM migration_records WHERE id = ?', [id]);
  if (!row) return null;
  return parseMigrationRow(row);
}

async function updateMigrationStatus(id, status) {
  const now = new Date().toISOString();
  await run(
    'UPDATE migration_records SET status = ?, updated_at = ? WHERE id = ?',
    [status, now, id]
  );
  return getMigrationById(id);
}

async function updateMigrationLockWait(id, hasIssue, materialId = null) {
  const now = new Date().toISOString();
  await run(
    'UPDATE migration_records SET lock_wait_issue = ?, lock_wait_material_id = ?, updated_at = ? WHERE id = ?',
    [hasIssue ? 1 : 0, materialId, now, id]
  );
  return getMigrationById(id);
}

async function updateCurrentReviewRound(migrationId, roundId) {
  const now = new Date().toISOString();
  await run(
    'UPDATE migration_records SET current_review_round_id = ?, updated_at = ? WHERE id = ?',
    [roundId, now, migrationId]
  );
  return getMigrationById(migrationId);
}

async function listMigrations({ status, environment } = {}) {
  let sql = 'SELECT * FROM migration_records WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (environment) {
    sql += ' AND environment = ?';
    params.push(environment);
  }

  sql += ' ORDER BY created_at DESC';
  const rows = await all(sql, params);
  return rows.map(parseMigrationRow);
}

function parseMigrationRow(row) {
  return {
    id: row.id,
    migration_name: row.migration_name,
    environment: row.environment,
    execution_count: row.execution_count,
    status: row.status,
    current_review_round_id: row.current_review_round_id,
    lock_wait_issue: row.lock_wait_issue === 1,
    lock_wait_material_id: row.lock_wait_material_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

module.exports = {
  MIGRATION_STATUS,
  createMigration,
  getMigrationById,
  updateMigrationStatus,
  updateMigrationLockWait,
  updateCurrentReviewRound,
  listMigrations
};
