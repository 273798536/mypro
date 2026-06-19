const { run, get, all } = require('../db');
const { v4: uuidv4 } = require('uuid');

const REPORT_TYPES = {
  ROUND_SUMMARY: 'round_summary',
  LOCK_WAIT_ANALYSIS: 'lock_wait_analysis',
  CONCLUSION_COMPARISON: 'conclusion_comparison',
  FULL_AUDIT: 'full_audit'
};

async function createReport({ migration_record_id, review_round_id = null, report_type, content, generated_by }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const content_json = JSON.stringify(content);

  await run(
    `INSERT INTO reports (id, migration_record_id, review_round_id, report_type, content_json, generated_by, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, migration_record_id, review_round_id, report_type, content_json, generated_by, now]
  );

  return getReportById(id);
}

async function getReportById(id) {
  const row = await get('SELECT * FROM reports WHERE id = ?', [id]);
  if (!row) return null;
  return parseReportRow(row);
}

async function getReportsByMigration(migration_record_id) {
  const rows = await all(
    'SELECT * FROM reports WHERE migration_record_id = ? ORDER BY generated_at DESC',
    [migration_record_id]
  );
  return rows.map(parseReportRow);
}

async function getReportsByRound(review_round_id) {
  const rows = await all(
    'SELECT * FROM reports WHERE review_round_id = ? ORDER BY generated_at DESC',
    [review_round_id]
  );
  return rows.map(parseReportRow);
}

async function listReports({ report_type, generated_by } = {}) {
  let sql = 'SELECT * FROM reports WHERE 1=1';
  const params = [];

  if (report_type) {
    sql += ' AND report_type = ?';
    params.push(report_type);
  }
  if (generated_by) {
    sql += ' AND generated_by = ?';
    params.push(generated_by);
  }

  sql += ' ORDER BY generated_at DESC';
  const rows = await all(sql, params);
  return rows.map(parseReportRow);
}

function parseReportRow(row) {
  return {
    id: row.id,
    migration_record_id: row.migration_record_id,
    review_round_id: row.review_round_id,
    report_type: row.report_type,
    content: JSON.parse(row.content_json),
    generated_by: row.generated_by,
    generated_at: row.generated_at
  };
}

module.exports = {
  REPORT_TYPES,
  createReport,
  getReportById,
  getReportsByMigration,
  getReportsByRound,
  listReports
};
