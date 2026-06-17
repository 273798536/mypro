const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'vision.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dataset_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_name TEXT NOT NULL UNIQUE,
      description TEXT,
      sample_count INTEGER DEFAULT 0,
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id TEXT NOT NULL,
      version_id INTEGER NOT NULL,
      image_path TEXT,
      category_gt TEXT,
      category_pred TEXT,
      confidence REAL DEFAULT 0.0,
      is_correct INTEGER DEFAULT 0,
      anomaly_type TEXT,
      anomaly_tag TEXT,
      extra_data TEXT,
      FOREIGN KEY (version_id) REFERENCES dataset_versions(id) ON DELETE CASCADE,
      UNIQUE(sample_id, version_id)
    );

    CREATE INDEX IF NOT EXISTS idx_samples_version ON samples(version_id);
    CREATE INDEX IF NOT EXISTS idx_samples_correct ON samples(is_correct);
    CREATE INDEX IF NOT EXISTS idx_samples_anomaly ON samples(anomaly_type);

    CREATE TABLE IF NOT EXISTS manual_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id TEXT NOT NULL,
      version_id INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'unknown',
      field_mapping_version TEXT DEFAULT 'v1',
      raw_payload TEXT,
      category_before TEXT,
      category_after TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      corrected_by TEXT DEFAULT 'scheduler',
      corrected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      review_note TEXT,
      reviewed_by TEXT,
      reviewed_at DATETIME,
      FOREIGN KEY (version_id) REFERENCES dataset_versions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_corrections_status ON manual_corrections(status);
    CREATE INDEX IF NOT EXISTS idx_corrections_sample ON manual_corrections(sample_id, version_id);
    CREATE INDEX IF NOT EXISTS idx_corrections_source ON manual_corrections(source);

    CREATE TABLE IF NOT EXISTS anomaly_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id TEXT NOT NULL,
      version_id INTEGER NOT NULL,
      anomaly_type TEXT NOT NULL,
      severity TEXT DEFAULT 'normal',
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      resolved_by TEXT,
      resolution_note TEXT,
      FOREIGN KEY (version_id) REFERENCES dataset_versions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_anomaly_status ON anomaly_queue(status);
    CREATE INDEX IF NOT EXISTS idx_anomaly_type ON anomaly_queue(anomaly_type);

    CREATE TABLE IF NOT EXISTS change_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version_id INTEGER,
      change_type TEXT NOT NULL,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      operator TEXT DEFAULT 'system',
      change_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_history_entity ON change_history(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_history_version ON change_history(version_id);

    CREATE TABLE IF NOT EXISTS field_mapping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_name TEXT NOT NULL,
      standard_field TEXT NOT NULL,
      mapping_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_name, standard_field)
    );
  `);

  const stmt = db.prepare(`INSERT OR IGNORE INTO field_mapping (source_name, standard_field, mapping_note) VALUES
    ('来源', 'source', '排班同事提交-来源'),
    ('source', 'source', '标准字段-来源'),
    ('数据来源', 'source', '排班同事提交-数据来源'),
    ('处理状态', 'status', '排班同事提交-处理状态'),
    ('status', 'status', '标准字段-处理状态'),
    ('状态', 'status', '排班同事提交-状态'),
    ('修正结果', 'category_after', '排班同事提交-修正结果'),
    ('修正后类别', 'category_after', '排班同事提交-修正后类别'),
    ('原类别', 'category_before', '排班同事提交-原类别'),
    ('原始标注', 'category_before', '排班同事提交-原始标注')
  `);
  stmt.run();
}

initSchema();

module.exports = db;
