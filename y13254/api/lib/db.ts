import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'night-market.db');

let dbInstance: Database.Database | null = null;

export function getDB(): Database.Database {
  if (!dbInstance) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

export const db = getDB();

export function initDB(): void {
  const ddl = [
    `CREATE TABLE IF NOT EXISTS location (
      id TEXT PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      aliases TEXT NOT NULL,
      lng REAL NOT NULL,
      lat REAL NOT NULL,
      boundary_geojson TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_location_canonical_name ON location(canonical_name)`,
    `CREATE INDEX IF NOT EXISTS idx_location_lng_lat ON location(lng, lat)`,

    `CREATE TABLE IF NOT EXISTS material (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      type TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      previous_version_id TEXT,
      payload TEXT NOT NULL,
      has_caliber_change INTEGER NOT NULL DEFAULT 0,
      change_note TEXT,
      captured_at TEXT,
      submitted_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE,
      FOREIGN KEY (previous_version_id) REFERENCES material(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_material_location_id ON material(location_id)`,
    `CREATE INDEX IF NOT EXISTS idx_material_location_type ON material(location_id, type)`,
    `CREATE INDEX IF NOT EXISTS idx_material_version ON material(location_id, type, version)`,

    `CREATE TABLE IF NOT EXISTS notice_item (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      status TEXT NOT NULL,
      current_remark TEXT,
      remark_history TEXT NOT NULL,
      auto_judgement TEXT,
      manual_judgement TEXT,
      api_response TEXT,
      material_ids TEXT NOT NULL,
      is_community_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_notice_item_location_id ON notice_item(location_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notice_item_status ON notice_item(status)`,

    `CREATE TABLE IF NOT EXISTS community_feedback (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      original_text TEXT NOT NULL,
      merged_text TEXT,
      submitted_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES notice_item(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_community_feedback_item_id ON community_feedback(item_id)`
  ];

  for (const sql of ddl) {
    db.prepare(sql).run();
  }
}

export { DB_PATH };
