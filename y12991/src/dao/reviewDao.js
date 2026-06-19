const { run, get, all } = require('../db');
const { v4: uuidv4 } = require('uuid');

const ROUND_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

const ITEM_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REEVALUATED: 'reevaluated'
};

const ITEM_TYPES = {
  PAGINATION_ORDER: 'pagination_order',
  SLOW_QUERY_ATTRIBUTION: 'slow_query_attribution',
  PERMISSION_CHECK: 'permission_check',
  TABLE_STRUCTURE: 'table_structure'
};

async function createReviewRound({ migration_record_id, reviewer }) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const existingRounds = await all(
    'SELECT COUNT(*) as cnt FROM review_rounds WHERE migration_record_id = ?',
    [migration_record_id]
  );
  const round_number = existingRounds[0].cnt + 1;

  await run(
    `INSERT INTO review_rounds (id, migration_record_id, round_number, status, reviewer, started_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, migration_record_id, round_number, ROUND_STATUS.IN_PROGRESS, reviewer, now]
  );

  return getReviewRoundById(id);
}

async function getReviewRoundById(id) {
  const row = await get('SELECT * FROM review_rounds WHERE id = ?', [id]);
  if (!row) return null;
  return parseRoundRow(row);
}

async function getReviewRoundsByMigration(migration_record_id) {
  const rows = await all(
    'SELECT * FROM review_rounds WHERE migration_record_id = ? ORDER BY round_number',
    [migration_record_id]
  );
  return rows.map(parseRoundRow);
}

async function completeReviewRound(id, conclusion_summary) {
  const now = new Date().toISOString();
  await run(
    'UPDATE review_rounds SET status = ?, completed_at = ?, conclusion_summary = ? WHERE id = ?',
    [ROUND_STATUS.COMPLETED, now, conclusion_summary, id]
  );
  return getReviewRoundById(id);
}

async function createReviewItem({ review_round_id, material_id, item_type, initial_conclusion = '' }) {
  const id = uuidv4();

  await run(
    `INSERT INTO review_items (id, review_round_id, material_id, item_type, initial_conclusion, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, review_round_id, material_id, item_type, initial_conclusion, ITEM_STATUS.PENDING]
  );

  return getReviewItemById(id);
}

async function getReviewItemById(id) {
  const row = await get('SELECT * FROM review_items WHERE id = ?', [id]);
  if (!row) return null;
  return parseItemRow(row);
}

async function getReviewItemsByRound(review_round_id) {
  const rows = await all(
    'SELECT * FROM review_items WHERE review_round_id = ? ORDER BY item_type',
    [review_round_id]
  );
  return rows.map(parseItemRow);
}

async function updateReviewItemConclusion(id, final_conclusion, status, reviewed_by, reason = '') {
  const now = new Date().toISOString();
  await run(
    `UPDATE review_items SET final_conclusion = ?, status = ?, reviewed_by = ?, reviewed_at = ?, reason = ?
     WHERE id = ?`,
    [final_conclusion, status, reviewed_by, now, reason, id]
  );
  return getReviewItemById(id);
}

async function createConclusionSnapshot({ review_item_id, snapshot_version, conclusion_text, status, snapshot_by }) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await run(
    `INSERT INTO conclusion_snapshots (id, review_item_id, snapshot_version, conclusion_text, status, snapshot_by, snapshot_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, review_item_id, snapshot_version, conclusion_text, status, snapshot_by, now]
  );

  return getSnapshotById(id);
}

async function getSnapshotById(id) {
  const row = await get('SELECT * FROM conclusion_snapshots WHERE id = ?', [id]);
  if (!row) return null;
  return parseSnapshotRow(row);
}

async function getSnapshotsByReviewItem(review_item_id) {
  const rows = await all(
    'SELECT * FROM conclusion_snapshots WHERE review_item_id = ? ORDER BY snapshot_version',
    [review_item_id]
  );
  return rows.map(parseSnapshotRow);
}

async function getLatestSnapshot(review_item_id) {
  const row = await get(
    'SELECT * FROM conclusion_snapshots WHERE review_item_id = ? ORDER BY snapshot_version DESC LIMIT 1',
    [review_item_id]
  );
  if (!row) return null;
  return parseSnapshotRow(row);
}

function parseRoundRow(row) {
  return {
    id: row.id,
    migration_record_id: row.migration_record_id,
    round_number: row.round_number,
    status: row.status,
    reviewer: row.reviewer,
    started_at: row.started_at,
    completed_at: row.completed_at,
    conclusion_summary: row.conclusion_summary
  };
}

function parseItemRow(row) {
  return {
    id: row.id,
    review_round_id: row.review_round_id,
    material_id: row.material_id,
    item_type: row.item_type,
    initial_conclusion: row.initial_conclusion,
    final_conclusion: row.final_conclusion,
    status: row.status,
    reason: row.reason,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at
  };
}

function parseSnapshotRow(row) {
  return {
    id: row.id,
    review_item_id: row.review_item_id,
    snapshot_version: row.snapshot_version,
    conclusion_text: row.conclusion_text,
    status: row.status,
    snapshot_by: row.snapshot_by,
    snapshot_at: row.snapshot_at
  };
}

module.exports = {
  ROUND_STATUS,
  ITEM_STATUS,
  ITEM_TYPES,
  createReviewRound,
  getReviewRoundById,
  getReviewRoundsByMigration,
  completeReviewRound,
  createReviewItem,
  getReviewItemById,
  getReviewItemsByRound,
  updateReviewItemConclusion,
  createConclusionSnapshot,
  getSnapshotById,
  getSnapshotsByReviewItem,
  getLatestSnapshot
};
