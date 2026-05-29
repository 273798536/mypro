const { getDb, saveDatabase } = require('../config/database');

let inTransaction = false;

function run(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  const changes = db.getRowsModified();
  const idResult = db.exec('SELECT last_insert_rowid() as id');
  const lastId = idResult && idResult[0] && idResult[0].values && idResult[0].values[0] ? idResult[0].values[0][0] : 0;
  if (!inTransaction) {
    saveDatabase();
  }
  return {
    lastInsertRowid: lastId,
    changes: changes
  };
}

function get(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const hasRow = stmt.step();
  if (!hasRow) {
    stmt.free();
    return null;
  }
  const result = stmt.getAsObject();
  stmt.free();
  return result;
}

function all(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function runTransaction(callback) {
  const db = getDb();
  inTransaction = true;
  db.exec('BEGIN TRANSACTION');
  try {
    const result = callback();
    db.exec('COMMIT');
    inTransaction = false;
    saveDatabase();
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.warn('回滚事务失败:', rollbackError.message);
    }
    inTransaction = false;
    throw error;
  }
}

function saveVersionHistory(tableName, recordId, fieldName, oldValue, newValue, changedBy, changeReason) {
  return run(
    `INSERT INTO version_history (table_name, record_id, field_name, old_value, new_value, changed_by, change_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tableName, recordId, fieldName, String(oldValue), String(newValue), changedBy, changeReason]
  );
}

module.exports = {
  run,
  get,
  all,
  runTransaction,
  saveVersionHistory
};
