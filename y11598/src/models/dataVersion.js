const { getDb, generateId } = require('./db');

const RECORD_TYPES = {
  CHANGE_ORDER: 'change_order',
  SUPPLIER_STATEMENT: 'supplier_statement',
  AGENT_QUOTE: 'agent_quote',
};

function createDataVersion(recordType, recordId, dataSnapshot, changer = 'system', changeReason = '') {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const maxVersion = db.prepare(`
    SELECT COALESCE(MAX(version), 0) as max_version
    FROM data_versions
    WHERE record_type = ? AND record_id = ?
  `).get(recordType, recordId).max_version;

  const newVersion = maxVersion + 1;

  const stmt = db.prepare(`
    INSERT INTO data_versions (
      id, record_type, record_id, version, data_snapshot,
      changer, change_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    recordType,
    recordId,
    newVersion,
    JSON.stringify(dataSnapshot),
    changer,
    changeReason,
    now
  );

  return { id, version: newVersion };
}

function getDataVersions(recordType, recordId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM data_versions
    WHERE record_type = ? AND record_id = ?
    ORDER BY version DESC
  `).all(recordType, recordId);

  return rows.map(row => {
    row.data_snapshot = row.data_snapshot ? JSON.parse(row.data_snapshot) : null;
    return row;
  });
}

function getDataVersion(recordType, recordId, version) {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM data_versions
    WHERE record_type = ? AND record_id = ? AND version = ?
  `).get(recordType, recordId, version);

  if (row) {
    row.data_snapshot = row.data_snapshot ? JSON.parse(row.data_snapshot) : null;
  }
  return row;
}

function getLatestVersion(recordType, recordId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM data_versions
    WHERE record_type = ? AND record_id = ?
    ORDER BY version DESC
    LIMIT 1
  `).get(recordType, recordId);

  if (row) {
    row.data_snapshot = row.data_snapshot ? JSON.parse(row.data_snapshot) : null;
  }
  return row;
}

module.exports = {
  RECORD_TYPES,
  createDataVersion,
  getDataVersions,
  getDataVersion,
  getLatestVersion,
};
