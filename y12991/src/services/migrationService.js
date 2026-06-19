const migrationDao = require('../dao/migrationDao');
const reviewDao = require('../dao/reviewDao');
const auditDao = require('../dao/auditDao');
const { ENTITY_TYPES, ACTIONS } = auditDao;
const { MIGRATION_STATUS } = migrationDao;

async function createMigration(data, operator) {
  const migration = await migrationDao.createMigration(data);

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.MIGRATION,
    entity_id: migration.id,
    action: ACTIONS.CREATE,
    reason: `创建迁移记录: ${migration.migration_name}`,
    operator
  });

  return migration;
}

async function getMigration(id) {
  const migration = await migrationDao.getMigrationById(id);
  if (!migration) return null;

  const rounds = await reviewDao.getReviewRoundsByMigration(id);
  return {
    ...migration,
    review_rounds: rounds
  };
}

async function listMigrations(filters) {
  return migrationDao.listMigrations(filters);
}

async function startReview(migrationId, reviewer) {
  const migration = await migrationDao.getMigrationById(migrationId);
  if (!migration) throw new Error('迁移记录不存在');

  const oldStatus = migration.status;
  const newStatus = MIGRATION_STATUS.REVIEWING;

  const round = await reviewDao.createReviewRound({
    migration_record_id: migrationId,
    reviewer
  });

  await migrationDao.updateCurrentReviewRound(migrationId, round.id);
  await migrationDao.updateMigrationStatus(migrationId, newStatus);

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.MIGRATION,
    entity_id: migrationId,
    action: ACTIONS.STATUS_CHANGE,
    field_name: 'status',
    old_value: oldStatus,
    new_value: newStatus,
    reason: '开始复核',
    operator: reviewer
  });

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.REVIEW_ROUND,
    entity_id: round.id,
    action: ACTIONS.CREATE,
    reason: `创建第${round.round_number}轮复核`,
    operator: reviewer
  });

  return {
    migration: await migrationDao.getMigrationById(migrationId),
    round
  };
}

async function approveMigration(migrationId, operator, reason = '') {
  const migration = await migrationDao.getMigrationById(migrationId);
  if (!migration) throw new Error('迁移记录不存在');

  const oldStatus = migration.status;
  const newStatus = MIGRATION_STATUS.APPROVED;

  await migrationDao.updateMigrationStatus(migrationId, newStatus);

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.MIGRATION,
    entity_id: migrationId,
    action: ACTIONS.APPROVE,
    field_name: 'status',
    old_value: oldStatus,
    new_value: newStatus,
    reason: reason || '复核通过',
    operator
  });

  return migrationDao.getMigrationById(migrationId);
}

async function rejectMigration(migrationId, operator, reason = '') {
  const migration = await migrationDao.getMigrationById(migrationId);
  if (!migration) throw new Error('迁移记录不存在');

  const oldStatus = migration.status;
  const newStatus = MIGRATION_STATUS.REJECTED;

  await migrationDao.updateMigrationStatus(migrationId, newStatus);

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.MIGRATION,
    entity_id: migrationId,
    action: ACTIONS.REJECT,
    field_name: 'status',
    old_value: oldStatus,
    new_value: newStatus,
    reason: reason || '复核不通过',
    operator
  });

  return migrationDao.getMigrationById(migrationId);
}

async function reevaluateMigration(migrationId, operator, reason = '') {
  const migration = await migrationDao.getMigrationById(migrationId);
  if (!migration) throw new Error('迁移记录不存在');

  const oldStatus = migration.status;
  const newStatus = MIGRATION_STATUS.REEVALUATED;

  await migrationDao.updateMigrationStatus(migrationId, newStatus);

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.MIGRATION,
    entity_id: migrationId,
    action: ACTIONS.REEVALUATE,
    field_name: 'status',
    old_value: oldStatus,
    new_value: newStatus,
    reason: reason || '重新评估',
    operator
  });

  return migrationDao.getMigrationById(migrationId);
}

async function updateLockWaitIssue(migrationId, hasIssue, materialId, operator) {
  const migration = await migrationDao.getMigrationById(migrationId);
  if (!migration) throw new Error('迁移记录不存在');

  const result = await migrationDao.updateMigrationLockWait(migrationId, hasIssue, materialId);

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.MIGRATION,
    entity_id: migrationId,
    action: ACTIONS.UPDATE,
    field_name: 'lock_wait_issue',
    old_value: migration.lock_wait_issue,
    new_value: hasIssue,
    reason: hasIssue ? '发现锁等待过长问题' : '锁等待问题已解决',
    operator
  });

  return result;
}

module.exports = {
  createMigration,
  getMigration,
  listMigrations,
  startReview,
  approveMigration,
  rejectMigration,
  reevaluateMigration,
  updateLockWaitIssue,
  MIGRATION_STATUS
};
