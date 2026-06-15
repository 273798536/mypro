const db = require('./db');

function getState(key) {
  const row = db.prepare('SELECT state_value FROM app_state WHERE state_key = ?').get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.state_value);
  } catch (e) {
    return row.state_value;
  }
}

function setState(key, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const existing = db.prepare('SELECT id FROM app_state WHERE state_key = ?').get(key);

  if (existing) {
    db.prepare('UPDATE app_state SET state_value = ?, updated_at = CURRENT_TIMESTAMP WHERE state_key = ?').run(serialized, key);
  } else {
    db.prepare('INSERT INTO app_state (state_key, state_value) VALUES (?, ?)').run(key, serialized);
  }
  return getState(key);
}

function getAllStates() {
  const rows = db.prepare('SELECT state_key, state_value, updated_at FROM app_state').all();
  const result = {};
  rows.forEach((row) => {
    try {
      result[row.state_key] = {
        value: JSON.parse(row.state_value),
        updated_at: row.updated_at,
      };
    } catch (e) {
      result[row.state_key] = {
        value: row.state_value,
        updated_at: row.updated_at,
      };
    }
  });
  return result;
}

function removeState(key) {
  const result = db.prepare('DELETE FROM app_state WHERE state_key = ?').run(key);
  return result.changes > 0;
}

module.exports = {
  getState,
  setState,
  getAllStates,
  removeState,
};
