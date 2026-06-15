const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS booths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booth_number TEXT NOT NULL,
      label_name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      song_name TEXT,
      song_alias TEXT,
      rehearsal_info TEXT,
      authorization_note TEXT,
      status TEXT DEFAULT 'pending',
      final_conclusion TEXT,
      manual_annotation TEXT,
      delivery_checklist TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS booth_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booth_id INTEGER NOT NULL,
      note_type TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS booth_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booth_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      operator TEXT,
      comment TEXT,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state_key TEXT UNIQUE NOT NULL,
      state_value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initTables();

module.exports = db;
