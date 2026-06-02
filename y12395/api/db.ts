import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dataDir = path.join(__dirname, 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const dbPath = path.join(dataDir, 'guqin.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initializeSchema(db)

  return db
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_materials (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('score', 'annotation', 'note')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source_file TEXT NOT NULL,
      version TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fingering_aliases (
      id TEXT PRIMARY KEY,
      standard_name TEXT NOT NULL,
      alias_name TEXT NOT NULL,
      version TEXT NOT NULL,
      normalized INTEGER NOT NULL DEFAULT 0,
      normalized_at TEXT,
      group_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS change_snapshots (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      field TEXT NOT NULL,
      old_value TEXT NOT NULL,
      new_value TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS score_annotation_mapping (
      id TEXT PRIMARY KEY,
      score_id TEXT NOT NULL REFERENCES source_materials(id),
      annotation_id TEXT NOT NULL REFERENCES source_materials(id),
      report_section TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_materials_type ON source_materials(type);
    CREATE INDEX IF NOT EXISTS idx_materials_version ON source_materials(version);
    CREATE INDEX IF NOT EXISTS idx_aliases_group ON fingering_aliases(group_id);
    CREATE INDEX IF NOT EXISTS idx_aliases_standard ON fingering_aliases(standard_name);
    CREATE INDEX IF NOT EXISTS idx_snapshots_entity ON change_snapshots(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_mapping_score ON score_annotation_mapping(score_id);
    CREATE INDEX IF NOT EXISTS idx_mapping_annotation ON score_annotation_mapping(annotation_id);
  `)
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
